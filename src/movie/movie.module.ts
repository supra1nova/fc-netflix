import { Module } from '@nestjs/common'
import { MovieController } from './movie.controller'
import { MovieService } from './movie.service'
import { Movie } from './entity/movie.entity'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MovieDetail } from './entity/movie-detail.entity'
import { Director } from '../director/entity/director.entity'

@Module({
  // TypeOrmModule.forFeature 는 특정 모듈에 리포지토리(Repository)를 주입
  imports: [TypeOrmModule.forFeature([Movie, MovieDetail, Director])],
  controllers: [MovieController],
  providers: [MovieService],
})
export class MovieModule {}
