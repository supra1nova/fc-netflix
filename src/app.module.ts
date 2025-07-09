import { Module } from '@nestjs/common'
import { MovieModule } from './movie/movie.module'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule } from '@nestjs/config'

@Module({
  imports: [MovieModule],
  imports: [
    // 환경변수를 로딩 후 애플케이션 전역에서 사용할 수 있도록 설정
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: process.env.DB_TYPE as 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      entities: [],
      synchronize: true,
    }),
    MovieModule,
  ],
})
export class AppModule {}
