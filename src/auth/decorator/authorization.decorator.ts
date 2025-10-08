import { createParamDecorator } from '@nestjs/common'

/** nest-cli.json의 자동 swagger param 추가 인식 현상 피하기 위한 @Header('authorization) 대체용 */
export const Authorization = createParamDecorator(
  (data: any, context) => {
    const req = context.switchToHttp().getRequest()

    return req?.headers['authorization'] ?? null
  },
)
