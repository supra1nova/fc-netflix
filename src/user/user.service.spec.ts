import { Test, TestingModule } from '@nestjs/testing'
import { UserService } from './user.service'
import { DataSource } from 'typeorm'
import { getRepositoryToken } from '@nestjs/typeorm'
import { User } from './entities/user.entity'
import { NotFoundException } from '@nestjs/common'

const mockUsers = [
  {
    id: 1,
    email: 'test1@test.com',
  },
  {
    id: 2,
    email: 'test2@test.com',
  },
  {
    id: 3,
    email: 'test3@test.com',
  },
] as const

const mockQueryBuilder = {
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([mockUsers, mockUsers.length]),
}

const mockUserRepository = {
  createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  find: jest.fn(),
  findOneBy: jest.fn(),
}

const mockDataSource = {
  transaction: jest.fn((cb) => cb({
    getRepository: () => mockUserRepository,
  })),
  // 필요한 경우 manager나 queryRunner도 흉내낼 수 있음
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
      ],
    }).compile()

    userService = module.get<UserService>(UserService)
  })

  it('should be defined', () => {
    expect(userService).toBeDefined()
  })

  describe('findAllUsers', () => {
    it('should return all users without email', async () => {
      // given
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockUsers, mockUsers.length])

      // when
      const result = await userService.findAllUsers()

      // then
      expect(mockUserRepository.createQueryBuilder).toHaveBeenCalled()
      expect(mockQueryBuilder.orderBy).toHaveBeenCalled()
      expect(mockQueryBuilder.getManyAndCount).toHaveBeenCalled()

      expect(result).toBeDefined()
      expect(result[1]).toBe(mockUsers.length)
      expect(result[0][0]).toEqual(mockUsers[0])
    })

    it('should return specific users', async () => {
      // given
      const emailLike = 'test1'
      const filtered = mockUsers.filter(user => user.email.includes(emailLike))
      mockQueryBuilder.getManyAndCount.mockResolvedValue([filtered, filtered.length])

      // when
      const result = await userService.findAllUsers(emailLike)

      // then
      expect(mockUserRepository.createQueryBuilder).toHaveBeenCalled()
      expect(mockQueryBuilder.where).toHaveBeenCalled()
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'user.email LIKE :email',
        { email: `%${emailLike}%` },
      )
      expect(mockQueryBuilder.orderBy).toHaveBeenCalled()
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('user.createdAt', 'DESC')
      expect(mockQueryBuilder.getManyAndCount).toHaveBeenCalled()

      expect(result).toBeDefined()
      expect(result[1]).toBe(1)
      expect(result[0][0]).toEqual(mockUsers[0])
    })
  })

  describe('findOneUser', () => {
    it('should return one user', async () => {
      // given
      const id = 1

      const user = mockUsers.find(user => user.id === id)
      /** 같은 의미 - mocking 하고 있다는 것을 더 명확하게 드러냄 */
      // mockUserRepository.findOneBy.mockResolvedValue(user)
      jest.spyOn(mockUserRepository, 'findOneBy').mockResolvedValue(user)

      // when
      const result = await userService.findOneUser(id)

      //then
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ id })

      expect(result).toEqual(mockUsers[0])
    })

    it('should throw a NotFoundException if user not found', async () => {
      // given
      const id = 99

      // repository 의 findOneBy 에서 null 을 리턴하도록 세팅
      jest.spyOn(mockUserRepository, 'findOneBy').mockResolvedValue(null)

      // when
      //then
      await expect(userService.findOneUser(id)).rejects.toThrow(NotFoundException)

      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ id })
    })
  })
})
