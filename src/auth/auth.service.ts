import { BadRequestException, Injectable } from '@nestjs/common'
import { DataSource, Repository } from 'typeorm'
import { User } from '../user/entities/user.entity'
import { InjectRepository } from '@nestjs/typeorm'
import * as bcrypt from 'bcrypt'
import { ConfigService } from '@nestjs/config'
import { plainToInstance } from 'class-transformer'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  parseBasicToken(rawToken: string) {
    // 1. token 을 띄워쓰기 기준으로 토큰 값 추출
    const basicSplit = rawToken.split(' ')

    if (basicSplit.length < 2) {
      new BadRequestException('토큰 포맷이 잘못되었습니다.')
    }

    const [_, token] = basicSplit

    // 2. 추출한 token 을 base64 디코딩에서 이메일과 비밀번호로 나눔 -> 'email:password'
    const decoded = Buffer.from(token, 'base64').toString('utf-8')

    // 3. 이메일과 비밀번호를 추출 -> [ email, password ]
    const tokenSplit = decoded.split(':')
    if (tokenSplit.length < 2) {
      new BadRequestException('토큰 포맷이 잘못되었습니다.')
    }

    const [email, password] = tokenSplit

    return { email, password }
  }

  // raw token -> 'Basic $token'
  async signUpUser(rawToken: string) {
    const { email, password } = this.parseBasicToken(rawToken)

    const user = await this.userRepository.findOneBy({ email })
    if (user) {
      throw new BadRequestException('이미 가입한 이메일입니다.')
    }

    // bcrypt.hash(대상비밀번호, 솔트 또는 라운드)
    // 라운드는 bcrypt가 해싱을 수행하는 횟수
    // 라운드의 경우 10이 보편적
    const hash = await bcrypt.hash(password, this.configService.get<number>('HASH_ROUNDS') as number)
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
}
