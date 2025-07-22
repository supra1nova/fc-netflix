import { Controller, Post, Headers, UseGuards, Request, Get } from '@nestjs/common'
import { AuthService } from './auth.service'
import { Request as ExpressRequest } from 'express' // ✅ Request가 충돌되는 관계로 충돌 방지차원의 별칭 사용
import { LocalAuthGuard } from './strategy/local.strategy'
import { Role } from '../user/entities/user.entity'
import { JwtAuthGuard } from './strategy/jwt.strategy'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  signUpUser(@Headers('authorization') token: string) {
    return this.authService.signUpUser(token)
  }

  @Post('login')
  signInUser(@Headers('authorization') token: string) {
    return this.authService.signInUser(token)
  }

  @Post('access')
  async rotateAccessToken(@Request() req: ExpressRequest) {
    const user = req.user as { sub: number; role: Role }

    return {
      accessToken: await this.authService.issueToken(user, false),
    }
  }

  // @UseGuards(AuthGuard('local'))
  @UseGuards(LocalAuthGuard)
  @Post('login/passport')
  async signInUserPassport(@Request() req: ExpressRequest) {
    const user = req.user as { sub: number; role: Role }

    return {
      refreshToken: await this.authService.issueToken(user),
      accessToken: await this.authService.issueToken(user, false),
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('private')
  private(@Request() req: ExpressRequest) {
    return req.user
  }
}
