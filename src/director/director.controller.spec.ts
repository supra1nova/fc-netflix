import { Test, TestingModule } from '@nestjs/testing'
import { DirectorController } from './director.controller'
import { DirectorService } from './director.service'
import { Director } from './entity/director.entity'
import { CreateDirectorDto } from './dto/create-director.dto'
import { UpdateDirectorDto } from './dto/update-director.dto'

const mockDirectorService = {
  findListDirector: jest.fn(),
  findOneDirector: jest.fn(),
  createDirector: jest.fn(),
  updateDirector: jest.fn(),
  deleteDirector: jest.fn(),
}

describe('DirectorController', () => {
  let directorController: DirectorController
  let directorService: DirectorService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DirectorController],
      providers: [
        {
          provide: DirectorService,
          useValue: mockDirectorService,
        },
      ],
    }).compile()

    directorController = module.get<DirectorController>(DirectorController)
    directorService = module.get<DirectorService>(DirectorService)
  })

  it('should be defined', () => {
    expect(directorController).toBeDefined()
  })

  describe('getListDirector', () => {
    const directors = [
      { id: 1, name: 'director1' },
      { id: 2, name: 'director2' },
      { id: 3, name: 'director3' },
    ] as Director[]

    it('should return list of all director', async () => {
      // given

      jest.spyOn(mockDirectorService, 'findListDirector').mockResolvedValue(directors)

      // when
      const result = await directorController.getListDirector()

      // then
      expect(result).toEqual(directors)

      expect(mockDirectorService.findListDirector).toHaveBeenCalled()
    })

    it('should return list of directors with specific name', async () => {
      // given
      const name = '1'

      const filteredDirectors = directors.filter((director) => director.name.includes(name))

      jest.spyOn(mockDirectorService, 'findListDirector').mockResolvedValue(filteredDirectors)

      // when
      const result = await directorController.getListDirector(name)

      // then
      expect(result).toEqual(filteredDirectors)

      expect(mockDirectorService.findListDirector).toHaveBeenCalledWith(name)
    })
  })

  describe('getOneDirector', () => {
    it('should return user with specific id', async () => {
      // given
      const id = 1
      const director = {
        id,
        dob: new Date(1990, 1, 1),
        nationality: 'Korean',
      } as Director

      jest.spyOn(mockDirectorService, 'findOneDirector').mockResolvedValue(director)

      // when
      const result = await directorController.getOneDirector(id)

      // then
      expect(result).toEqual(director)

      expect(mockDirectorService.findOneDirector).toHaveBeenCalledWith(id)
    })
  })

  describe('postDirector', () => {
    it('should return director info after creation', async () => {
      // given
      const createDirectorDto = {
        name: 'createDirector',
        dob: new Date(1990, 1, 1),
      } as CreateDirectorDto
      const director = { id: 1, ...createDirectorDto } as Director

      jest.spyOn(mockDirectorService, 'createDirector').mockResolvedValue(director)

      // when
      const result = await directorController.postDirector(createDirectorDto)

      // then
      expect(result).toEqual(director)

      expect(mockDirectorService.createDirector).toHaveBeenCalledWith(createDirectorDto)
    })
  })

  describe('patchDirector', () => {
    it('should return director info after update', async () => {
      // given
      const id = 1
      const updateDirectorDto = {
        name: 'createDirector',
        dob: new Date(1990, 1, 1),
      } as UpdateDirectorDto
      const director = { id, ...updateDirectorDto } as Director

      jest.spyOn(mockDirectorService, 'updateDirector').mockResolvedValue(director)

      // when
      const result = await directorController.patchDirector(id, updateDirectorDto)

      // then
      expect(result).toEqual(director)

      expect(mockDirectorService.updateDirector).toHaveBeenCalledWith(id, updateDirectorDto)
    })
  })

  describe('deleteDirector', () => {
    it('should delete director', async () => {
      // given
      const id = 1

      jest.spyOn(mockDirectorService, 'deleteDirector').mockResolvedValue(undefined)

      // when
      const result = await directorController.deleteDirector(id)

      // then
      expect(result).toBeUndefined()

      expect(mockDirectorService.deleteDirector).toHaveBeenCalledWith(id)
    })
  })
})
