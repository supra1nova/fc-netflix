import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Observable, tap } from 'rxjs'

@Injectable()
export class ResponseTimeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> | Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest()

    const reqTime = Date.now()

    return next.handle()
      .pipe(
        // 지연 처리
        // 라우터 함수 실행 이후 실행
        tap(() => {
          const respTime = Date.now()
          const diff = respTime - reqTime

          console.log(`[${req.method} ${req.path}] ${diff}ms`)
        }),
      )
  }
}
