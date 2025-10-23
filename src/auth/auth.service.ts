import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { Repository } from 'typeorm'
import { Role, User } from '../user/entities/user.entity'
import { InjectRepository } from '@nestjs/typeorm'
import * as bcrypt from 'bcrypt'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { ConstVariable } from '../common/const/const-variable'
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager'
import { UserService } from '../user/user.service'
import { CreateUserDto } from '../user/dto/create-user.dto'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly userService: UserService,
  ) {
  }

  // raw token -> 'Basic $token'
  async signUpUser(rawToken: string) {
    const createUserDto = this.parseBasicToken(rawToken)

    return this.userService.createUser(createUserDto)
  }

  async signInUser(rawToken: string) {
    const { email, password } = this.parseBasicToken(rawToken)

    const user = await this.authenticate(email, password)

    const REFRESH_TOKEN_SECRET = this.configService.get<string>(ConstVariable.REFRESH_TOKEN_SECRET)
    const ACCESS_TOKEN_SECRET = this.configService.get<string>(ConstVariable.ACCESS_TOKEN_SECRET)

    const REFRESH_TOKEN_EXPIRES_IN = this.configService.get<string>(ConstVariable.REFRESH_TOKEN_EXPIRES_IN)
    // const ACCESS_TOKEN_EXPIRES_IN = this.configService.get<string>(ConstVariable.ACCESS_TOKEN_EXPIRES_IN_MINUTE)
    const ACCESS_TOKEN_EXPIRES_IN =
      this.configService.get<string>(ConstVariable.ENV)
        ? this.configService.get<number>(ConstVariable.ACCESS_TOKEN_EXPIRES_IN_MINUTE) as number * 60
        : this.configService.get<string>(ConstVariable.ACCESS_TOKEN_EXPIRES_IN)

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
          expiresIn: REFRESH_TOKEN_EXPIRES_IN,
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
          // expiresIn: 60 * 5,
          // expiresIn: '24h',
          expiresIn: ACCESS_TOKEN_EXPIRES_IN,
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

  async issueToken(user: { sub: number; role: Role }, isRefreshToken: boolean = true) {
    const { sub, role, ..._ } = user
    const type = isRefreshToken ? 'refresh' : 'access'
    const secret = this.configService.get<string>(
      isRefreshToken ? ConstVariable.REFRESH_TOKEN_SECRET : ConstVariable.ACCESS_TOKEN_SECRET,
    )
    const expiresIn = isRefreshToken ? '24h' : 60 * 5

    return await this.jwtService.signAsync(
      {
        sub,
        role,
        type,
      },
      {
        secret,
        expiresIn,
      },
    )
  }

  /**
   * 특정 token block 메서드
   * @param token string
   * @return true
   */
  async blockToken(token: string) {
    const payload = this.jwtService.decode(token)
    if (!payload) {
      throw new BadRequestException('토큰이 존재하지 않습니다')
    }

    const expiryDate = +new Date(payload['exp'] * 1000)
    const now = Date.now()

    const differenceInSeconds = (expiryDate - now) / 1000
    const cacheTtl = Math.max((differenceInSeconds) * 1000, 1)
    await this.cacheManager.set(`BLOCK_TOKEN_${token}`, payload, cacheTtl)

    return true
  }

  parseBasicToken(rawToken: string) {
    // 1. token 을 띄워쓰기 기준으로 토큰 값 추출
    const basicSplit = rawToken.split(' ')

    if (basicSplit.length < 2) {
      throw new BadRequestException('토큰 포맷이 잘못되었습니다.')
    }

    const [basic, token] = basicSplit

    if (basic.toLowerCase() !== 'basic') {
      throw new BadRequestException('토큰 포맷이 잘못되었습니다.')
    }

    // 2. 추출한 token 을 base64 디코딩에서 이메일과 비밀번호로 나눔 -> 'email:password'
    const decoded = Buffer.from(token, 'base64').toString('utf-8')

    // 3. 이메일과 비밀번호를 추출 -> [ email, password ]
    const tokenSplit = decoded.split(':')
    if (tokenSplit.length < 2) {
      throw new BadRequestException('토큰 포맷이 잘못되었습니다.')
    }

    const [email, password] = tokenSplit

    return { email, password } as CreateUserDto
  }
}
