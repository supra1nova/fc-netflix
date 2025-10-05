import { BadRequestException, Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common'
import { NextFunction, Request, Response } from 'express'
import { ConstVariable } from '../../common/const/const-variable'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'

@Injectable()
export class BearerTokenMiddleware implements NestMiddleware {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
  }

  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization

    if (!authHeader) {
      next()
      return
    }

    try {
      req.user = await this.parseBearerToken(authHeader)
    } catch (e) {
      if (e.name === 'TokenExpiredError') {
        console.log('BearerTokenMiddleware#use : token expired')
        throw new UnauthorizedException('토큰이 만료되었습니다.')
      } else {
        console.log('BearerTokenMiddleware#use : invalid token')
        throw new UnauthorizedException('유효하지 않은 토큰입니다.')
      }
    }

    next()
  }

  private async parseBearerToken(rawToken: string) {
    const token = this.validateBearerToken(rawToken)

    const decodedPayload = this.jwtService.decode(token)
    const payloadTokenType = decodedPayload.type

    if (payloadTokenType !== 'refresh' && payloadTokenType !== 'access') {
      throw new BadRequestException('잘못된 토큰입니다.')
    }

    const secretType =
      payloadTokenType === 'refresh' ? ConstVariable.REFRESH_TOKEN_SECRET : ConstVariable.ACCESS_TOKEN_SECRET
    const secret = this.configService.get<string>(secretType)

    // decode 는 검증을 하지 않고 Payload 만 가져옴
    // verify 또는 verifyAsync 는 검증 후 payload를 가져옴
    // 만약 검증에 실패하면 에러를 던지는데, 위에어 이미 포멧과 관련된 에러를 다 잡았으니, 여기서 Refresh 토큰 만료 예외 처리;
    return await this.jwtService.verifyAsync(token, { secret: secret })
  }

  private validateBearerToken(rawToken: string) {
    const basicSplit = rawToken.split(' ')

    if (basicSplit.length < 2) {
      new BadRequestException('토큰 포맷이 잘못되었습니다.')
    }

    const [bearer, token] = basicSplit
    if (bearer.toLowerCase() !== 'bearer') {
      throw new BadRequestException('토큰 포맷이 잘못되었습니다.')
    }

    return token
  }
}
