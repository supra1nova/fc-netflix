import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common'
import { QueryFailedError } from 'typeorm'

// QueryFailedError 는 TypeOrm 에서 지원하는 에러
@Catch(QueryFailedError)
export class QueryFailedExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost): any {
    const ctx = host.switchToHttp()
    const req = ctx.getRequest()
    const res = ctx.getResponse()

    const status = 400
    let message = 'DB 에러 발생'

    if (exception.message.includes('duplicate key')) {
      message = '중복 키 에러 발생'
    }

    console.log(`[${exception.name}] ${req.method} ${req.path} ${req.ip}`)

    res.status(status)
      .json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: req.path,
        message: message,
      })
  }
}
