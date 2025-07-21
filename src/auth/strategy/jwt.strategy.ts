import { AuthGuard, PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ConstVariable } from '../../common/const/const-variable'

export class JwtAuthGuard extends AuthGuard('jwt') {}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Request 에서 jwt 가져오는 여부
      ignoreExpiration: false, // jwt 만료기간 무시 여부
      secretOrKey: configService.get<string>(ConstVariable.ACCESS_TOKEN_SECRET) as string, // secret 키
    })
  }

  /**
   * JwtStrategy 에서 제공하는 값으로 실제 존재하는 사용자인지 검증
   * JwtStrategy 의 경우 validate(payload) 로 받도록 되어 있음
   * validate 함수에 들어오기 전 이미 jwt 형식/만료여부/secret 키 검증은 마침
   */
  /**
   * JwtStrategy
   *
   * validate(payload)
   * return -> request
   *
   */
  validate(payload: any) {
    return payload
  }
}
