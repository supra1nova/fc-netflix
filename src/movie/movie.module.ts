import { Module } from '@nestjs/common'
import { MovieController } from './movie.controller'
import { MovieService } from './movie.service'
import { Movie } from './entity/movie.entity'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MovieDetail } from './entity/movie-detail.entity'
import { Director } from '../director/entity/director.entity'
import { Genre } from '../genre/entities/genre.entity'
import { CommonModule } from '../common/module/common.module'
import { User } from '../user/entities/user.entity'
import { MovieUserLike } from './entity/movie-user-like.entity'

@Module({
  // TypeOrmModule.forFeature 는 특정 모듈에 리포지토리(Repository)를 주입
  imports: [
    TypeOrmModule.forFeature([Movie, MovieDetail, Director, Genre, User, MovieUserLike]),
    CommonModule,
    /*// cache 모듈 적용
    CacheModule.register({
      // 캐쉬 만료 시간 적용
      ttl: 5000,
    }),*/
    /*
    MulterModule.register({
      storage: diskStorage(
        {
          // path 의 join 함수를 통해 경로를 이어 붙일수 있음, path 는 nodejs 에서 지원하는 내장 함수
          // .../netflix/public/movie
          // OS 가 달라지면 폴더 표기가 달라질 수 있으므로 사용 필요
          // cwd: current working directory
          destination: join(process.cwd(), 'public', 'movie'),
          // filename 지정
          // cb(발생되는error유형, 파일명) 형태로 제공되며, 에러가 없을 경우 null 을 입력
          // filename 을 설정하지 않으면 Multer가 스스로 랜덤하게 파일 이름을 지정 및 저장
          filename: (req, file, cb) => {
            const split = file.originalname.split('.')

            let extension = 'txt'

            if (split.length > 1) {
              extension = split[split.length - 1]
            }

            cb(null, `${v4()}_${Date.now()}.${extension}`)
          },
        },
      ),
    }),
    */
  ],
  controllers: [MovieController],
  providers: [MovieService],
})
export class MovieModule {
}
