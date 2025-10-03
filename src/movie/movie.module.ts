import { Module } from '@nestjs/common'
import { MovieController } from './movie.controller'
import { MovieService } from './movie.service'
import { Movie } from './entity/movie.entity'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MovieDetail } from './entity/movie-detail.entity'
import { Director } from '../director/entity/director.entity'
import { Genre } from '../genre/entities/genre.entity'
import { CommonModule } from '../common/module/common.module'
import { MulterModule } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import {join} from 'path'

@Module({
  // TypeOrmModule.forFeature 는 특정 모듈에 리포지토리(Repository)를 주입
  imports: [TypeOrmModule.forFeature([Movie, MovieDetail, Director, Genre]), CommonModule, MulterModule.register(
    { storage: diskStorage({
        // path 의 join 함수를 통해 경로를 이어 붙일수 있음, path 는 nodejs 에서 지원하는 내장 함수
        // .../netflix/public/movie
        // OS 가 달라지면 폴더 표기가 달라질 수 있으므로 사용 필요
        // cwd: current working directory
        destination: join(process.cwd(), 'public', 'movie'),
      })},
  )],
  controllers: [MovieController],
  providers: [MovieService],
})
export class MovieModule {
}
