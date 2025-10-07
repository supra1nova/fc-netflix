import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // logger 를 false 로 주면 로그 기능이 작동하지 않음
    // logger: false
    // logger 배열 안에 낮을 레벨의 로그로 설정하면 그보다 무조건 상위 레벨의 로그까지 포함해서 로그가 찍힘
    logger: ['debug']
  })
  // Validation 을 위한 설정
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // Transform 동작 위한 설정 - 요청으로 들어온 Plain Object(JSON, query string 등) 를 DTO 클래스의 인스턴스로 변환
      transformOptions: {
        enableImplicitConversion: true, // DTO 안의 속성들을 타입에 맞게 자동 변환
      },
      whitelist: true, // Dto 내 정의하지 않은 필드의 값이 들어와도 request에 담지 않음 , 기본은 false
      forbidNonWhitelisted: true, // Dto 내 정의하지 않은 필드의 값이 들어오게되면 error 발생, 기본은 false
    }),
  )
  await app.listen(process.env.PORT ?? 3000)
}

bootstrap()
