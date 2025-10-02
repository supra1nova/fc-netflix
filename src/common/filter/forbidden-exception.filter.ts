import { ArgumentsHost, Catch, ExceptionFilter, ForbiddenException } from '@nestjs/common'

@Catch(ForbiddenException)
export class ForbiddenExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const req = ctx.getRequest()
    const res = ctx.getResponse()

    const status = exception.getStatus()
    const message = '권한이 없습니다.'

    console.log(`[${exception.name}] ${req.method} ${req.path} ${req.ip}`)

    res.status(status)
      .json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: req.url,
        message: message,
      })
  }
}
