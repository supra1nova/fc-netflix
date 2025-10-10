import { Controller, Post, UseGuards, Request, Get, Body } from '@nestjs/common'
import { AuthService } from './auth.service'
import { Request as ExpressRequest } from 'express' // ✅ Request가 충돌되는 관계로 충돌 방지차원의 별칭 사용
import { LocalAuthGuard } from './strategy/local.strategy'
import { Role } from '../user/entities/user.entity'
import { JwtAuthGuard } from './strategy/jwt.strategy'
import { Public } from './decorator/public.decorator'
import { ApiBasicAuth, ApiBearerAuth } from '@nestjs/swagger'
import { Authorization } from './decorator/authorization.decorator'

@Controller('auth')
/** 저장된 Bearer 토큰 이용하도록 처리 */
@ApiBearerAuth()
export class AuthController {
  constructor(private readonly authService: AuthService) {
  }

  @Public()
  @Post('sign-up')
  /** custom decorator 를 이용해 swagger 에서 Header 정보를 읽을 수 없도록 처리->swagger ui 에서 따로 헤더 값을 넣지 않아도 됨
   *    nest-cli 에 자동으로 parameters 세팅하게 되면 swagger 는 자동으로 nestjs 의 특정 데코레이터를 읽음
   *    이를 막기 위해서 custom decorator 사용
   */
  // signUpUser(@Headers('authorization') token: string) {
  signUpUser(@Authorization() token: string) {
    return this.authService.signUpUser(token)
  }

  @Public()
  /** 저장된 Basic 토큰 이용하도록 처리 */
  @ApiBasicAuth()
  @Post('sign-in')
  // signInUser(@Headers('authorization') token: string) {
  signInUser(@Authorization() token: string) {
    return this.authService.signInUser(token)
  }

  @Post('access')
  async rotateAccessToken(@Request() req: ExpressRequest) {
    const user = req.user as { sub: number; role: Role }

    return {
      accessToken: await this.authService.issueToken(user, false),
    }
  }

  @Post('token/block')
  blockToken(
    @Body('token') token: string,
  ) {
    return this.authService.blockToken(token)
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
