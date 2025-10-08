import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    /** logger 를 false 로 주면 시스템 로그가 작동하지 않음 */
    // logger: false
    /** logger 배열 안에 낮을 레벨의 로그로 설정하면 그보다 무조건 상위 레벨의 로그까지 포함해서 로그가 찍힘 */
    logger: ['verbose'],
  })

  /** app.setGlobalPrefix 를 사용하게되면 전역적으로 특정 uri 를 앞에 붙여야 함 -> versioning 불가능 */
  // app.setGlobalPrefix('v1')

  /** 따라서 setGlobalPrefix를 사용하지 말고 enableVersioning 를 통해 처리 */
  /*
  app.enableVersioning({
    /!** URI 버저닝 방식 (URI = 0, HEADER = 1, MEDIA_TYPE = 2, CUSTOM = 3)*!/
    // type: VersioningType.URI,
    /!** type을 VersioningType.HEADER 지정시 header 키 값 지정 필수 *!/
    // type: VersioningType.HEADER,
    // header: 'version',
    /!** type을 VersioningType.MEDIA_TYPE 지정시 header 키 값 지정 및 '=' 붙이는 것 필수, *!/
    type: VersioningType.MEDIA_TYPE,
    key: 'v=',
    /!**
     * 기본 version이 필요하다면 기본 version 설정 후,
     * app.module의 middleware 에 exception 처리시 version 명시 필요
     * 자동으로 v 를 붙여주므로 1을 주면 url 은 /v1/... 로 설정됨
     * array 도 명시 가능
     *!/
    // defaultVersion: '1',
    // defaultVersion: ['1', '2', '3'],
  })
  */

  /**
   * document 관련 설정 (title, description, version 등)
   * - versioning이 된 경우 config 도 그에 따라 추가 생성 필요함
   */
  const config = new DocumentBuilder()
    .setTitle('NestJS study Netflix')
    .setDescription('- Netflix 클론 코딩 통한 NestJS 기능 숙달 프로젝트')
    .setVersion('0.0.1')
    .build()

  /** 현재 app을 document config 에 기반해서 document를 생성 */
  const document = SwaggerModule.createDocument(app, config)

  /** 브라우저에서 swagger ui 접근 경로 설정 */
  SwaggerModule.setup('doc', app, document)

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER))

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
