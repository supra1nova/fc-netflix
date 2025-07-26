import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // 요청에서 user 객체가 존재하는지 확인해 boolean 을 리턴
    const request = context.switchToHttp().getRequest()

    const user = request.user
    return !(!user || !user.type || user.type !== 'access')
  }
}
