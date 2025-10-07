import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common'
import { Role, User } from '../../user/entities/user.entity'
import { Reflector } from '@nestjs/core'
import { RBAC } from '../decorator/rbac.decorator'

@Injectable()
export class RBACGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {
  }

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

    // return 이 false 가 되면 nestjs 가 즉시 차단하고 ForbiddenException(403) 을 자동으로 던짐
    // 따라서 커스텀 메세지를 던지려면 개별 예외 발생 필요
    if (typeof user?.role !== 'number') {
      throw new UnauthorizedException('권한이 부여되지 않은 계정입니다.')
    }

    if (user.role > role) {
      throw new ForbiddenException('권한이 부족합니다.')
    }

    return true
  }
}
