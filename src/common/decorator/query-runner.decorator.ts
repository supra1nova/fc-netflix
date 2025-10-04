import { createParamDecorator, ExecutionContext, InternalServerErrorException } from '@nestjs/common'

export const QueryRunner = createParamDecorator(
  (data: any, context: ExecutionContext) => {
    const req = context.switchToHttp().getRequest()

    if (!req || !req.queryRunner) {
      // queryRunner 가 없는 경우에는 Transaction을 설정하지 않은 경우 밖에 없음 -> 서버 실수
      throw new InternalServerErrorException('Query Runner 객체를 찾을 수 없습니다.')
    }

    return req.queryRunner
  }
)
