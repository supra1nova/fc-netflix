import { Test, TestingModule } from '@nestjs/testing'
import { UserController } from './user.controller'
import { UserService } from './user.service'
import { User } from './entities/user.entity'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'

const mockUsers = [
  {
    id: 1,
    email: 'test1@test.com',
    password: 'password',
  },
  {
    id: 2,
    email: 'test2@test.com',
    password: 'password',
  },
  {
    id: 3,
    email: 'test3@test.com',
    password: 'password',
  },
]

const mockedUserService = {
  findAllUsers: jest.fn(),
  findOneUser: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
}

describe('UserController', () => {
  let userController: UserController
  let userService: UserService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockedUserService,
        },
      ],
    }).compile()

    userController = module.get<UserController>(UserController)
    userService = module.get<UserService>(UserService)
  })

  afterEach(async () => {
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(userController).toBeDefined()
  })

  describe('getAllUser', () => {
    it('should return list of all users', async () => {
      // given
      /** 값을 실제 반환하는 것 보다 테스트에 목적이 있으므로 as User[] 로 처리함 */
      jest.spyOn(mockedUserService, 'findAllUsers').mockReturnValue(mockUsers as User[])

      // when
      const result = await userController.getAllUsers()

      // then
      expect(result).toEqual(mockUsers)
      expect(mockedUserService.findAllUsers).toHaveBeenCalled()
    })

    it('should return the list of users whose email contains a specific string', async () => {
      const email = 'test1'
      let localUsers: {
        id: number,
        email: string,
        password: string,
      }[] | null = null

      // given
      jest.spyOn(mockedUserService, 'findAllUsers').mockImplementation((searchEmail?: string | null) => {
        if (searchEmail) {
          localUsers = mockUsers.filter(user => user.email.includes(searchEmail))
          return localUsers as User[]
        }
        return mockUsers as User[]
      })

      // when
      const result = await userController.getAllUsers(email)

      // then
      expect(result).toEqual(localUsers)
      expect(mockedUserService.findAllUsers).toHaveBeenCalledWith(email)
    })
  })

  describe('getOneUser', () => {
    it('should return user with specific id', async () => {
      // given
      const id = 2
      const foundUser = mockUsers.find((user) => user.id === id)

      jest.spyOn(mockedUserService, 'findOneUser').mockReturnValue(foundUser as User)

      // when
      const result = await userController.getOneUser(id)

      // then
      expect(result).toEqual(foundUser)
      expect(mockedUserService.findOneUser).toHaveBeenCalledWith(id)
    })
  })

  describe('createUser', () => {
    const createUserDto: CreateUserDto = {
      email: 'newUser4@test.com',
      password: 'password',
    }

    const newUser = {
      id: mockUsers.length + 1,
      ...createUserDto,
    }

    it('should return the created user info after creating user', async () => {
      // given
      /** 값을 실제 반환하는 것 보다 테스트에 목적이 있으므로 createDto as User 로 처리함 */
      jest.spyOn(mockedUserService, 'createUser').mockResolvedValue(newUser as User)

      // when
      const result = await userController.createUser(createUserDto)

      // then
      expect(result).toEqual(newUser)

      expect(mockedUserService.createUser).toHaveBeenCalledWith(createUserDto)
    })
  })

  describe('updateUser', () => {
    it('should return user info after updating user', async () => {
      // given
      const id = 3
      const updateUserDto = {
        email: 'new-test@test.com',
        password: 'password',
      } as UpdateUserDto

      const tgtUser = mockUsers.find((user) => user.id === id)
      const updatedUser = { ...tgtUser, ...updateUserDto } as User

      jest.spyOn(userService, 'updateUser').mockResolvedValue(updatedUser)

      // then
      const result = await userController.updateUser(id, updateUserDto)

      // when
      expect(result).toEqual(updatedUser)

      expect(mockedUserService.updateUser).toHaveBeenCalledWith(id, updateUserDto)
    })
  })

  describe('deleteUser', () => {
    it('should return user id after delete user', async () => {
      // given
      const id = 3
      let localUsers: User[] | null = null

      jest.spyOn(mockedUserService, 'deleteUser').mockImplementation((id: number) => {
        localUsers = mockUsers.filter((user) => user.id !== id) as User[]
        return id
      })

      // when
      const result = await userController.deleteUser(id)

      // then
      expect(result).toEqual(id)

      expect(mockedUserService.deleteUser).toHaveBeenCalledWith(id)
    })
  })
})
