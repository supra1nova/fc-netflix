import { AuthGuard, PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-local'
import { BadRequestException, Injectable } from '@nestjs/common'
import { AuthService } from '../auth.service'

/**
 * 기본적으로 Passport-local 이름을 커스터마이징 하지 않는다면 'local'이 기본값
 * 하지만, Strategy의 이름이 새로 주어졌다면 커스텀된 명칭으로 사용 필요
 * 컨트롤러의 라우터에 붙일 @UseGuards(AuthGuard('custom-local-strategy')) 에서 AuthGuard('custom-local-strategy') 부분을 추출
 */
// export class LocalAuthGuard extends AuthGuard('local') {}
export class LocalAuthGuard extends AuthGuard('custom-local-strategy') {}

/**
 * 모든 strategy 는 @injectable 을 붙여줘야함 -> Provider 로 사용할 예정이므로
 * PassportStrategy(타겟 Strategy 에서Import된 Strategy, 사용자가 사용할 새로운 Strategy 이름 ) 을 extends 하며,
 * 두번째 파라미터는 선택적이고, Controller 에서 AuthGuard() 내부 파라미터로 넣어서 사용
 */
@Injectable()
// export class LocalStrategy extends PassportStrategy(Strategy) {
export class LocalStrategy extends PassportStrategy(Strategy, 'custom-local-strategy') {
  constructor(private readonly authService: AuthService) {
    // 기본적으로 super() 가 기본값임 -> usernameField 또는 passwordField 등 커스터마이징 할때 옵션을 추가
    // super()
    super({
      // request 에 username 필드 커스터마이징
      usernameField: 'email',
    })
  }

  /**
   * LocalStrategy 에서 제공하는 값으로 실제 존재하는 사용자인지 검증
   * LocalStrategy 의 경우 validate(username, password) 로 받도록 되어 있음
   */
  /**
   * LocalStrategy
   *
   * validate(username, password)
   * return -> request
   *
   */
  async validate(email: string, password: string) {
    console.log(email)
    console.log(password)
    const user = await this.authService.authenticate(email, password)
    if (!user) {
      new BadRequestException('Authentication failed')
    }

    return user
  }
}
