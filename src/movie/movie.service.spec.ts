import { TestBed, Mocked } from '@suites/unit'
import { MovieService } from './movie.service'
import { DataSource, In, QueryRunner, Repository, UpdateQueryBuilder } from 'typeorm'
import { Movie } from './entity/movie.entity'
import { Genre } from '../genre/entities/genre.entity'
import { Director } from '../director/entity/director.entity'
import { MovieUserLike } from './entity/movie-user-like.entity'
import { Cache } from 'cache-manager'
import { CommonService } from '../common/module/common.service'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { getRepositoryToken } from '@nestjs/typeorm'
import { GetMoviesDto } from './dto/get-movies.dto'
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { CreateMovieDto } from './dto/create-movie.dto'
import { UpdateMovieDto } from './dto/update-movie.dto'
import { MovieDetail } from './entity/movie-detail.entity'
import { User } from '../user/entities/user.entity'

describe('MovieService', () => {
  /** 테스트 대상 객체는 실제 class 로 처리 */
  let movieService: MovieService
  /** 연관 repository 들은 모두 Mocked<Repository<entity이름>> 로 처리 */
  let movieRepository: Mocked<Repository<Movie>>
  let genreRepository: Mocked<Repository<Genre>>
  let directorRepository: Mocked<Repository<Director>>
  let movieUserLikeRepository: Mocked<Repository<MovieUserLike>>
  /** 테스트 대상 객체가 아닌 기타 서비스들은 Mocked<객체 이름> 으로 처리 */
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

  afterEach(() => {
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
    /** 테스트 대상 메서드와 같은 클래스에 존재하는 메서드를 호출할 때는 jest.SpyInstance 를 사용 */
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
      /** 테스트 대상 메서드와 같은 클래스에 존재하는 메서드들을 초기화 할 때는 jest.spyOn 를 사용 */
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

  describe('processCreateMovie', () => {
    /**  */
    let qr: jest.Mocked<QueryRunner>
    let createMovieDetail: jest.SpyInstance
    let createMovie: jest.SpyInstance
    let createMovieGenre: jest.SpyInstance
    let renameMovieFile: jest.SpyInstance

    const genres = [
      { id: 1, name: 'genre 1', description: 'description1' },
      { id: 2, name: 'genre 2', description: 'description2' },
      { id: 3, name: 'genre 3', description: 'description3' },
      { id: 4, name: 'genre 4', description: 'description4' },
    ]

    beforeEach(() => {
      qr = {
        manager: {
          findOne: jest.fn(),
          findOneBy: jest.fn(),
          find: jest.fn(),
        },
      } as any as jest.Mocked<QueryRunner>
      createMovieDetail = jest.spyOn(movieService, 'createMovieDetail')
      createMovie = jest.spyOn(movieService, 'createMovie')
      createMovieGenre = jest.spyOn(movieService, 'createMovieGenre')
      renameMovieFile = jest.spyOn(movieService, 'renameMovieFile')
    })

    it('should return movie after creation', async () => {
      // given
      const genreIds = [1, 2]
      const directorId = 1
      const detail = 'detail 1'
      const movieFileName = 'movieFileName1'
      const createMovieDto = { genreIds, detail, directorId, movieFileName } as CreateMovieDto
      const userId = 1
      const detailId = 1
      const movieId = 1
      const movie = { ...createMovieDto, id: movieId } as unknown as Movie
      const insertResult = { identifiers: [{ id: 1 }] }

      const filteredGenreList = genres.filter(genre => genreIds.includes(genre.id)) as Genre[]
      const director = { name: 'director1', dob: new Date(1990, 1, 1) } as Director

      jest.spyOn(qr.manager, 'find').mockResolvedValue(filteredGenreList)
      jest.spyOn(qr.manager, 'findOneBy').mockResolvedValueOnce(director)

      createMovieDetail.mockResolvedValue(insertResult)
      createMovie.mockResolvedValue(insertResult)
      createMovieGenre.mockResolvedValue(undefined)
      renameMovieFile.mockResolvedValue(undefined)

      jest.spyOn(qr.manager, 'findOne').mockResolvedValueOnce(movie)

      // when
      const result = await movieService.processCreateMovie(createMovieDto, userId, qr)

      // then
      expect(result).toEqual(movie)

      expect(qr.manager.find).toHaveBeenCalledWith(Genre, { where: { id: In(genreIds) } })
      expect(qr.manager.findOneBy).toHaveBeenCalledWith(Director, { id: directorId })
      expect(movieService.createMovieDetail).toHaveBeenCalledWith(qr, detail)
      expect(movieService.createMovie).toHaveBeenCalledWith(createMovieDto, qr, detailId, director, userId, movieFileName)
      expect(movieService.createMovieGenre).toHaveBeenCalledWith(qr, movieId, genreIds)
      /** 필요한 경우 임의로 타입만 맞다면 지나가도록 세팅 가능 */
      expect(movieService.renameMovieFile).toHaveBeenCalledWith(expect.any(String), expect.any(String))
      expect(qr.manager.findOne).toHaveBeenCalledWith(
        Movie,
        {
          where: { id: movieId },
          relations: ['detail', 'director', 'genres'],
        },
      )
    })

    it('should throw NotFoundException if cannot find any of genres for  creation', async () => {
      // given
      const genreIds = [99, 100]
      const directorId = 1
      const detail = 'detail 1'
      const movieFileName = 'movieFileName1'
      const createMovieDto = { genreIds, detail, directorId, movieFileName } as CreateMovieDto
      const userId = 1;

      (qr.manager.find as any).mockResolvedValue([])

      // when & then
      await expect(movieService.processCreateMovie(createMovieDto, userId, qr)).rejects.toThrow(NotFoundException)

      expect(qr.manager.find).toHaveBeenCalledWith(Genre, { where: { id: In(genreIds) } })
    })

    it('should throw NotFoundException if cannot find some of genres for  creation', async () => {
      // given
      const genreIds = [1, 99, 100]
      const directorId = 1
      const detail = 'detail 1'
      const movieFileName = 'movieFileName1'
      const createMovieDto = { genreIds, detail, directorId, movieFileName } as CreateMovieDto
      const userId = 1

      const filteredGenreList = genres.filter(genre => genreIds.includes(genre.id)) as Genre[]

      (qr.manager.find as any).mockResolvedValue(filteredGenreList)

      // when & then
      await expect(movieService.processCreateMovie(createMovieDto, userId, qr)).rejects.toThrow(NotFoundException)

      expect(qr.manager.find).toHaveBeenCalledWith(Genre, { where: { id: In(genreIds) } })
    })

    it('should throw NotFoundException if cannot find director for creation', async () => {
      // given
      const genreIds = [1, 2]
      const directorId = 1
      const detail = 'detail 1'
      const movieFileName = 'movieFileName1'
      const createMovieDto = { genreIds, detail, directorId, movieFileName } as CreateMovieDto
      const userId = 1

      const filteredGenreList = genres.filter(genre => genreIds.includes(genre.id)) as Genre[]

      jest.spyOn(qr.manager, 'find').mockResolvedValue(filteredGenreList)
      jest.spyOn(qr.manager, 'findOneBy').mockResolvedValue(null)

      // when & then
      await expect(movieService.processCreateMovie(createMovieDto, userId, qr)).rejects.toThrow(NotFoundException)

      expect(qr.manager.find).toHaveBeenCalledWith(Genre, { where: { id: In(genreIds) } })
      expect(qr.manager.findOneBy).toHaveBeenCalledWith(Director, { id: directorId })
    })
  })

  describe('processUpdateMovie', () => {
    let qr: jest.Mocked<QueryRunner>
    let qb: jest.Mocked<UpdateQueryBuilder<any>>
    let updateMovie: jest.SpyInstance
    let updateDirector: jest.SpyInstance
    let updateMovieDetail: jest.SpyInstance
    let updateMovieGenreRelation: jest.SpyInstance
    let findMovie: jest.SpyInstance

    const genres = [
      { id: 1, name: 'genre 1', description: 'description1' },
      { id: 2, name: 'genre 2', description: 'description2' },
      { id: 3, name: 'genre 3', description: 'description3' },
      { id: 4, name: 'genre 4', description: 'description4' },
    ]

    beforeEach(() => {
      qr = {
        connect: jest.fn().mockReturnThis(),
        startTransaction: jest.fn().mockReturnThis(),
        commitTransaction: jest.fn().mockReturnThis(),
        release: jest.fn().mockReturnThis(),
        rollbackTransaction: jest.fn().mockReturnThis(),

        manager: {
          find: jest.fn(),
          findOneBy: jest.fn(),
        },
      } as any as jest.Mocked<QueryRunner>

      findMovie = jest.spyOn(movieService, 'findMovie')
      updateMovie = jest.spyOn(movieService, 'updateMovie')
      updateDirector = jest.spyOn(movieService, 'updateDirector')
      updateMovieDetail = jest.spyOn(movieService, 'updateMovieDetail')
      updateMovieGenreRelation = jest.spyOn(movieService, 'updateMovieGenreRelation')

      jest.spyOn(dataSource, 'createQueryRunner').mockReturnValue(qr)
    })

    it('should return updated movie info after update', async () => {
      // given
      const id = 1
      const genreIds = [1, 2]
      const movieFileName = 'updatedMovieFileName1'
      const updateMovieDto = { title: 'update movie 1', detail: 'update detail 1', movieFileName, genreIds, directorId: id } as UpdateMovieDto
      const movie = { movieId: id, title: 'movie 1', detail: 'detail 1', movieFileName: 'movieFileName1', genreIds: [3, 4] } as any as Movie
      const director = { id, name: 'director 1' } as any as Director
      const updatedMovie = { id, ...updateMovieDto } as any as Movie

      const filteredGenres = genres.filter(genre => genreIds.includes(genre.id))

      findMovie.mockResolvedValue(movie)
      jest.spyOn(qr.manager, 'find').mockResolvedValue(filteredGenres)
      updateMovieGenreRelation.mockResolvedValue(undefined)
      jest.spyOn(qr.manager, 'findOneBy').mockResolvedValue(director)
      updateDirector.mockResolvedValue(undefined)
      updateMovieDetail.mockResolvedValue(undefined)
      updateMovie.mockResolvedValue(undefined)
      findMovie.mockResolvedValue(updatedMovie)

      // when
      const result = await movieService.processUpdateMovie(id, updateMovieDto)

      // then
      expect(result).toEqual(updatedMovie)

      expect(dataSource.createQueryRunner).toHaveBeenCalled()
      expect(qr.connect).toHaveBeenCalled()
      expect(qr.startTransaction).toHaveBeenCalled()
      expect(findMovie).toHaveBeenCalledWith(id)
      expect(qr.manager.find).toHaveBeenCalledWith(Genre, { where: { id: In(genreIds) } })
      expect(updateMovieGenreRelation).toHaveBeenCalledWith(qr, id, genreIds)
      expect(qr.manager.findOneBy).toHaveBeenCalledWith(Director, { id })
      expect(updateDirector).toHaveBeenCalledWith(qr, id, updateMovieDto.directorId)
      expect(updateMovieDetail).toHaveBeenCalledWith(qr, updateMovieDto.detail, updatedMovie)
      expect(updateMovie).toHaveBeenCalledWith(qr, expect.any(Object), id)
      expect(qr.commitTransaction).toHaveBeenCalled()
      expect(qr.release).toHaveBeenCalled()
      expect(findMovie).toHaveBeenCalledWith(id)
    })

    it('should throw NotFoundException when the movie does not exist', async () => {
      // given
      const id = 1
      const genreIds = [1, 2]
      const movieFileName = 'updatedMovieFileName1'
      const updateMovieDto = { title: 'update movie 1', detail: 'update detail 1', movieFileName, genreIds, directorId: id } as UpdateMovieDto

      findMovie.mockResolvedValue(null)

      // when & then
      await expect(movieService.processUpdateMovie(id, updateMovieDto)).rejects.toThrow(NotFoundException)

      expect(dataSource.createQueryRunner).toHaveBeenCalled()
      expect(qr.connect).toHaveBeenCalled()
      expect(qr.startTransaction).toHaveBeenCalled()
      expect(findMovie).toHaveBeenCalledWith(id)
      expect(qr.rollbackTransaction).toHaveBeenCalled()
      expect(qr.release).toHaveBeenCalled()
    })

    it('should throw NotFoundException when any of genres not found', async () => {
      // given
      const id = 1
      const genreIds = [99, 100]
      const movieFileName = 'updatedMovieFileName1'
      const updateMovieDto = { title: 'update movie 1', detail: 'update detail 1', movieFileName, genreIds, directorId: id } as UpdateMovieDto
      const movie = { movieId: id, title: 'movie 1', detail: 'detail 1', movieFileName: 'movieFileName1', genreIds: [3, 4] } as any as Movie

      const filteredGenres = genres.filter(genre => genreIds.includes(genre.id))

      findMovie.mockResolvedValue(movie)
      jest.spyOn(qr.manager, 'find').mockResolvedValue(filteredGenres)

      // when & then
      await expect(movieService.processUpdateMovie(id, updateMovieDto)).rejects.toThrow(NotFoundException)

      expect(dataSource.createQueryRunner).toHaveBeenCalled()
      expect(qr.connect).toHaveBeenCalled()
      expect(qr.startTransaction).toHaveBeenCalled()
      expect(findMovie).toHaveBeenCalledWith(id)
      expect(qr.manager.find).toHaveBeenCalledWith(Genre, { where: { id: In(genreIds) } })
      expect(qr.rollbackTransaction).toHaveBeenCalled()
      expect(qr.release).toHaveBeenCalled()
    })

    it('should throw NotFoundException when some of genres not found', async () => {
      // given
      const id = 1
      const genreIds = [1, 2, 100]
      const movieFileName = 'updatedMovieFileName1'
      const updateMovieDto = { title: 'update movie 1', detail: 'update detail 1', movieFileName, genreIds, directorId: id } as UpdateMovieDto
      const movie = { movieId: id, title: 'movie 1', detail: 'detail 1', movieFileName: 'movieFileName1', genreIds: [3, 4] } as any as Movie

      const filteredGenres = genres.filter(genre => genreIds.includes(genre.id))

      findMovie.mockResolvedValue(movie)
      jest.spyOn(qr.manager, 'find').mockResolvedValue(filteredGenres)

      // when & then
      await expect(movieService.processUpdateMovie(id, updateMovieDto)).rejects.toThrow(NotFoundException)

      expect(dataSource.createQueryRunner).toHaveBeenCalled()
      expect(qr.connect).toHaveBeenCalled()
      expect(qr.startTransaction).toHaveBeenCalled()
      expect(findMovie).toHaveBeenCalledWith(id)
      expect(qr.manager.find).toHaveBeenCalledWith(Genre, { where: { id: In(genreIds) } })
      expect(qr.rollbackTransaction).toHaveBeenCalled()
      expect(qr.release).toHaveBeenCalled()
    })

    it('should throw NotFoundException when director not found', async () => {
      // given
      const id = 1
      const genreIds = [1, 2]
      const movieFileName = 'updatedMovieFileName1'
      const updateMovieDto = { title: 'update movie 1', detail: 'update detail 1', movieFileName, genreIds, directorId: id } as UpdateMovieDto
      const movie = { movieId: id, title: 'movie 1', detail: 'detail 1', movieFileName: 'movieFileName1', genreIds: [3, 4] } as any as Movie

      const filteredGenres = genres.filter(genre => genreIds.includes(genre.id))

      findMovie.mockResolvedValue(movie)
      jest.spyOn(qr.manager, 'find').mockResolvedValue(filteredGenres)
      updateMovieGenreRelation.mockResolvedValue(undefined)
      jest.spyOn(qr.manager, 'findOneBy').mockResolvedValue(null)

      // when & then
      await expect(movieService.processUpdateMovie(id, updateMovieDto)).rejects.toThrow(NotFoundException)

      expect(dataSource.createQueryRunner).toHaveBeenCalled()
      expect(qr.connect).toHaveBeenCalled()
      expect(qr.startTransaction).toHaveBeenCalled()
      expect(findMovie).toHaveBeenCalledWith(id)
      expect(qr.manager.find).toHaveBeenCalledWith(Genre, { where: { id: In(genreIds) } })
      expect(updateMovieGenreRelation).toHaveBeenCalledWith(qr, id, genreIds)
      expect(qr.manager.findOneBy).toHaveBeenCalledWith(Director, { id })
      expect(qr.rollbackTransaction).toHaveBeenCalled()
      expect(qr.release).toHaveBeenCalled()
    })
  })

  describe('processDeleteMovie', () => {
    let qr: jest.Mocked<QueryRunner>
    let deleteMovie: jest.SpyInstance
    let deleteMovieDetail: jest.SpyInstance
    let findMovie: jest.SpyInstance

    const movie = { id: 1, title: 'movie 1', detail: { id: 1, detail: 'detail 1' } as MovieDetail } as Movie

    beforeEach(() => {
      qr = {
        connect: jest.fn().mockReturnThis(),
        startTransaction: jest.fn().mockReturnThis(),
        commitTransaction: jest.fn().mockReturnThis(),
        rollbackTransaction: jest.fn().mockReturnThis(),
        release: jest.fn().mockReturnThis(),
      } as any as jest.Mocked<QueryRunner>

      findMovie = jest.spyOn(movieService, 'findMovie')
      deleteMovie = jest.spyOn(movieService, 'deleteMovie')
      deleteMovieDetail = jest.spyOn(movieService, 'deleteMovieDetail')
    })

    it('should delete movie', async () => {
      // given
      const id = 1

      jest.spyOn(dataSource, 'createQueryRunner').mockReturnValue(qr)
      findMovie.mockResolvedValue(movie)
      deleteMovie.mockResolvedValue(undefined)
      deleteMovieDetail.mockResolvedValue(undefined)

      // when
      const result = await movieService.processDeleteMovie(id)

      // then
      expect(result).toBeUndefined()
      expect(dataSource.createQueryRunner).toHaveBeenCalled()
      expect(qr.connect).toHaveBeenCalled()
      expect(qr.startTransaction).toHaveBeenCalled()
      expect(findMovie).toHaveBeenCalledWith(id)
      expect(deleteMovie).toHaveBeenCalledWith(qr, id)
      expect(deleteMovieDetail).toHaveBeenCalledWith(qr, movie)
      expect(qr.commitTransaction).toHaveBeenCalled()
      expect(qr.release).toHaveBeenCalled()
    })

    it('should throw NotFoundException if movie does not exist', async () => {
      // given
      const id = 99

      jest.spyOn(dataSource, 'createQueryRunner').mockReturnValue(qr)
      findMovie.mockResolvedValue(null)

      // when & then
      await expect(movieService.processDeleteMovie(id)).rejects.toThrow(NotFoundException)

      expect(dataSource.createQueryRunner).toHaveBeenCalled()
      expect(qr.connect).toHaveBeenCalled()
      expect(qr.startTransaction).toHaveBeenCalled()
      expect(findMovie).toHaveBeenCalledWith(id)
      expect(qr.rollbackTransaction).toHaveBeenCalled()
      expect(qr.release).toHaveBeenCalled()
    })
  })

  describe('toggleMovieLike', () => {
    let qr: jest.Mocked<QueryRunner>
    let deleteMovieUserLike: jest.SpyInstance
    let updateMovieUserLike: jest.SpyInstance
    let insertMovieUserLike: jest.SpyInstance

    beforeEach(() => {
      qr = {
        manager: {
          findOneBy: jest.fn(),
          findOne: jest.fn(),
          increment: jest.fn(),
          decrement: jest.fn(),
        },
      } as any as jest.Mocked<QueryRunner>

      deleteMovieUserLike = jest.spyOn(movieService, 'deleteMovieUserLike')
      updateMovieUserLike = jest.spyOn(movieService, 'updateMovieUserLike')
      insertMovieUserLike = jest.spyOn(movieService, 'insertMovieUserLike')
    })

    it('should increase specific movie like count', async () => {
      // given
      const movieId = 1
      const userId = 1
      const movie = { id: movieId, title: 'movie 1', likeCount: 0, dislikeCount: 0 } as Movie
      const user = { id: userId, email: 'user1@test.com' } as User
      const isLike = true
      const likeType = isLike ? 'likeCount' : 'dislikeCount'

      jest.spyOn(qr.manager, 'findOneBy').mockResolvedValueOnce(movie)
      jest.spyOn(qr.manager, 'findOneBy').mockResolvedValueOnce(user)
      jest.spyOn(qr.manager, 'findOne').mockResolvedValue(null)

      insertMovieUserLike.mockResolvedValue(undefined)

      jest.spyOn(qr.manager, 'increment').mockResolvedValue(expect.anything())
      jest.spyOn(qr.manager, 'findOneBy').mockResolvedValueOnce({ isLike })

      // when
      const result = await movieService.toggleMovieLike(movieId, userId, isLike, qr)

      // then
      expect(result).toEqual({ isLike })

      expect(qr.manager.findOneBy).toHaveBeenNthCalledWith(1, Movie, { id: movieId })
      expect(qr.manager.findOneBy).toHaveBeenNthCalledWith(2, User, { id: userId })
      expect(qr.manager.findOne).toHaveBeenCalledWith(MovieUserLike, { where: { userId, movieId } })
      expect(insertMovieUserLike).toHaveBeenCalledWith(qr, movieId, userId, isLike)
      expect(qr.manager.increment).toHaveBeenCalledWith(Movie, { id: movieId }, likeType, 1)
      expect(qr.manager.findOneBy).toHaveBeenLastCalledWith(MovieUserLike, { movie: { id: movieId }, user: { id: userId } })
    })

    it('should increase specific movie dislike count', async () => {
      // given
      const movieId = 1
      const userId = 1
      const movie = { id: movieId, title: 'movie 1', likeCount: 0, dislikeCount: 0 } as Movie
      const user = { id: userId, email: 'user1@test.com' } as User
      const isLike = false
      const likeType = isLike ? 'likeCount' : 'dislikeCount'

      jest.spyOn(qr.manager, 'findOneBy').mockResolvedValueOnce(movie)
      jest.spyOn(qr.manager, 'findOneBy').mockResolvedValueOnce(user)
      jest.spyOn(qr.manager, 'findOne').mockResolvedValue(null)

      insertMovieUserLike.mockResolvedValue(undefined)

      jest.spyOn(qr.manager, 'increment').mockResolvedValue(expect.anything())
      jest.spyOn(qr.manager, 'findOneBy').mockResolvedValueOnce({ isLike })

      // when
      const result = await movieService.toggleMovieLike(movieId, userId, isLike, qr)

      // then
      expect(result).toEqual({ isLike })

      expect(qr.manager.findOneBy).toHaveBeenNthCalledWith(1, Movie, { id: movieId })
      expect(qr.manager.findOneBy).toHaveBeenNthCalledWith(2, User, { id: userId })
      expect(qr.manager.findOne).toHaveBeenCalledWith(MovieUserLike, { where: { userId, movieId } })
      expect(insertMovieUserLike).toHaveBeenCalledWith(qr, movieId, userId, isLike)
      expect(qr.manager.increment).toHaveBeenCalledWith(Movie, { id: movieId }, likeType, 1)
      expect(qr.manager.findOneBy).toHaveBeenLastCalledWith(MovieUserLike, { movie: { id: movieId }, user: { id: userId } })
    })

    it('should decrease specific movie like count if requested again', async () => {
      // given
      const movieId = 1
      const userId = 1
      const movie = { id: movieId, title: 'movie 1', likeCount: 1, dislikeCount: 0 } as Movie
      const user = { id: userId, email: 'user1@test.com' } as User
      const isLike = true
      const likeRecord = { movieId, userId, isLike } as MovieUserLike
      const likeType = isLike ? 'likeCount' : 'dislikeCount'

      jest.spyOn(qr.manager, 'findOneBy').mockResolvedValueOnce(movie)
      jest.spyOn(qr.manager, 'findOneBy').mockResolvedValueOnce(user)
      jest.spyOn(qr.manager, 'findOne').mockResolvedValue(likeRecord)

      deleteMovieUserLike.mockResolvedValue(undefined)

      jest.spyOn(qr.manager, 'decrement').mockResolvedValue(expect.anything())
      jest.spyOn(qr.manager, 'findOneBy').mockResolvedValueOnce(null)

      // when
      const result = await movieService.toggleMovieLike(movieId, userId, isLike, qr)

      // then
      expect(result).toEqual({ isLike: null })

      expect(qr.manager.findOneBy).toHaveBeenNthCalledWith(1, Movie, { id: movieId })
      expect(qr.manager.findOneBy).toHaveBeenNthCalledWith(2, User, { id: userId })
      expect(qr.manager.findOne).toHaveBeenCalledWith(MovieUserLike, { where: { userId, movieId } })
      expect(deleteMovieUserLike).toHaveBeenCalledWith(qr, movieId, userId)
      expect(qr.manager.decrement).toHaveBeenCalledWith(Movie, { id: movieId }, likeType, 1)
      expect(qr.manager.findOneBy).toHaveBeenLastCalledWith(MovieUserLike, { movie: { id: movieId }, user: { id: userId } })
    })

    it('should decrease specific movie dislike count if requested again', async () => {
      // given
      const movieId = 1
      const userId = 1
      const movie = { id: movieId, title: 'movie 1', likeCount: 0, dislikeCount: 1 } as Movie
      const user = { id: userId, email: 'user1@test.com' } as User
      const isLike = false
      const likeRecord = { movieId, userId, isLike } as MovieUserLike
      const likeType = isLike ? 'likeCount' : 'dislikeCount'

      jest.spyOn(qr.manager, 'findOneBy').mockResolvedValueOnce(movie)
      jest.spyOn(qr.manager, 'findOneBy').mockResolvedValueOnce(user)
      jest.spyOn(qr.manager, 'findOne').mockResolvedValue(likeRecord)

      deleteMovieUserLike.mockResolvedValue(undefined)

      jest.spyOn(qr.manager, 'decrement').mockResolvedValue(expect.anything())
      jest.spyOn(qr.manager, 'findOneBy').mockResolvedValueOnce(null)

      // when
      const result = await movieService.toggleMovieLike(movieId, userId, isLike, qr)

      // then
      expect(result).toEqual({ isLike: null })

      expect(qr.manager.findOneBy).toHaveBeenNthCalledWith(1, Movie, { id: movieId })
      expect(qr.manager.findOneBy).toHaveBeenNthCalledWith(2, User, { id: userId })
      expect(qr.manager.findOne).toHaveBeenCalledWith(MovieUserLike, { where: { userId, movieId } })
      expect(deleteMovieUserLike).toHaveBeenCalledWith(qr, movieId, userId)
      expect(qr.manager.decrement).toHaveBeenCalledWith(Movie, { id: movieId }, likeType, 1)
      expect(qr.manager.findOneBy).toHaveBeenLastCalledWith(MovieUserLike, { movie: { id: movieId }, user: { id: userId } })
    })

    it('should increase like and decrease dislike count specific movie', async () => {
      // given
      const movieId = 1
      const userId = 1
      const movie = { id: movieId, title: 'movie 1', likeCount: 1, dislikeCount: 0 } as Movie
      const user = { id: userId, email: 'user1@test.com' } as User
      const isLike = false
      const likeRecord = { movieId, userId, isLike } as MovieUserLike

      jest.spyOn(qr.manager, 'findOneBy').mockResolvedValueOnce(movie)
      jest.spyOn(qr.manager, 'findOneBy').mockResolvedValueOnce(user)
      jest.spyOn(qr.manager, 'findOne').mockResolvedValue({ ...likeRecord, isLike: true })

      updateMovieUserLike.mockResolvedValue(undefined)

      jest.spyOn(qr.manager, 'increment').mockResolvedValue(expect.anything())
      jest.spyOn(qr.manager, 'decrement').mockResolvedValue(expect.anything())
      jest.spyOn(qr.manager, 'findOneBy').mockResolvedValueOnce(likeRecord)

      // when
      const result = await movieService.toggleMovieLike(movieId, userId, isLike, qr)

      // then
      expect(result).toEqual({ isLike })

      expect(qr.manager.findOneBy).toHaveBeenNthCalledWith(1, Movie, { id: movieId })
      expect(qr.manager.findOneBy).toHaveBeenNthCalledWith(2, User, { id: userId })
      expect(qr.manager.findOne).toHaveBeenCalledWith(MovieUserLike, { where: { userId, movieId } })
      expect(updateMovieUserLike).toHaveBeenCalledWith(qr, isLike, userId, movieId)
      expect(qr.manager.increment).toHaveBeenCalledWith(Movie, { id: movieId }, 'dislikeCount', 1)
      expect(qr.manager.decrement).toHaveBeenCalledWith(Movie, { id: movieId }, 'likeCount', 1)
      expect(qr.manager.findOneBy).toHaveBeenLastCalledWith(MovieUserLike, { movie: { id: movieId }, user: { id: userId } })
    })

    it('should increase dislike and decrease like count specific movie', async () => {
      // given
      const movieId = 1
      const userId = 1
      const movie = { id: movieId, title: 'movie 1', likeCount: 0, dislikeCount: 1 } as Movie
      const user = { id: userId, email: 'user1@test.com' } as User
      const isLike = true
      const likeRecord = { movieId, userId, isLike } as MovieUserLike

      jest.spyOn(qr.manager, 'findOneBy').mockResolvedValueOnce(movie)
      jest.spyOn(qr.manager, 'findOneBy').mockResolvedValueOnce(user)
      jest.spyOn(qr.manager, 'findOne').mockResolvedValue({ ...likeRecord, isLike: false })

      updateMovieUserLike.mockResolvedValue(undefined)

      jest.spyOn(qr.manager, 'increment').mockResolvedValue(expect.anything())
      jest.spyOn(qr.manager, 'decrement').mockResolvedValue(expect.anything())
      jest.spyOn(qr.manager, 'findOneBy').mockResolvedValueOnce(likeRecord)

      // when
      const result = await movieService.toggleMovieLike(movieId, userId, isLike, qr)

      // then
      expect(result).toEqual({ isLike })

      expect(qr.manager.findOneBy).toHaveBeenNthCalledWith(1, Movie, { id: movieId })
      expect(qr.manager.findOneBy).toHaveBeenNthCalledWith(2, User, { id: userId })
      expect(qr.manager.findOne).toHaveBeenCalledWith(MovieUserLike, { where: { userId, movieId } })
      expect(updateMovieUserLike).toHaveBeenCalledWith(qr, isLike, userId, movieId)
      expect(qr.manager.increment).toHaveBeenCalledWith(Movie, { id: movieId }, 'likeCount', 1)
      expect(qr.manager.decrement).toHaveBeenCalledWith(Movie, { id: movieId }, 'dislikeCount', 1)
      expect(qr.manager.findOneBy).toHaveBeenLastCalledWith(MovieUserLike, { movie: { id: movieId }, user: { id: userId } })
    })

    it('should throw BadRequestException if movie does not exist', async () => {
      // given
      const movieId = 1
      const userId = 1
      const isLike = true

      jest.spyOn(qr.manager, 'findOneBy').mockResolvedValueOnce(null)

      // when & then
      await expect(movieService.toggleMovieLike(movieId, userId, isLike, qr)).rejects.toThrow(BadRequestException)

      expect(qr.manager.findOneBy).toHaveBeenNthCalledWith(1, Movie, { id: movieId })
    })

    it('should throw UnauthorizedException if user does not exist', async () => {
      // given
      const movieId = 1
      const userId = 1
      const movie = { id: movieId, title: 'movie 1', likeCount: 0, dislikeCount: 0 } as Movie
      const isLike = true

      jest.spyOn(qr.manager, 'findOneBy').mockResolvedValueOnce(movie)
      jest.spyOn(qr.manager, 'findOneBy').mockResolvedValueOnce(null)

      // when & then
      await expect(movieService.toggleMovieLike(movieId, userId, isLike, qr)).rejects.toThrow(UnauthorizedException)

      expect(qr.manager.findOneBy).toHaveBeenNthCalledWith(1, Movie, { id: movieId })
      expect(qr.manager.findOneBy).toHaveBeenNthCalledWith(2, User, { id: userId })
    })
  })
})
