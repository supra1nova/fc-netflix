import { ConsoleLogger, Injectable } from '@nestjs/common'

// NestJS 의 console logger 를 상속
@Injectable()
export class DefaultLogger extends ConsoleLogger {
  error(message: any, ...rest: unknown[]): void {
    console.log('---- ERROR LOG ----')
    super.error(message, ...rest)
  }

  warn(message: any, ...rest: unknown[]): void {
    console.log('---- WARN LOG ----')
    super.warn(message, ...rest)
  }

  log(message: any, ...rest: unknown[]): void {
    console.log('---- LOG LOG ----')
    super.log(message, ...rest)
  }
}
