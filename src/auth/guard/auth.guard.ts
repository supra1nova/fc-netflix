import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Public } from '../decorator/public.decorator'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 만약 public decoration 이 되어있다면 모든 로직을 bypass 처리
    // Reflector 를 이용해 데코레이터가 있는지 확인
    const isPublic = this.reflector.get(Public, context.getHandler())

    // @Public() 데코레이터가 적용된 경우 isPublic은 {} 가 존재, 아닌경우 undefined 가 존재
    if (isPublic) {
      return true
    }

    // 요청에서 user 객체가 존재하는지 확인해 boolean 을 리턴
    const request = context.switchToHttp().getRequest()

    const user = request.user
    return !(!user || !user.type || user.type !== 'access')
  }
}
