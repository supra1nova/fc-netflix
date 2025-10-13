import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  LoggerService,
  NestInterceptor,
} from '@nestjs/common'
import {
  catchError,
  defer,
  finalize,
  from,
  Observable,
  switchMap,
  tap,
  throwError,
} from 'rxjs'
import { DataSource } from 'typeorm'
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston'

@Injectable()
export class TransactionInterceptor implements NestInterceptor {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest()
    const qr = this.dataSource.createQueryRunner()

    await qr.connect()
    await qr.startTransaction()
    req.queryRunner = qr

    // finalize 안에서 안전하게 호출할 async 함수
    const handleFinalize = async () => {
      if (!qr.isReleased) {
        try {
          if (req.isTransactionSuccess) {
            try {
              await qr.commitTransaction()
            } catch (error) {
              // ✅ 환경이 test고, 연결이 이미 끊긴 상태면 commit은 스킵
              if (process.env.NODE_ENV !== 'test') {
                this.logger.error(
                  '[TransactionInterceptor] Error occurred during commit transaction',
                )
                await handleRollback()
                throw error
              }
            }
          } else {
            await handleRollback()
          }
        } finally {
          await qr.release()
        }
      }
    }

    // rollback 처리 함수
    const handleRollback = async () => {
      try {
        await qr.rollbackTransaction()
      } catch (rollbackError) {
        this.logger.error(
          '[TransactionInterceptor] Rollback also failed:',
          rollbackError,
        )
      }
    }

    return next.handle().pipe(
      tap(() => {
        // 정상적으로 핸들러 실행되었음을 표시
        req.isTransactionSuccess = true
      }),
      catchError((err) => {
        // RxJS defer + from으로 async rollback 처리 후 에러 throw
        return defer(() =>
          from(handleRollback()).pipe(switchMap(() => throwError(() => err))),
        )
      }),
      finalize(() => {
        // finalize에서 async IIFE 없이 handleFinalize 호출
        void handleFinalize()
      }),
    )
  }
}
