import { MovieController } from './movie.controller'
import { Mocked, TestBed } from '@suites/unit'
import { MovieService } from './movie.service'
import { Movie } from './entity/movie.entity'
import { GetMoviesDto } from './dto/get-movies.dto'
import { CreateMovieDto } from './dto/create-movie.dto'
import { QueryRunner } from 'typeorm'
import { UpdateMovieDto } from './dto/update-movie.dto'

describe('MovieController', () => {
  let movieController: MovieController
  /** @suites/unit의 Mocked에서 호출 필요 */
  let movieService: Mocked<MovieService>
  const qr = {} as any as jest.Mocked<QueryRunner>

  const movies = [
    { id: 1, title: 'movie 1' },
    { id: 2, title: 'movie 2' },
    { id: 3, title: 'movie 3' },
  ] as Movie[]

  beforeEach(async () => {
    const { unit, unitRef } = await TestBed.solitary(MovieController).compile()

    movieController = unit
    movieService = unitRef.get(MovieService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(movieController).toBeDefined()
  })

  describe('getRecentMovieList', () => {
    it('should return movie list', async () => {
      // given
      jest.spyOn(movieService, 'findRecentMovieList').mockResolvedValue(movies)

      // when
      const result = await movieController.getRecentMovieList()

      // then
      expect(result).toEqual(movies)
      expect(movieService.findRecentMovieList).toHaveBeenCalled()
    })
  })

  describe('getRecentMovieList', () => {
    const title = '1'
    const dto = { title } as GetMoviesDto

    it('should return movie list', async () => {
      // given
      const userId = 1

      const filteredMovies = movies.filter((movie) => movie.title.includes(title))
      const data = { data: filteredMovies, nextCursor: 'nextCursor', count: filteredMovies.length}

      jest.spyOn(movieService, 'findMovieList').mockResolvedValue(data)

      // when
      const result = await movieController.getMovieList(dto, userId)

      // then
      expect(result).toEqual(data)
      expect(movieService.findMovieList).toHaveBeenCalledWith(dto, userId)
    })

    it('should return movie list', async () => {
      // given
      const userId = undefined

      const data = { data: movies, nextCursor: 'nextCursor', count: movies.length}

      jest.spyOn(movieService, 'findMovieList').mockResolvedValue(data)

      // when
      const result = await movieController.getMovieList(dto, userId)

      // then
      expect(result).toEqual(data)
      expect(movieService.findMovieList).toHaveBeenCalledWith(dto, userId)
    })
  })

  describe('getMovie', () => {
    it('should return movie', async () => {
      // given
      const id = 1
      const movie = movies[0]

      // when
      jest.spyOn(movieService, 'findMovie').mockResolvedValue(movie)

      // then
      await expect(movieController.getMovie(id)).resolves.toEqual(movie)
      expect(movieService.findMovie).toHaveBeenCalledWith(id)
    })
  })

  describe('postMovie', () => {
    it('should return movie after creation', async () => {
      // given
      const id = movies.length + 1
      const createMovieDto = { title: `movies ${id}` } as CreateMovieDto
      const movie = { id, title: `movies ${id}` } as Movie
      const userId = 1

      // when
      jest.spyOn(movieService, 'processCreateMovie').mockResolvedValue(movie)

      // then
      await expect(movieController.postMovie(createMovieDto, userId, qr)).resolves.toEqual(movie)
      expect(movieService.processCreateMovie).toHaveBeenCalledWith(createMovieDto, userId, qr)
    })
  })

  describe('patchMovie', () => {
    it('should return movie after patch', async () => {
      // given
      const id = 1
      const title = `movies ${id + 'test'}`
      const updateMovieDto = { title } as UpdateMovieDto
      const movie = { id, title } as Movie

      // when
      jest.spyOn(movieService, 'processUpdateMovie').mockResolvedValue(movie)

      // then
      await expect(movieController.patchMovie(id, updateMovieDto)).resolves.toEqual(movie)
      expect(movieService.processUpdateMovie).toHaveBeenCalledWith(id, updateMovieDto)
    })
  })

  describe('deleteMovie', () => {
    it('should return movie after patch', async () => {
      // given
      const id = 1

      // when
      jest.spyOn(movieService, 'processDeleteMovie').mockResolvedValue(undefined)

      // then
      await expect(movieController.deleteMovie(id)).resolves.toBeUndefined()
      expect(movieService.processDeleteMovie).toHaveBeenCalledWith(id)
    })
  })

  describe('postMovieLike', () => {
    it('should return isLike after increase like', async () => {
      //given
      const userId = 1
      const movieId = 1
      const isLike = true

      // when
      jest.spyOn(movieService, 'toggleMovieLike').mockResolvedValue({ isLike })

      // then
      await expect(movieController.postMovieLike(userId, movieId, qr)).resolves.toEqual({ isLike })
      expect(movieService.toggleMovieLike).toHaveBeenCalledWith(userId, movieId, isLike, qr)
    })
  })
  describe('postMovieLike', () => {
    it('should return disLike after increase like', async () => {
      //given
      const userId = 1
      const movieId = 1
      const isLike = false

      // when
      jest.spyOn(movieService, 'toggleMovieLike').mockResolvedValue({ isLike })

      // then
      await expect(movieController.postMovieDislike(userId, movieId, qr)).resolves.toEqual({ isLike })
      expect(movieService.toggleMovieLike).toHaveBeenCalledWith(userId, movieId, isLike, qr)
    })
  })
})
