import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { InjectRepository } from '@nestjs/typeorm'
import { User } from './entities/user.entity'
import { DataSource, Repository } from 'typeorm'
import { isNotEmpty } from 'class-validator'
import { instanceToPlain, plainToInstance } from 'class-transformer'
import * as bcrypt from 'bcrypt'
import { ConstVariable } from '../common/const/const-variable'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
  }

  async findAllUsers(email?: string | null) {
    const qb = this.userRepository.createQueryBuilder('user')

    if (isNotEmpty(email)) {
      qb.where('user.email LIKE :email', { email: `%${email}%` })
    }

    const [users, count] = await qb.orderBy('user.createdAt', 'DESC').getManyAndCount()

    return [instanceToPlain(users), count]
  }

  async findOneUser(id: number) {
    const user = await this.userRepository.findOneBy({ id })

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`)
    }

    return user
  }

  async createUser(createUserDto: CreateUserDto) {
    const { email, password } = createUserDto

    const user = await this.userRepository.findOneBy({ email })

    if (user) {
      throw new BadRequestException('이미 가입한 이메일입니다.')
    }

    // bcrypt.hash(대상비밀번호, 솔트 또는 라운드)
    // 라운드는 bcrypt가 해싱을 수행하는 횟수
    // 라운드의 경우 10이 보편적
    const hash = await bcrypt.hash(password, this.configService.get<number>(ConstVariable.HASH_ROUNDS) as number)
    const userInstance = plainToInstance(User, { email, password: hash })

    const qr = this.dataSource.createQueryRunner()
    await qr.connect()
    await qr.startTransaction()

    try {
      await qr.manager.createQueryBuilder().insert().into(User).values(userInstance).execute()

      await qr.commitTransaction()
    } catch (e) {
      await qr.rollbackTransaction()

      throw e
    } finally {
      await qr.release()
    }

    return this.userRepository.findOneBy({ email })
  }

  async updateUser(id: number, updateUserDto: UpdateUserDto) {
    const qr = this.dataSource.createQueryRunner()
    await qr.connect()
    await qr.startTransaction()

    try {
      await this.findOneUser(id)

      await qr.manager.createQueryBuilder().update(User).set(updateUserDto).where({ id }).execute()

      await qr.commitTransaction()

      return await this.findOneUser(id)
    } catch (e) {
      await qr.rollbackTransaction()

      throw e
    } finally {
      await qr.release()
    }
  }

  async deleteUser(id: number) {
    await this.findOneUser(id)

    await this.userRepository.delete(id)

    return id
  }

  async deleteUserWithTransaction(id: number) {
    const qr = this.dataSource.createQueryRunner()
    await qr.connect()
    await qr.startTransaction()

    try {
      await this.findOneUser(id)

      await qr.manager.createQueryBuilder().delete().from(User).where({ id }).execute()

      await qr.commitTransaction()
    } catch (e) {
      await qr.rollbackTransaction()

      throw e
    } finally {
      await qr.release()
    }

    return id
  }
}
