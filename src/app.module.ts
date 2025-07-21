import { Module } from '@nestjs/common'
import { MovieModule } from './movie/movie.module'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule, ConfigService } from '@nestjs/config'
import * as Joi from 'joi'
import { Movie } from './movie/entity/movie.entity'
import { MovieDetail } from './movie/entity/movie-detail.entity'
import { DirectorModule } from './director/director.module'
import { Director } from './director/entity/director.entity'
import { GenreModule } from './genre/genre.module'
import { Genre } from './genre/entities/genre.entity'
import { AuthModule } from './auth/auth.module'
import { UserModule } from './user/user.module'
import { User } from './user/entities/user.entity'
import { ConstVariable } from './common/const/const-variable'

@Module({
  imports: [
    // 환경변수를 로딩 후 애플케이션 전역에서 사용할 수 있도록 설정
    ConfigModule.forRoot({
      isGlobal: true, // 어떤 모듈에서든 환경 변수 사용 요부
      validationSchema: Joi.object({
        ENV: Joi.string().required(),
        DB_TYPE: Joi.string()
          .valid(ConstVariable.POSTGRES, ConstVariable.MARIADB, ConstVariable.MYSQL, ConstVariable.ORACLE)
          .required(),
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().required(),
        DB_USERNAME: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        DB_DATABASE: Joi.string().required(),
        HASH_ROUNDS: Joi.number().required(),
        ACCESS_TOKEN_SECRET: Joi.string().required(),
        REFRESH_TOKEN_SECRET: Joi.string().required(),
      }),
    }),
    // config 모듈이 모두 인스턴스화 한 뒤 TypeOrmModule 내용을 인젝트 받아야 하기 때문에 async 로 처리
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: configService.get<string>(ConstVariable.DB_TYPE) as ConstVariable.POSTGRES,
        host: configService.get<string>(ConstVariable.DB_HOST),
        port: configService.get<number>(ConstVariable.DB_PORT),
        username: configService.get<string>(ConstVariable.DB_USERNAME),
        password: configService.get<string>(ConstVariable.DB_PASSWORD),
        database: configService.get<string>(ConstVariable.DB_DATABASE),
        // entity: [/*'src/!**!/!*.entity{.ts,.js}'*/],
        entities: [Movie, MovieDetail, Director, Genre, User],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    MovieModule,
    DirectorModule,
    GenreModule,
    AuthModule,
    UserModule,
  ],
})
export class AppModule {}
