import { BadRequestException, Injectable } from '@nestjs/common'
import { DataSource, Repository } from 'typeorm'
import { User } from '../user/entities/user.entity'
import { InjectRepository } from '@nestjs/typeorm'
import * as bcrypt from 'bcrypt'
import { ConfigService } from '@nestjs/config'
import { plainToInstance } from 'class-transformer'
import { JwtService } from '@nestjs/jwt'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
  ) {}

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

  async signInUser(rawToken: string) {
    const { email, password } = this.parseBasicToken(rawToken)

    const user = await this.authenticate(email, password)

    const REFRESH_TOKEN_SECRET = this.configService.get<string>('REFRESH_TOKEN_SECRET')
    const ACCESS_TOKEN_SECRET = this.configService.get<string>('ACCESS_TOKEN_SECRET')

    return {
      // sign 의 경우 블로킹 가능 -> 이벤트 루프가 멈출수 있으므로 비동기처리
      refreshToken: await this.jwtService.signAsync(
        {
          sub: user.id,
          role: user.role,
          type: 'refresh',
        },
        {
          secret: REFRESH_TOKEN_SECRET,
          expiresIn: '24h',
        },
      ),
      accessToken: await this.jwtService.signAsync(
        {
          sub: user.id,
          role: user.role,
          type: 'access',
        },
        {
          secret: ACCESS_TOKEN_SECRET,
          // access token 의 경우 짧게 가져가서 보안적으로 안전하게 처리
          expiresIn: 60 * 5,
        },
      ),
    }
  }

  async authenticate(email: string, password: string) {
    const user = await this.userRepository.findOneBy({ email })
    if (!user) {
      throw new BadRequestException('잘못된 로그인 정보입니다.')
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password)
    if (!isPasswordMatch) {
      throw new BadRequestException('잘못된 로그인 정보입니다.')
    }

    return user
  }

  async issueToken(user: User, isRefreshToken: boolean = true) {
    const { id, role, ..._ } = user
    const type = isRefreshToken ? 'refresh' : 'access'
    const secret = this.configService.get<string>(isRefreshToken ? 'REFRESH_TOKEN_SECRET' : 'ACCESS_TOKEN_SECRET')
    const expiresIn = isRefreshToken ? '24h' : 60 * 5

    return await this.jwtService.signAsync(
      {
        sub: id,
        role,
        type,
      },
      {
        secret,
        expiresIn,
      },
    )
  }

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
}
