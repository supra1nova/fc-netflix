import { Test, TestingModule } from '@nestjs/testing'
import { UserService } from './user.service'
import { DataSource } from 'typeorm'
import { getRepositoryToken } from '@nestjs/typeorm'
import { User } from './entities/user.entity'

const mockUserRepository = {
  findOne: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
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
  let service: UserService

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

    service = module.get<UserService>(UserService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
