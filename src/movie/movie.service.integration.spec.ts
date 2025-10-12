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
import { DataSource, QueryRunner } from 'typeorm'
import { User } from '../user/entities/user.entity'
import { GetMoviesDto } from './dto/get-movies.dto'
import { CreateMovieDto } from './dto/create-movie.dto'
import { UpdateMovieDto } from './dto/update-movie.dto'
import { NotFoundException } from '@nestjs/common'

describe('MovieService Integration Test', () => {
  let movieService: MovieService
  let cacheManager: Cache
  let dataSource: DataSource
  let qr: QueryRunner

  let users: User[]
  let movies: Movie[]
  let directors: Director[]
  let genres: Genre[]

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

  // 매번 테스트 직전에 테스트용 데이터 시딩 진행 필요
  beforeEach(async () => {
    /** 테스트 시작 전 캐시 초기화 */
    await cacheManager.clear()

    /** 테스트용 엔티티 Repository 가져오기 */
    const userRepository = dataSource.getRepository(User)
    const movieRepository = dataSource.getRepository(Movie)
    const movieDetailRepository = dataSource.getRepository(MovieDetail)
    const directorRepository = dataSource.getRepository(Director)
    const genreRepository = dataSource.getRepository(Genre)

    /** 테스트용 엔티티 생성 및 저장 */
    users = [1, 2].map(
      (number) => userRepository.create({
        id: number, email: `user${number}@test.com`, password: `password${number}`,
      }))
    await userRepository.save(users)

    directors = [1, 2].map(
      (number) => directorRepository.create({
        id: number, dob: new Date(1990, 1, number), nationality: `country${number}`, name: `director${number}`,
      }))
    await directorRepository.save(directors)

    genres = [1, 2].map(
      (number) => genreRepository.create({
        id: number, name: `genre${number}`, description: `description ${number}`,
      }))
    await genreRepository.save(genres)

    movies = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(
      (number) => movieRepository.create({
        id: number,
        title: `title${number}`,
        creator: users[0],
        genres: genres,
        likeCount: 0,
        dislikeCount: 0,
        detail: movieDetailRepository.create({
          detail: `movie detail${number}`,
        }),
        movieFilePath: `movieFilePath${number}`,
        director: directors[0],
        createdAt: new Date(`2021-9-${number}`),
      }))
    await movieRepository.save(movies)

    qr = dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
  })

  afterEach(async () => {
    await qr.rollbackTransaction();
    await qr.release();
  })

  afterAll(async () => {
    /** 모든 테스트 종료 후 데이터베이스 연결 종료 */
    await dataSource.destroy()
  })

  it('should be defined', async () => {
    await expect(movieService).toBeDefined()
  })

  describe('findRecentMovieList', () => {
    it('should return an array of recent movies', async () => {
      // given
      const length = 10
      const sortedResult = [...movies].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      )
      const sortedResultIds = sortedResult.slice(0, length).map(x => x.id)

      // when
      const result = await movieService.findRecentMovieList() as Movie[]

      // then
      expect(result).toHaveLength(length)
      expect(result.map(movie => movie.id)).toEqual(sortedResultIds)
    })

    it('should return an array of recent movies from cache', async () => {
      //given
      // when
      const result = await movieService.findRecentMovieList() as Movie[]
      const cachedMovies = await cacheManager.get('RECENT_MOVIE') as Movie[]

      // then
      expect(cachedMovies).toEqual(result)
    })
  })

  describe('findMovieList', () => {
    it('should return an array of movies containing nextCursor', async () => {
      // given
      const dto = {
        title: '15',
        order: ['createdAt_DESC'],
        take: 10,
      } as GetMoviesDto

      // when
      const result = await movieService.findMovieList(dto)

      // then
      expect(result.data).toHaveLength(1)
      expect(result.data[0].title).toContain(dto.title)
      expect(result.nextCursor).toBeDefined()
      expect(result.data[0]).not.toHaveProperty('likeStatus')
    })

    it('should return likeStatus if userId is provided', async () => {
      // given
      const dto = {
        order: ['createdAt_DESC'],
        take: 10,
      } as GetMoviesDto
      const userId = 1

      // when
      const result = await movieService.findMovieList(dto, userId)

      // then
      expect(result.data).toHaveLength(10)
      expect(result.data[0]).toHaveProperty('likeStatus')
    })
  })

  describe('processCreateMovie', () => {
    beforeEach(async () => {
      jest.spyOn(movieService, 'renameMovieFile').mockResolvedValue()
    })

    it('should create movie correctly', async () => {
      // given
      const createMovieDto = {
        title: 'test title1',
        detail: 'test detail1',
        directorId: directors[0].id,
        genreIds: genres.map(x => x.id),
        movieFileName: 'fileName1',
      } as CreateMovieDto
      const userId = 1
      /** 실제 createQueryRunner 를 생성 */
      const qr = dataSource.createQueryRunner()

      // when
      const result = await movieService.processCreateMovie(createMovieDto, userId, qr) as Movie

      // then
      expect(result.title).toBe(createMovieDto.title)
      expect(result.director.id).toBe(createMovieDto.directorId)
      expect(result.genres.map((genre) => genre.id)).toEqual(createMovieDto.genreIds)
      expect(result.movieFilePath).toEqual(createMovieDto.movieFileName)
    })
  })

  describe('processUpdateMovie', () => {
    it('should update movie correctly', async () => {
      // given
      const id = movies[0].id
      const updateMovieDto = {
        title: 'updated title1',
        detail: 'updated detail1',
        directorId: directors[0].id,
        genreIds: genres.map(x => x.id),
        movieFileName: 'fileName1',
      } as UpdateMovieDto

      // when
      const result = await movieService.processUpdateMovie(id, updateMovieDto)

      // then
      expect(result.title).toBe(updateMovieDto.title)
      expect(result.detail.detail).toBe(updateMovieDto.detail)
      expect(result.director.id).toBe(updateMovieDto.directorId)
      expect(result.genres.map((genre) => genre.id)).toEqual(updateMovieDto.genreIds)
      expect(result.movieFilePath).toEqual(updateMovieDto.movieFileName)
    })
  })

  describe('processDeleteMovie', () => {
    it('should delete movie correctly ', async () => {
      // given
      const id = movies[0].id

      // when
      await movieService.processDeleteMovie(id)

      // then
      await expect(movieService.findMovie(id)).rejects.toThrow(NotFoundException)
    })

    it('should throw error if movie does not exist ', async () => {
      // given
      const id = 9999

      // when & then
      await expect(movieService.processDeleteMovie(id)).rejects.toThrow(NotFoundException)
    })
  })

  describe('toggleMovieLike', () => {
    it('should increase like count', async () => {
      // given
      const movieId = movies[0].id
      const userId = users[0].id
      const isLike = true
      const qr = dataSource.createQueryRunner()

      // when & then
      await expect(movieService.toggleMovieLike(movieId, userId, isLike, qr)).resolves.toEqual({ isLike })
    })

    it('should decrease like count', async () => {
      // given
      const movieId = movies[0].id
      const userId = users[0].id
      const isLike = true
      const qr = dataSource.createQueryRunner()

      await movieService.toggleMovieLike(movieId, userId, isLike, qr)

      // when & then
      await expect(movieService.toggleMovieLike(movieId, userId, isLike, qr)).resolves.toEqual({ isLike: null })

      expect((await movieService.findMovie(movieId)).likeCount).toBe(0)
    })

    it('should increase dislike count and decrease like count', async () => {
      // given
      const movieId = movies[0].id
      const userId = users[0].id
      const isLike = true
      const qr = dataSource.createQueryRunner()

      // when & then
      await movieService.toggleMovieLike(movieId, userId, isLike, qr)

      await expect(movieService.toggleMovieLike(movieId, userId, !isLike, qr)).resolves.toEqual({ isLike: !isLike })

      const movie = await movieService.findMovie(movieId)
      expect(movie.likeCount).toBe(0)
      expect(movie.dislikeCount).toBe(1)
    })
  })
})
