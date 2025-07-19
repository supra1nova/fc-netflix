import { Injectable, NotFoundException } from '@nestjs/common'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { InjectRepository } from '@nestjs/typeorm'
import { User } from './entities/user.entity'
import { DataSource, Repository } from 'typeorm'
import { isNotEmpty } from 'class-validator'
import { plainToInstance } from 'class-transformer'

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly datasource: DataSource,
  ) {}

  async findAllUsers(email: string) {
    const qb = this.userRepository.createQueryBuilder('user')

    if (isNotEmpty(email)) {
      qb.andWhere('user.email LIKE :email', { email: `%${email}%` })
    }

    const [users, count] = await qb.orderBy('user.createdAt', 'DESC').getManyAndCount()

    if (count < 1) {
      return [users, count]
    }

    const usersWithoutPassword = users.map((user) => {
      const { password, ...userRestFields } = user
      return plainToInstance(User, userRestFields)
    })

    return [usersWithoutPassword, count]
  }

  async findOneUser(id: number) {
    const user = await this.userRepository.findOneBy({ id })

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`)
    }

    return user
  }

  async createUser(createUserDto: CreateUserDto) {
    const qr = this.datasource.createQueryRunner()
    await qr.connect()
    await qr.startTransaction()

    try {
      const insertResult = await qr.manager.createQueryBuilder().insert().into(User).values(createUserDto).execute()
      const userId = insertResult.identifiers[0].id

      await qr.commitTransaction()

      const user = await this.findOneUser(userId)
      const { password, ...userRestFields } = user

      return plainToInstance(User, userRestFields)
    } catch (e) {
      await qr.rollbackTransaction()

      throw e
    } finally {
      await qr.release()
    }
  }

  async updateUser(id: number, updateUserDto: UpdateUserDto) {
    const qr = this.datasource.createQueryRunner()
    await qr.connect()
    await qr.startTransaction()

    try {
      await this.findOneUser(id)

      await qr.manager.createQueryBuilder().update(User).set(updateUserDto).where({ id }).execute()

      await qr.commitTransaction()

      const resultUser = await this.findOneUser(id)
      const { password, ...userRestFields } = resultUser

      return plainToInstance(User, userRestFields)
    } catch (e) {
      await qr.rollbackTransaction()

      throw e
    } finally {
      await qr.release()
    }
  }

  async deleteUser(id: number) {
    const qr = this.datasource.createQueryRunner()
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
  }
}
