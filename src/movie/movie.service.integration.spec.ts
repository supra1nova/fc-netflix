import { Test } from '@nestjs/testing'
import { Cache, CACHE_MANAGER, CacheModule } from '@nestjs/cache-manager'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MovieDetail } from './entity/movie-detail.entity'
import { Director } from '../director/entity/director.entity'
import { MovieUserLike } from './entity/movie-user-like.entity'
import { Movie } from './entity/movie.entity'
import { Genre } from '../genre/entities/genre.entity'
import { MovieService } from './movie.service'
import { CommonService } from '../common/module/common.service'
import { DataSource } from 'typeorm'
import { User } from '../user/entities/user.entity'

describe('MovieService Integration Test', () => {
  let movieService: MovieService
  let cacheManager: Cache
  let dataSource: DataSource

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        CacheModule.register(),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          /** :memory: 를 이용해 메모리에서 처리 */
          database: ':memory:',
          dropSchema: true,
          entities: [
            Movie, MovieDetail, Director, Genre, User, MovieUserLike,
          ],
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([
          Movie, MovieDetail, Director, Genre, User, MovieUserLike,
        ]),
      ],
      /** 테스트 대상 서비스의 module에 import 된 module 존재 시 확인 후 관련 service 추가 필요*/
      providers: [MovieService, CommonService],
    }).compile()

    movieService = module.get<MovieService>(MovieService)
    cacheManager = module.get<Cache>(CACHE_MANAGER)
    dataSource = module.get<DataSource>(DataSource)
  })

  it('should be defined', async () => {
    await expect(movieService).toBeDefined()
  })
})
