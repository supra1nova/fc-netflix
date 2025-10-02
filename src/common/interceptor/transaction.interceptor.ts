import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { catchError, finalize, from, Observable, tap } from 'rxjs'
import { DataSource } from 'typeorm'

@Injectable()
export class TransactionInterceptor implements NestInterceptor {
  constructor(
    private readonly dataSource: DataSource,
  ) {
  }

  async intercept(context: ExecutionContext, next: CallHandler<any>): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest()

    const qr = this.dataSource.createQueryRunner()

    await qr.connect()
    await qr.startTransaction()

    req.queryRunner = qr

    return next.handle().pipe(
      tap(() => {
        // 정상적으로 핸들러 실행되었음을 표시
        req.isTransactionSuccess = true
      }),
      catchError((err) => {
        return from(
          (async () => {
            await qr.rollbackTransaction()
            throw err
          })(),
        )
      }),
      finalize(async () => {
        if (!qr.isReleased) {
          try {
            if (req.isTransactionSuccess) {
              await qr.commitTransaction()
            }
          } finally {
            await qr.release()
          }
        }
      }),
    )
  }
}
