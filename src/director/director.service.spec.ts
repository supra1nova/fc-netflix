import { Test, TestingModule } from '@nestjs/testing'
import { DirectorService } from './director.service'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Director } from './entity/director.entity'
import { Repository } from 'typeorm'
import { CreateDirectorDto } from './dto/create-director.dto'
import { UpdateDirectorDto } from './dto/update-director.dto'
import { NotFoundException } from '@nestjs/common'

const mockDirectorRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
}

describe('DirectorService', () => {
  let directorService: DirectorService
  let directorRepository: Repository<Director>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DirectorService,
        {
          provide: getRepositoryToken(Director),
          useValue: mockDirectorRepository,
        },
      ],
    }).compile()

    directorService = module.get<DirectorService>(DirectorService)
    directorRepository = module.get<Repository<Director>>(getRepositoryToken(Director))
  })

  it('should be defined', () => {
    expect(directorService).toBeDefined()
  })

  describe('findListDirector', () => {
    const directors = [
      { id: 1, name: 'director1' },
      { id: 2, name: 'director2' },
    ]

    it('should return list directors containing given name', async () => {
      // given
      jest.spyOn(mockDirectorRepository, 'find').mockReturnValue(directors)

      // when
      const result = await directorService.findListDirector()

      // then
      expect(result).toEqual(directors)

      expect(mockDirectorRepository.find).toHaveBeenCalledWith()
    })

    it('should return list directors containing given name', async () => {
      // given
      const searchName = '1'
      const filteredDirectors = directors.filter((director) => director.name.includes(searchName))

      jest.spyOn(mockDirectorRepository, 'find').mockReturnValue(filteredDirectors)

      // when
      const result = await directorService.findListDirector(searchName)

      // then
      expect(result).toEqual(filteredDirectors)

      expect(mockDirectorRepository.find).toHaveBeenCalled()
    })
  })

  describe('findOneDirector', () => {
    it('should return user with specific id', () => {
      // given
      const id = 1
      const director = { id, name: 'director1' } as Director

      jest.spyOn(mockDirectorRepository, 'findOne').mockReturnValue(director)

      // when
      const result = directorService.findOneDirector(id)

      // then
      expect(result).toEqual(director)

      expect(mockDirectorRepository.findOne).toHaveBeenLastCalledWith({ where: { id } })
    })
  })

  describe('createDirector', () => {
    it('should return created director info', async () => {
      // given
      const createDirectorDto = {
        name: 'createDirector',
        dob: new Date(1990, 1, 1),
        nationality: 'Korean'
      } as CreateDirectorDto

      const director = { id: 1, ...createDirectorDto } as Director

      jest.spyOn(mockDirectorRepository, 'save').mockResolvedValue(director)

      // when
      const result = await directorService.createDirector(createDirectorDto)

      // then
      expect(result).toEqual(director)

      expect(mockDirectorRepository.save).toHaveBeenCalledWith(createDirectorDto)
    })
  })

  describe('updateDirector', () => {
    const id = 1
    const updateDirectorDto = {
      name: 'updateDirector',
      dob: new Date(1991, 2, 2),
      nationality: 'French'
    } as UpdateDirectorDto

    it('should return updated director info', async () => {
      // given
      const currentDirector = {
        id,
        name: 'currentDirector',
        dob: new Date(1990, 1, 1),
        nationality: 'Korean'
      } as Director

      const director = Object.assign(currentDirector, updateDirectorDto) as Director

      jest.spyOn(directorService, 'findOneDirector').mockResolvedValue(currentDirector)
      jest.spyOn(mockDirectorRepository, 'save').mockResolvedValue(director)

      // when
      const result = await directorService.updateDirector(id, updateDirectorDto)

      // then
      expect(result).toEqual(director)

      expect(directorService.findOneDirector).toHaveBeenCalledWith(id)
      expect(mockDirectorRepository.save).toHaveBeenCalledWith(director)
    })

    it('should throw NotFoundException if director is not found', async () => {
      // given
      jest.spyOn(directorService, 'findOneDirector').mockResolvedValue(null)

      // when & then
      await expect(directorService.updateDirector(id, updateDirectorDto)).rejects.toThrow(NotFoundException)

      expect(directorService.findOneDirector).toHaveBeenCalledWith(id)
    })
  })

  describe('deleteDirector', () => {
    const id = 1

    it('should delete director', async () => {
      // given
      const deleteDirectorDto = {
        name: 'deleteDirector',
        dob: new Date(1990, 1, 1),
        nationality: 'Korean'
      }

      const director = {id, ...deleteDirectorDto} as Director

      jest.spyOn(directorService, 'findOneDirector').mockResolvedValue(director)

      // when
      const result = await directorService.deleteDirector(id)

      // then
      expect(result).toBeUndefined()
      /** 위 두 줄과 같은 의미, 반환하지 않는 함수에 사용 */
      // await expect(directorService.deleteDirector(id)).resolves.toBeUndefined()

      expect(directorService.findOneDirector).toHaveBeenCalledWith(id)
    })

    it('should throw NotFoundException if director is not found', async () => {
      // given
      jest.spyOn(directorService, 'findOneDirector').mockResolvedValue(null)

      // when & then
      await expect(directorService.deleteDirector(id)).rejects.toThrow(NotFoundException)

      expect(directorService.findOneDirector).toHaveBeenCalledWith(id)
    })
  })
})
