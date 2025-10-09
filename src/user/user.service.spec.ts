import { Test, TestingModule } from '@nestjs/testing'
import { UserService } from './user.service'
import { DataSource } from 'typeorm'
import { getRepositoryToken } from '@nestjs/typeorm'
import { User } from './entities/user.entity'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { CreateUserDto } from './dto/create-user.dto'
import * as bcrypt from 'bcrypt'
import { plainToInstance } from 'class-transformer'

const mockUsers = [
  {
    id: 1,
    email: 'test1@test.com',
    password: '1234',
  },
  {
    id: 2,
    email: 'test2@test.com',
    password: '1234',
  },
  {
    id: 3,
    email: 'test3@test.com',
    password: '1234',
  },
] as const

const mockConfigService = {
  get: jest.fn(),
}

const mockQueryBuilder = {
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  execute: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  into: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),

  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([mockUsers, mockUsers.length]),
}

const mockQueryRunner = {
  connect: jest.fn(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
  release: jest.fn(),
  manager: {
    save: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  },
}

const mockUserRepository = {
  createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  find: jest.fn(),
  findOneBy: jest.fn(),
  delete: jest.fn(),
}

const mockDataSource = {
  transaction: jest.fn((cb) => cb({
    getRepository: () => mockUserRepository,
  })),
  // 필요한 경우 manager나 queryRunner도 흉내낼 수 있음
  createQueryRunner: jest.fn(() => mockQueryRunner),
  manager: {
    save: jest.fn(),
    findOne: jest.fn(),
  },
} as unknown as DataSource

describe('UserService', () => {
  let userService: UserService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile()

    userService = module.get<UserService>(UserService)
  })

  afterEach(() => {
    // it 을 기반으로 테스트가 끝날때 마다 함수 호출 기록을 초기화
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(userService).toBeDefined()
  })

  describe('createUser', () => {
    const email = 'test4@test.com' as const
    const createUserDto: CreateUserDto = {
      email,
      password: '1234',
    } as const

    const id = mockUsers.length + 1
    const hashRounds = 10
    const hashedPassword = 'hashRandomWord'
    const createdUser = {
      id: mockUsers.length + 1,
      ...createUserDto,
    }

    it('should create an user and return it', async () => {
      // given
      jest.spyOn(mockUserRepository, 'findOneBy').mockResolvedValueOnce(null)
      jest.spyOn(mockConfigService, 'get').mockReturnValue(hashRounds)
      jest.spyOn(bcrypt, 'hash').mockImplementation((password, hashRounds) => hashedPassword)
      jest.spyOn(mockUserRepository, 'findOneBy').mockResolvedValueOnce({
        id,
        ...createUserDto,
      })

      // when
      const result = await userService.createUser(createUserDto)

      // then
      expect(result).toEqual(createdUser)

      expect(mockUserRepository.findOneBy).toHaveBeenNthCalledWith(1, { email })
      expect(mockConfigService.get).toHaveBeenCalledWith(expect.anything())
      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, hashRounds)
      expect(mockQueryRunner.connect).toHaveBeenCalled()
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled()
      expect(mockQueryBuilder.insert).toHaveBeenCalled()
      expect(mockQueryBuilder.into).toHaveBeenCalled()
      expect(mockQueryBuilder.values).toHaveBeenCalled()
      expect(mockQueryBuilder.execute).toHaveBeenCalled()
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled()
      expect(mockQueryRunner.release).toHaveBeenCalled()
      expect(mockUserRepository.findOneBy).toHaveBeenLastCalledWith({ email })
    })

    it('should throw BadRequestException if email exists once create user', async () => {
      // given
      jest.spyOn(mockUserRepository, 'findOneBy').mockResolvedValue({ id, ...createUserDto })

      // when & then
      await expect(userService.createUser(createUserDto)).rejects.toThrow(BadRequestException)

      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ email })
    })

    it('should create an user and return it', async () => {
      // given
      jest.spyOn(mockUserRepository, 'findOneBy').mockResolvedValueOnce(null)
      jest.spyOn(mockConfigService, 'get').mockReturnValue(hashRounds)
      jest.spyOn(bcrypt, 'hash').mockImplementation((password, hashRounds) => hashedPassword)
      jest.spyOn(mockQueryBuilder, 'insert').mockImplementation(() => {
        throw new BadRequestException('testing')
      })

      // when & then
      await expect(userService.createUser(createUserDto)).rejects.toThrow(BadRequestException)

      expect(mockQueryRunner.connect).toHaveBeenCalled()
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled()
      expect(mockQueryBuilder.insert).toHaveBeenCalled()
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled()
      expect(mockQueryRunner.release).toHaveBeenCalled()
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ email })
    })
  })

  describe('updateUser', () => {
    const id = 1
    const updateData = { email: 'testtest@email.com', password: 'password' }
    const user = mockUsers.find((user) => user.id === id)
    const updatedUser = { ...user, ...updateData } as const

    const hashRounds = 10
    const hashedPassword = 'hashRandomWord'

    it('should update specific user', async () => {
      // given
      jest.spyOn(mockUserRepository, 'findOneBy')
        .mockResolvedValueOnce(user)     // first call: 기존 유저 조회
        .mockResolvedValueOnce(updatedUser) // second call: 업데이트 후 조회
      // config는 동기값으로 반환 (서비스가 await 하지 않을 수도 있으므로)
      jest.spyOn(mockConfigService, 'get').mockReturnValue(hashRounds)
      // bcrypt.hash는 실제 코드에서 await 하므로 Promise 반환 mock으로 맞춰줌
      jest.spyOn(bcrypt, 'hash').mockImplementation((password, hashRounds) => hashedPassword)

      // when
      const result = await userService.updateUser(id, updateData)

      // then
      expect(result).toEqual(updatedUser)
      expect(mockUserRepository.findOneBy).toHaveBeenNthCalledWith(1, { id })
      expect(mockConfigService.get).toHaveBeenCalledWith(expect.anything())
      expect(bcrypt.hash).toHaveBeenCalledWith(updateData.password, hashRounds)
      expect(mockQueryRunner.connect).toHaveBeenCalled()
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled()
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(User)
      expect(mockQueryBuilder.set).toHaveBeenCalledWith(expect.objectContaining({ email: updateData.email, password: hashedPassword }))
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id })
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled()
      expect(mockQueryRunner.release).toHaveBeenCalled()
      expect(mockUserRepository.findOneBy).toHaveBeenLastCalledWith({ id })
    })

    it('should throw NotFoundException if user to update is not found', async () => {
      // given
      jest.spyOn(mockUserRepository, 'findOneBy').mockResolvedValue(null)

      // when & then
      await expect(userService.updateUser(id, updateData)).rejects.toThrow(NotFoundException)

      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ id })
    })

    it('should throw error/exception if creating user fails', async () => {
      // given
      jest.spyOn(mockUserRepository, 'findOneBy').mockResolvedValue(user)
      jest.spyOn(mockConfigService, 'get').mockReturnValue(hashRounds)
      jest.spyOn(bcrypt, 'hash').mockImplementation((password, hashRounds) => hashedPassword)
      jest.spyOn(mockQueryBuilder, 'update').mockImplementation(() => {
        throw new Error('testing')
      })

      // when & then
      await expect(userService.updateUser(id, updateData)).rejects.toThrow(Error)

      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ id })
      expect(mockConfigService.get).toHaveBeenCalledWith(expect.anything())
      expect(bcrypt.hash).toHaveBeenCalledWith(updateData.password, hashRounds)
      expect(mockQueryRunner.connect).toHaveBeenCalled()
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled()
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(User)
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled()
      expect(mockQueryRunner.release).toHaveBeenCalled()
    })
  })

  describe('deleteUser', () => {
    it('should delete user', async () => {
      // given
      const id = 1

      let localMockUsers = [...mockUsers]

      const user = localMockUsers.find(user => user.id === id)

      // when
      jest.spyOn(mockUserRepository, 'findOneBy').mockResolvedValue(user)
      jest.spyOn(mockUserRepository, 'delete').mockImplementation(async (userId) => {
        localMockUsers = localMockUsers.filter((user) => user.id !== userId)

        return { affected: 1 }
      })

      const result = await userService.deleteUser(id)

      // then
      expect(result).toBe(id)

      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ id })
      expect(mockUserRepository.delete).toHaveBeenCalledWith(id)

      expect(localMockUsers.length).toBe(2)
    })

    it('should throw a NotFoundException if user not found to delete user', async () => {
      // given
      const id = 999

      let localMockUsers = [...mockUsers]

      // when
      jest.spyOn(mockUserRepository, 'findOneBy').mockResolvedValue(null)

      // then
      await expect(userService.deleteUser(id)).rejects.toThrow(NotFoundException)

      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ id })

      expect(localMockUsers.length).toBe(3)
    })
  })

  describe('deleteUserWithTransaction', () => {
    it('should delete user', async () => {
      // given
      const id = 1

      let localMockUsers = [...mockUsers]

      const user = localMockUsers.find(user => user.id === id)

      // when
      jest.spyOn(mockUserRepository, 'findOneBy').mockResolvedValue(user)

      // 체이닝용 mock 재설정
      jest.spyOn(mockQueryBuilder, 'delete').mockReturnThis()
      jest.spyOn(mockQueryBuilder, 'from').mockReturnThis()
      jest.spyOn(mockQueryBuilder, 'where').mockReturnThis()
      jest.spyOn(mockQueryBuilder, 'execute').mockImplementation(async () => {
        localMockUsers = localMockUsers.filter(u => u.id !== id)
        return { affected: 1 }
      })

      const result = await userService.deleteUserWithTransaction(id)

      // then
      expect(result).toBe(id)

      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ id })
      expect(mockQueryBuilder.delete).toHaveBeenCalled()
      expect(mockQueryBuilder.from).toHaveBeenCalledWith(User)
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id })
      expect(mockQueryBuilder.execute).toHaveBeenCalled()

      expect(localMockUsers.length).toBe(2)
    })

    it('should throw a NotFoundException if user not found to delete user', async () => {
      // given
      const id = 999

      let localMockUsers = [...mockUsers]

      // when
      jest.spyOn(mockUserRepository, 'findOneBy').mockResolvedValue(null)

      // then
      await expect(userService.deleteUserWithTransaction(id)).rejects.toThrow(NotFoundException)

      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ id })
      expect(mockQueryRunner.connect).toHaveBeenCalled()
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled()
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled()
      expect(mockQueryRunner.release).toHaveBeenCalled()

      expect(localMockUsers.length).toBe(3)
    })
  })
})
