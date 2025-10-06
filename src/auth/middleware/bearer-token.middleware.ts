import { BadRequestException, Inject, Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common'
import { NextFunction, Request, Response } from 'express'
import { ConstVariable } from '../../common/const/const-variable'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager'

@Injectable()
export class BearerTokenMiddleware implements NestMiddleware {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {
  }

  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization

    if (!authHeader) {
      next()
      return
    }

    const token = this.validateBearerToken(authHeader)
    // cache 에 저장되는 키 값
    const cacheKeyToken = `TOKEN_${token}`

    // cache 내 저장된 payload 조회
    const cachePayload = await this.cacheManager.get(cacheKeyToken)

    // payload가 저장되어 있다면 바로 반환, 없다면 jwt decode/verifyAsync/cache 저장 후 payload 반환
    if (cachePayload) {
      console.log(cachePayload)
      console.log('---- Cache run for bearer token ----')

      req.user = cachePayload

      return next()
    }

    const decodedPayload = this.jwtService.decode(token)
    if (!decodedPayload) {
      throw new BadRequestException('잘못된 토큰입니다.')
    }

    const payloadTokenType = decodedPayload.type

    if (payloadTokenType !== 'refresh' && payloadTokenType !== 'access') {
      throw new BadRequestException('잘못된 토큰입니다.')
    }

    try {
      req.user = await this.parseBearerToken(payloadTokenType, token, cacheKeyToken)
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

  private async parseBearerToken(payloadTokenType: string, token: string, cacheKeyToken: string) {
    const secretType =
      payloadTokenType === 'refresh' ? ConstVariable.REFRESH_TOKEN_SECRET : ConstVariable.ACCESS_TOKEN_SECRET
    const secret = this.configService.get<string>(secretType)

    // decode 는 검증을 하지 않고 Payload 만 가져옴
    // verify 또는 verifyAsync 는 검증 후 payload를 가져옴
    // 만약 검증에 실패하면 에러를 던지는데, 위에어 이미 포멧과 관련된 에러를 다 잡았으니, 여기서 Refresh 토큰 만료 예외 처리;
    const payload = await this.jwtService.verifyAsync(token, { secret: secret })

    // payload['exp'] 내 epoch time seconds 가 있음
    const expiryDate = +new Date(payload['exp'] * 1000)
    const now = Date.now()

    const differenceInSeconds = (expiryDate - now) / 1000
    // token 만료시간보다 30초 일찍 ttl을 잡고 최소를 1로 해서 무한대로 저장되는것을 방지
    const cacheTtl = Math.max((differenceInSeconds - 30) * 1000, 1)
    // cache에 payload를 저장
    await this.cacheManager.set(cacheKeyToken, payload, cacheTtl)

    return payload
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
