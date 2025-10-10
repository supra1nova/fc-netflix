import { Test, TestingModule } from '@nestjs/testing'
import { GenreService } from './genre.service'
import { Like, Repository } from 'typeorm'
import { Genre } from './entities/genre.entity'
import { getRepositoryToken } from '@nestjs/typeorm'
import { CreateGenreDto } from './dto/create-genre.dto'
import { UpdateGenreDto } from './dto/update-genre.dto'
import { NotFoundException } from '@nestjs/common'

const mockGenreRepository = {
  findAndCount: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
}

describe('GenreService', () => {
  let genreService: GenreService
  let genreRepository: Repository<Genre>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenreService,
        {
          provide: getRepositoryToken(Genre),
          useValue: mockGenreRepository,
        },
      ],
    }).compile()

    genreService = module.get<GenreService>(GenreService)
    genreRepository = module.get<Repository<Genre>>(getRepositoryToken(Genre))
  })

  afterEach(async () => {
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(genreService).toBeDefined()
  })

  describe('findAllGenre', () => {
    const genres = [
      { id: 1, name: 'genre1', description: 'genre1' },
      { id: 2, name: 'genre2', description: 'genre2' },
      { id: 3, name: 'genre3', description: 'genre3' },
    ] as Genre[]

    it('Should return all genres', async () => {
      // given
      const foundGenreWithLength = [genres, genres.length]

      jest.spyOn(mockGenreRepository, 'findAndCount').mockResolvedValue(foundGenreWithLength)

      // when
      const result = await genreService.findAllGenre()

      // then
      expect(result).toEqual(foundGenreWithLength)

      expect(mockGenreRepository.findAndCount).toHaveBeenCalledWith()
    })

    it('Should return all genres', async () => {
      // given
      const name = 'genre'

      const filteredGenres = genres.filter(genre => genre.name.includes(name))
      const foundGenreWithLength = [filteredGenres, filteredGenres.length]

      jest.spyOn(mockGenreRepository, 'findAndCount').mockResolvedValue(foundGenreWithLength)

      // when
      const result = await genreService.findAllGenre(name)

      // then
      expect(result).toEqual(foundGenreWithLength)

      expect(mockGenreRepository.findAndCount).toHaveBeenCalledWith({ where: { name: Like(`%${name}%`) } })
    })
  })

  describe('findOneGenre', () => {
    it('Should return genre with specific id', async () => {
      // given
      const id = 1
      const genre = { id: 1, name: 'genre1', description: 'genre1' } as Genre

      jest.spyOn(mockGenreRepository, 'findOne').mockResolvedValue(genre)

      // when
      const result = await genreService.findOneGenre(id)

      // then
      expect(result).toEqual(genre)

      expect(mockGenreRepository.findOne).toHaveBeenCalledWith({ where: { id } })
    })
  })

  describe('createGenre', () => {
    it('should return saved genre info', async () => {
      // given
      const createGenreDto = { name: 'genre1', description: 'genre1' } as CreateGenreDto
      const genre = { id: 1, ...createGenreDto } as Genre

      jest.spyOn(mockGenreRepository, 'save').mockResolvedValue(genre)

      // when
      const result = await genreService.createGenre(createGenreDto)

      // then
      expect(result).toEqual(genre)

      expect(mockGenreRepository.save).toHaveBeenCalledWith(createGenreDto)
    })
  })

  describe('updateGenre', () => {
    const id = 1
    const updateGenreDto = { name: 'genre2', description: 'genre2' } as UpdateGenreDto

    it('should return updated genre info', async () => {
      // given
      const currentGenre = { id, name: 'genre1', description: 'genre1' } as Genre
      const genre = { ...currentGenre, ...updateGenreDto } as Genre

      jest.spyOn(mockGenreRepository, 'findOne').mockResolvedValue(currentGenre)
      jest.spyOn(mockGenreRepository, 'save').mockResolvedValue(genre)

      // when
      const result = await genreService.updateGenre(id, updateGenreDto)

      // then
      expect(result).toEqual(genre)

      expect(mockGenreRepository.findOne).toHaveBeenCalledWith({ where: { id } })
      expect(mockGenreRepository.save).toHaveBeenCalledWith(genre)
    })

    it('should throw NotFoundException if genre is not found', async () => {
      // given
      jest.spyOn(mockGenreRepository, 'findOne').mockResolvedValue(null)

      // when & then
      await expect(genreService.updateGenre(id, updateGenreDto)).rejects.toThrow(NotFoundException)

      expect(mockGenreRepository.findOne).toHaveBeenCalledWith({ where: { id } })
    })
  })

  describe('deleteGenre', () => {
    const id = 1

    it('should deleted genre', async () => {
      // given
      const genre = { id, name: 'genre1', description: 'genre1' } as Genre

      jest.spyOn(mockGenreRepository, 'findOne').mockResolvedValue(genre)

      // when
      const result = await genreService.deleteGenre(id)

      // then
      expect(result).toBeUndefined()

      expect(mockGenreRepository.findOne).toHaveBeenCalledWith({ where: { id } })
      expect(mockGenreRepository.delete).toHaveBeenCalledWith(id)
    })

    it('should throw NotFoundException if genre is not found', async () => {
      // given
      jest.spyOn(mockGenreRepository, 'findOne').mockResolvedValue(null)

      // when & then
      await expect(genreService.deleteGenre(id)).rejects.toThrow(NotFoundException)

      expect(mockGenreRepository.findOne).toHaveBeenCalledWith({ where: { id } })
    })
  })
})
