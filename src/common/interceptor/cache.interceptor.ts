import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Observable, of, tap } from 'rxjs'

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  // todo: 향후 redis로 대체 필요
  private cache = new Map<string, any>

  intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> | Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest()

    const key = `${req.method}-${req.path}`
    if (this.cache.has(key)) {
      console.log('return data from cache')

      // Rxjs 의 of 를 사용하면 일반 값도 Observable 로 반환함
      // todo: 저장된 값만 나오므로 기타 로직 수행 불가능 -> 개선 필요
      return of(this.cache.get(key))
    }

    return next.handle().pipe(
      tap((response) => {
        this.cache.set(key, response)
        console.log('save data to cache')
      }),
    )
  }
}
