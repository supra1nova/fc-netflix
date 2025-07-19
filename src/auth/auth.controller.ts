import { Controller, Post, Headers, UseGuards, Request } from '@nestjs/common'
import { AuthService } from './auth.service'
import { Request as ExpressRequest } from 'express' // ✅ Request가 충돌되는 관계로 충돌 방지차원의 별칭 사용
import { LocalAuthGuard } from './strategy/local.strategy'

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

  // @UseGuards(AuthGuard('local'))
  @UseGuards(LocalAuthGuard)
  @Post('login/passport')
  signInUserPassport(@Request() req: ExpressRequest) {
    return req.user
  }
}
