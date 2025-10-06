import { CallHandler, ExecutionContext, ForbiddenException, Inject, Injectable, NestInterceptor } from '@nestjs/common'
import { Observable, tap } from 'rxjs'
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager'
import { Reflector } from '@nestjs/core'
import { Throttle } from '../decorator/throttle.decorator'

@Injectable()
export class ThrottleInterceptor implements NestInterceptor {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly reflector: Reflector,
  ) {
  }

  async intercept(context: ExecutionContext, next: CallHandler<any>): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest()

    // cache 에 key 값으로 METHOD_URL_USERID_MINUTE 로 넣을 예정
    // value -> count
    const userId = req?.user?.sub

    if (!userId) {
      return next.handle()
    }

    const throttleOptions = this.reflector.get<{ count: number, unit: 'minutes' | 'hours' }>(Throttle, context.getHandler())

    // decorator 를 붙이지 않은 경우에는 throttle 없이 그냥 실행 예정
    if (!throttleOptions) {
      return next.handle()
    }

    const date = new Date()
    const minute = date.getMinutes()

    const key = `${req.method}_${req.path}_${userId}_${minute}`

    const count = await this.cacheManager.get<number>(key)
    console.log(key)
    console.log(count)

    // count가 존재하고 option 내 count 보다 많이 요청됬을 경우 에러 발생
    if (count && count >= throttleOptions.count) {
      throw new ForbiddenException('요청 가능 횟수를 넘어섰습니다.')
    }

    // unit 유형별 milli seconds 변환
    const milliSecondsFromUnit = throttleOptions.unit === 'minutes' ? 60 * 1000 : 60 * 60 * 1000

    return next.handle()
      .pipe(
        tap(
          async () => {
            // 키값에 해당하는 cache가 없는 경우 count는 0임(최초 요청시 cache에는 없으므로)
            const count = await this.cacheManager.get<number>(key) ?? 0

            await this.cacheManager.set<number>(key, count + 1, milliSecondsFromUnit)
          },
        ),
      )
  }
}
