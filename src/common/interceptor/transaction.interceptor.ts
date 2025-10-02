import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { catchError, finalize, from, Observable } from 'rxjs'
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
            await qr.commitTransaction()
          } finally {
            await qr.release()
          }
        }
      }),
    )

  }
}
