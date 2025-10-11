import { Test, TestingModule } from '@nestjs/testing'
import { GenreController } from './genre.controller'
import { GenreService } from './genre.service'
import { Genre } from './entities/genre.entity'
import { CreateGenreDto } from './dto/create-genre.dto'
import { UpdateGenreDto } from './dto/update-genre.dto'

const mockGenreService = {
  findAllGenre: jest.fn(),
  findOneGenre: jest.fn(),
  createGenre: jest.fn(),
  updateGenre: jest.fn(),
  deleteGenre: jest.fn(),
}

describe('GenreController', () => {
  let genreController: GenreController
  let genreService: GenreService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GenreController],
      providers: [
        {
          provide: GenreService,
          useValue: mockGenreService,
        },
      ],
    }).compile()

    genreController = module.get<GenreController>(GenreController)
    genreService = module.get<GenreService>(GenreService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(true).toBe(true)
    expect(genreController).toBeDefined()
  })

  describe('getManyGenre', () => {
    it('should return all genres', async () => {
      // given
      const genres = [
        { id: 1, name: 'genre1', description: 'genre1' },
        { id: 2, name: 'genre2', description: 'genre2' },
        { id: 3, name: 'genre3', description: 'genre3' },
      ] as Genre[]

      const genresWithLength = [genres, genres.length]

      jest.spyOn(mockGenreService, 'findAllGenre').mockResolvedValue(genresWithLength)

      // when & then
      await expect(genreController.getManyGenre()).resolves.toEqual(genresWithLength)

      expect(mockGenreService.findAllGenre).toHaveBeenCalled()
    })

    it('should return genres contains specific names', async () => {
      // given
      const searchName = '1'
      const genres = [
        { id: 1, name: 'genre1', description: 'genre1' },
        { id: 2, name: 'genre2', description: 'genre2' },
        { id: 3, name: 'genre3', description: 'genre3' },
      ] as Genre[]

      const filteredGenres = genres.filter(genre => genre.name.includes(searchName))
      const filteredGenresWithLength = [filteredGenres, filteredGenres.length]

      jest.spyOn(mockGenreService, 'findAllGenre').mockResolvedValue(filteredGenresWithLength)

      // when & then
      await expect(genreController.getManyGenre(searchName)).resolves.toEqual(filteredGenresWithLength)

      expect(mockGenreService.findAllGenre).toHaveBeenCalled()
    })
  })

  describe('getOneGenre', () => {
    it('should return genre info for a specific id', async () => {
      // given
      const id = 1
      const genre = { id: 1, name: 'genre1', description: 'genre1' } as Genre

      jest.spyOn(mockGenreService, 'findOneGenre').mockResolvedValue(genre)

      // when & then
      await expect(genreController.getOneGenre(id)).resolves.toEqual(genre)

      expect(mockGenreService.findOneGenre).toHaveBeenCalledWith(id)
    })
  })

  describe('postGenre', () => {
    it('should return genre info after creation', async () => {
      // given
      const createGenreDto = { name: 'genre1', description: 'genre1' } as CreateGenreDto
      const genre = { id: 1, ...createGenreDto } as Genre

      jest.spyOn(mockGenreService, 'createGenre').mockResolvedValue(genre)

      // when & then
      await expect(genreController.postGenre(createGenreDto)).resolves.toEqual(genre)

      expect(mockGenreService.createGenre).toHaveBeenCalledWith(createGenreDto)
    })
  })

  describe('patchGenre', () => {
    it('should return genre info after update', async () => {
      // given
      const id = 1
      const updateGenreDto = { name: 'genre1', description: 'genre1' } as UpdateGenreDto
      const genre = { id, ...updateGenreDto } as Genre

      jest.spyOn(mockGenreService, 'updateGenre').mockResolvedValue(genre)

      // when & then
      await expect(genreController.patchGenre(id, updateGenreDto)).resolves.toEqual(genre)

      expect(mockGenreService.updateGenre).toHaveBeenCalledWith(id, updateGenreDto)
    })
  })

  describe('deleteGenre', () => {
    it('should delete genre', async () => {
      // given
      const id = 1

      jest.spyOn(mockGenreService, 'deleteGenre').mockResolvedValue(undefined)

      // when & then
      await expect(genreController.deleteGenre(id)).resolves.toBeUndefined()

      expect(mockGenreService.deleteGenre).toHaveBeenCalledWith(id)
    })
  })
})
