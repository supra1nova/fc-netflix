import { TestBed, Mocked } from '@suites/unit'
import { MovieService } from './movie.service'
import { DataSource, Repository } from 'typeorm'
import { Movie } from './entity/movie.entity'
import { Genre } from '../genre/entities/genre.entity'
import { Director } from '../director/entity/director.entity'
import { MovieUserLike } from './entity/movie-user-like.entity'
import { Cache } from 'cache-manager'
import { CommonService } from '../common/module/common.service'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { getRepositoryToken } from '@nestjs/typeorm'
import { GetMoviesDto } from './dto/get-movies.dto'
import { NotFoundException } from '@nestjs/common'

describe('MovieService', () => {
  let movieService: MovieService
  let movieRepository: Mocked<Repository<Movie>>
  let genreRepository: Mocked<Repository<Genre>>
  let directorRepository: Mocked<Repository<Director>>
  let movieUserLikeRepository: Mocked<Repository<MovieUserLike>>
  let cacheManager: Mocked<Cache>
  let dataSource: Mocked<DataSource>
  let commonService: Mocked<CommonService>

  beforeEach(async () => {
    /** 테스트 대상은 unit, 나머지는 uniRef으로 TestBed.solitary(대상).compile 을 통해 가져올 수 있음 */
    const { unit, unitRef } = await TestBed.solitary(MovieService).compile()

    /** 테스트 대상은 unit, 나머지는 uniRef.get로()으로 가져올 수 있음 */
    movieService = unit
    cacheManager = unitRef.get(CACHE_MANAGER)
    dataSource = unitRef.get(DataSource)
    commonService = unitRef.get(CommonService)
    /** repository 를 가져오는것은 unitRef.get(getRepositoryToken(entity) as string) 과 같이 이용 필요*/
    movieRepository = unitRef.get(getRepositoryToken(Movie) as string)
    genreRepository = unitRef.get(getRepositoryToken(Genre) as string)
    directorRepository = unitRef.get(getRepositoryToken(Director) as string)
    movieUserLikeRepository = unitRef.get(getRepositoryToken(MovieUserLike) as string)
  })

  afterEach(async () => {
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    // expect(movieService).toBeDefined()
    expect(true).toBe(true)
  })

  describe('findRecent', () => {
    const cachedMovies = [
      { id: 1, title: 'movie 1' },
      { id: 2, title: 'movie 2' },
      { id: 3, title: 'movie 3' },
    ] as Movie[]

    it('should return recent movies from cache', async () => {
      // given
      jest.spyOn(cacheManager, 'get').mockResolvedValue(cachedMovies)

      // when & then
      await expect(movieService.findRecentMovieList()).resolves.toEqual(cachedMovies)
      expect(cacheManager.get).toHaveBeenCalledWith('RECENT_MOVIE')
    })

    it('should fetch movies from repository and cache them if movies not found in cache', async () => {
      // given
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null)
      jest.spyOn(cacheManager, 'set').mockResolvedValue(cachedMovies)
      jest.spyOn(movieRepository, 'find').mockResolvedValue(cachedMovies)

      // when & then
      await expect(movieService.findRecentMovieList()).resolves.toEqual(cachedMovies)
      expect(cacheManager.get).toHaveBeenCalledWith('RECENT_MOVIE')
      expect(cacheManager.set).toHaveBeenCalledWith('RECENT_MOVIE', cachedMovies)
      expect(movieRepository.find).toHaveBeenCalledWith({
        order: {
          createdAt: 'DESC',
        },
        take: 10,
      })
    })
  })

  describe('findMovieList', () => {
    let getMoviesQbMock: jest.SpyInstance
    let getLikedMoviesQbMock: jest.SpyInstance

    const movies = [
      { id: 1, title: 'movie 1' },
      { id: 2, title: 'movie 2' },
      { id: 3, title: 'movie 3' },
    ] as Movie[]

    const title = 'movie'
    const nextCursor = 'nextCursor'

    /** 각 it 에서 사용하게될 메서드 인스턴스를 계속 초기화 */
    beforeEach(() => {
      getMoviesQbMock = jest.spyOn(movieService, 'getMoviesQb')
      getLikedMoviesQbMock = jest.spyOn(movieService, 'getLikedMoviesQb')
    })

    it('should return list of movies without user likes', async () => {
      // given
      const dto = { title } as GetMoviesDto

      const qb: any = {
        where: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([movies, 3]),
      }

      getMoviesQbMock.mockReturnValue(qb)

      /** void 함수에 대한 리턴 처리 */
      /** mockResolvedValue(undefined), mockReturnValue(undefined) 와 mockImplementation(() => {}) 모두 void 반환시 사용  */
      jest.spyOn(commonService, 'applyCursorPaginationParamsToQb').mockImplementation(() => {
      })
      jest.spyOn(commonService, 'generateNextCursor').mockReturnValue(nextCursor)

      // when
      const result = await movieService.findMovieList(dto)

      // then
      expect(result).toEqual({ data: movies, nextCursor, count: movies.length })

      expect(getMoviesQbMock).toHaveBeenCalled()
      expect(qb.where).toHaveBeenCalledWith('movie.title LIKE :title', { title: `%${title}%` })
      expect(commonService.applyCursorPaginationParamsToQb).toHaveBeenCalledWith(qb, dto)
      expect(qb.getManyAndCount).toHaveBeenCalled()
      expect(commonService.generateNextCursor).toHaveBeenCalledWith(movies, dto.order)
    })

    it('should return a list of movies with user likes', async () => {
      // given
      const dto = { title } as GetMoviesDto
      const userId = 1

      const likedMovies = [
        { movie: { id: 1 }, isLike: true },
        { movie: { id: 3 }, isLike: false },
      ]

      const likedMovieMap = Object.fromEntries(
        likedMovies.map(mul => [mul.movie.id, mul.isLike]),
      )

      const qb: any = {
        where: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([movies, 3]),
      }

      getMoviesQbMock.mockReturnValue(qb)

      jest.spyOn(commonService, 'applyCursorPaginationParamsToQb').mockReturnValue(undefined)
      jest.spyOn(commonService, 'generateNextCursor').mockReturnValue(nextCursor)

      getLikedMoviesQbMock.mockResolvedValue(likedMovies)

      // when
      const result = await movieService.findMovieList(dto, userId)

      // then
      expect(result).toEqual({
        data: movies.map(movie => ({
          ...movie,
          likeStatus: likedMovieMap[movie.id] ?? null,
        })),
        nextCursor,
        count: movies.length,
      })

      expect(getMoviesQbMock).toHaveBeenCalled()
      expect(qb.where).toHaveBeenCalledWith('movie.title LIKE :title', { title: `%${title}%` })
      expect(commonService.applyCursorPaginationParamsToQb).toHaveBeenCalledWith(qb, dto)
      expect(qb.getManyAndCount).toHaveBeenCalled()
      expect(getLikedMoviesQbMock).toHaveBeenCalledWith(
        movies.map(movie => movie.id),
        userId,
      )
      expect(commonService.generateNextCursor).toHaveBeenCalledWith(movies, dto.order)
    })

    it('should return list of movies without title', async () => {
      // given
      const dto = {} as GetMoviesDto

      const qb = {
        getManyAndCount: jest.fn().mockResolvedValue([movies, 3]),
      }

      getMoviesQbMock.mockReturnValue(qb)

      jest.spyOn(commonService, 'applyCursorPaginationParamsToQb').mockImplementation(() => {
      })

      jest.spyOn(commonService, 'generateNextCursor').mockReturnValue(nextCursor)

      // when
      const result = await movieService.findMovieList(dto)

      // then
      expect(result).toEqual({ data: movies, nextCursor, count: movies.length })

      expect(getMoviesQbMock).toHaveBeenCalled()
      expect(commonService.applyCursorPaginationParamsToQb).toHaveBeenCalledWith(qb, dto)
      expect(qb.getManyAndCount).toHaveBeenCalled()
      expect(commonService.generateNextCursor).toHaveBeenCalledWith(movies, dto.order)
    })
  })

  describe('findOneMovie', () => {
    const movies = [
      { id: 1, title: 'movie 1' },
      { id: 2, title: 'movie 2' },
      { id: 3, title: 'movie 3' },
    ] as Movie[]

    let findMovieDetailMock: jest.SpyInstance

    function filterMovies(id: number) {
      return movies.find(movie => movie.id === id) ?? null
    }

    beforeEach(() => {
      findMovieDetailMock = jest.spyOn(movieService, 'findMovieDetail')
    })

    it('should return one movie with specific id', async () => {
      // given
      const id = 1

      const filteredMovies = filterMovies(id)
      findMovieDetailMock.mockResolvedValue(filteredMovies)

      // when & then
      await expect(movieService.findMovie(id)).resolves.toEqual(filteredMovies)

      expect(movieService.findMovieDetail).toHaveBeenCalledWith(id)
    })

    it('should throw NotFoundException if movie with specific id is not found', async () => {
      // given
      const id = 0

      findMovieDetailMock.mockResolvedValue(filterMovies(id))

      // when & then
      await expect(movieService.findMovie(id)).rejects.toThrow(NotFoundException)

      expect(movieService.findMovieDetail).toHaveBeenCalledWith(id)
    })
  })
})
