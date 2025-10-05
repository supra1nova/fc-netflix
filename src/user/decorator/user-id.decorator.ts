import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common'

export const UserId = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const req = context.switchToHttp().getRequest()

    /*
    if (!req || !req.user || !req.user.sub) {
      console.log('why')
      return null
      /!*throw new UnauthorizedException('사용자 정보를 찾을 수 없습니다.')*!/
    }
    */

    return req?.user?.sub ?? null
  },
)
