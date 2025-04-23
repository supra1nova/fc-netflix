import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Validation 을 위한 설정
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // Transform 동작 위한 설정
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
