import { CallHandler, ExecutionContext, HttpException, Injectable, InternalServerErrorException, NestInterceptor } from '@nestjs/common'
import { delay, Observable, tap } from 'rxjs'

@Injectable()
export class ResponseTimeInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> | Promise<Observable<any>> {
      const req = context.switchToHttp().getRequest()

      const reqTime = Date.now()

      return next.handle()
        .pipe(
          // 지연 처리
          // delay(1000),
          // 라우터 함수 실행 이후 실행
          tap(() => {
            const respTime = Date.now()
            const diff = respTime - reqTime

            if (diff > 1000) {
              console.log(`!!!TIMEOUT!!! [${req.method} ${req.path}] ${diff}ms`)

              throw new InternalServerErrorException('시간이 1초 이상 걸렸습니다')
            } else {
              console.log(`[${req.method} ${req.path}] ${diff}ms`)
            }
          })
        )
    }
}
