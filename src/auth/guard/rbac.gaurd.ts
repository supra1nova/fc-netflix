import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Role, User } from '../../user/entities/user.entity'
import { Reflector } from '@nestjs/core'
import { RBAC } from '../decorator/rbac.decorator'

@Injectable()
export class RBACGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const role = this.reflector.get<Role>(RBAC, context.getHandler())

    // RoleEnum 에 해당하는 값이 데코레이터의 메타데이터에 존재하는지 확인
    // role 에 해당하는 값이 없을 경우 적용을 하지 않음
    if (!Object.values(Role).includes(role)) {
      return true
    }

    const request = context.switchToHttp().getRequest()

    const user = request.user as User
    /*
    if (!user) {
      return false
    }

    return user.role <= role
    */
    return typeof user?.role === 'number' && user.role <= role
  }
}
