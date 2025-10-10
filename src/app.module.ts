import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common'
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
import { BearerTokenMiddleware } from './auth/middleware/bearer-token.middleware'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { AuthGuard } from './auth/guard/auth.guard'
import { RBACGuard } from './auth/guard/rbac.guard'
import { ResponseTimeInterceptor } from './common/interceptor/response-time.interceptor'
import { QueryFailedExceptionFilter } from './common/filter/query-failed-exception.filter'
import { ServeStaticModule } from '@nestjs/serve-static'
import { join } from 'path'
import { CommonModule } from './common/module/common.module'
import { MovieUserLike } from './movie/entity/movie-user-like.entity'
import { CacheModule } from '@nestjs/cache-manager'
import { ThrottleInterceptor } from './common/interceptor/throttle.interceptor'
import { ScheduleModule } from '@nestjs/schedule'
import { WinstonModule } from 'nest-winston'
import * as winston from 'winston'

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
        entities: [
          Movie,
          MovieDetail,
          MovieUserLike,
          Director,
          Genre,
          User,
        ],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    ServeStaticModule.forRoot({
      // 정적파일 서빙할 실제 폴더
      rootPath: join(process.cwd(), 'public'),
      // 정적파일 서빙시 라우팅 prefix가 될 이름
      serveRoot: '/public/',
    }),
    // cache 모듈 전역 적용
    CacheModule.register({
      // 캐쉬 만료 시간 적용
      ttl: 5000,
      isGlobal: true,
    }),
    WinstonModule.forRoot({
      level: 'debug',
      transports: [
        // console 설정
        new winston.transports.Console({
          // 파일 내 로그 저장시 포메팅 설정
          format: winston.format.combine(
            // 색상 옵션
            winston.format.colorize({
              all: true,
            }),
            // timestamp 옵션
            winston.format.timestamp({
              format: 'YYYY-MM-DD HH:mm:ss',
            }),
            // printf 옵션
            // winston.format.timestamp 설정을하지 않으면 timestamp가 unknown으로 찍힘
            // info 는 객체 (context, message, level)
            winston.format.printf((info) => `${info.timestamp} [${info.context}] ${info.level}, ${info.message}`),
          ),
        }),

        // file 설정
        /*
        new winston.transports.File({
          // 폴더 설정
          dirname: join(process.cwd(), 'logs'),
          // 파일 이름 설정 - 미설정시 winston.log 라는 이름의 파일을 생성후 저장
          filename: 'logs.log',
          format: winston.format.combine(
            winston.format.timestamp({
              format: 'YYYY-MM-DD HH:mm:ss',
            }),
            winston.format.printf((info) => `${info.timestamp} [${info.context}] ${info.level}, ${info.message}`)
          )
        })
        */
      ],
    }),
    CommonModule,
    ScheduleModule.forRoot(),
    MovieModule,
    DirectorModule,
    GenreModule,
    AuthModule,
    UserModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    // RBACGuard는 AuthGuard 다음 작동해야하므로 바로 밑에 배치, 순서 중요!!
    {
      provide: APP_GUARD,
      useClass: RBACGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTimeInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ThrottleInterceptor,
    },
    /*
    {
      provide: APP_FILTER,
      useClass: ForbiddenExceptionFilter,
    },
    */
    {
      provide: APP_FILTER,
      useClass: QueryFailedExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(BearerTokenMiddleware)
      .exclude(
        {
          // path: 'auth/sign-up',
          path: 'auth/sign-up',
          method: RequestMethod.POST,
          /**
           * versioning 에 따른 추가
           * 자동으로 v 를 붙여주므로 1을 주면 url 은 /v1/... 로 설정됨
           * 버전이 지속적으로 추가되면 일일히 exclude에 추가해주거나,
           * middleware 의 use 에서 req.originalUrl에 버저닝이 포함되있다면 바로 return next() 필요
           * array 도 명시 가능
          */
          // version: '1'
          // version: ['1', '2', '3'],
        },
        {
          path: 'auth/sign-in',
          method: RequestMethod.POST,
          // version: '1',
          // version: ['1', '2', '3'],
        },
        /*{
          path: 'movie',
          method: RequestMethod.GET,
        },*/
      )
      .forRoutes('*')
  }
}
