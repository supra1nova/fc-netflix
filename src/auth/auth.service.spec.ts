import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from './auth.service'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Role, User } from '../user/entities/user.entity'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { UserService } from '../user/user.service'
import { Repository } from 'typeorm'
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager'
import { BadRequestException } from '@nestjs/common'
import { CreateUserDto } from '../user/dto/create-user.dto'
import { ConstVariable } from '../common/const/const-variable'
import * as bcrypt from 'bcrypt'

const mockUserRepository = {
  findOneBy: jest.fn(),
}

const mockConfigService = {
  get: jest.fn(),
}

const mockJwtService = {
  signAsync: jest.fn(),
  verifyAsync: jest.fn(),
  decode: jest.fn(),
}

const mockCacheManager = {
  set: jest.fn(),
}

const mockUserService = {
  createUser: jest.fn(),
}

const encodeToBasicToken = function(email: string, password: string, isBasic: boolean = true, isSeparatorColon: boolean = true) {
  const basic = isBasic ? 'Basic' : 'Wrong'
  const separator = isSeparatorColon ? ':' : '-'

  const base64String = Buffer.from(`${email}${separator}${password}`).toString('base64')

  return `${basic} ${base64String}`
}

describe('AuthService', () => {
  let authService: AuthService
  let userRepository: Repository<User>
  let configService: ConfigService
  let jwtService: JwtService
  let cacheManager: Cache
  let userService: UserService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          // @Inject(CACHE_MANAGER) 로 DI 한 것이므로 CACHE_MANAGER 로 provide 필요
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile()

    authService = module.get<AuthService>(AuthService)
    userRepository = module.get<Repository<User>>(getRepositoryToken(User))
    configService = module.get<ConfigService>(ConfigService)
    jwtService = module.get<JwtService>(JwtService)
    cacheManager = module.get<Cache>(CACHE_MANAGER)
    userService = module.get<UserService>(UserService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(authService).toBeDefined()
  })

  describe('signUpUser', () => {
    it('should return user info after create user ', async () => {
      // given
      const email = 'user1@test.com'
      const password = '1234'

      const rawToken = encodeToBasicToken(email, password)
      const createUserDto = { email, password } as CreateUserDto
      const newUser = { id: 1, email, password } as User

      jest.spyOn(authService, 'parseBasicToken').mockReturnValue(createUserDto)
      jest.spyOn(mockUserService, 'createUser').mockResolvedValue(newUser)

      // when
      const result = await authService.signUpUser(rawToken)

      // then
      expect(result).toEqual(newUser)

      expect(authService.parseBasicToken).toHaveBeenCalledWith(rawToken)
      expect(userService.createUser).toHaveBeenCalledWith(createUserDto)
    })
  })

  describe('signInUser', () => {
    it('should return access/refreshTokens ', async () => {
      // given
      const rawToken = 'testRawToken'
      const email = 'test1@test.com'
      const password = '1234'
      const user = { email, password }
      const userFound = { id: 1, email, password, role: Role.USER } as User

      const sub = userFound.id
      const role = userFound.role
      const mockedToken = 'mockedToken'

      const refreshTokenSecret = 'rSecret'
      const refreshTokenType = 'refresh'
      const refreshExpiresIn = '24h'

      const accessTokenSecret = 'aSecret'
      const accessTokenType = 'access'
      const accessExpiresIn = 60 * 5

      jest.spyOn(authService, 'parseBasicToken').mockReturnValue(user)
      jest.spyOn(authService, 'authenticate').mockResolvedValue(userFound)
      jest.spyOn(mockConfigService, 'get')
        .mockReturnValueOnce(refreshTokenSecret)
        .mockReturnValueOnce(accessTokenSecret)
      jest.spyOn(mockJwtService, 'signAsync')
        .mockResolvedValue(mockedToken)

      // when
      const result = await authService.signInUser(rawToken)

      // then
      expect(result).toEqual({ refreshToken: mockedToken, accessToken: mockedToken })
      expect(authService.parseBasicToken).toHaveBeenCalledWith(rawToken)
      expect(authService.authenticate).toHaveBeenCalledWith(email, password)
      expect(configService.get).toHaveBeenNthCalledWith(1, ConstVariable.REFRESH_TOKEN_SECRET)
      expect(configService.get).toHaveBeenLastCalledWith(ConstVariable.ACCESS_TOKEN_SECRET)
      expect(configService.get).toHaveBeenCalledTimes(2)
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(1, { sub, role, type: refreshTokenType }, { secret: refreshTokenSecret, expiresIn: refreshExpiresIn })
      expect(jwtService.signAsync).toHaveBeenLastCalledWith({ sub, role, type: accessTokenType }, { secret: accessTokenSecret, expiresIn: accessExpiresIn })
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2)
    })
  })

  describe('authenticate', () => {
    const email = 'test1@test.com'
    const password = '1234'
    const hashedPassword = 'abcd'

    it('should return user info after authenticate', async () => {
      // given

      const foundUser = { email, password: hashedPassword } as User

      jest.spyOn(mockUserRepository, 'findOneBy').mockResolvedValue(foundUser)
      jest.spyOn(bcrypt, 'compare').mockImplementation((password, hashedPassword) => true)

      // when
      const result = await authService.authenticate(email, password)

      // then
      expect(result).toEqual(foundUser)

      expect(userRepository.findOneBy).toHaveBeenCalledWith({ email })
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword)
    })

    it('should throw BadRequestException if user is not found', async () => {
      // given
      jest.spyOn(mockUserRepository, 'findOneBy').mockResolvedValue(null)

      // when & then
      await expect(authService.authenticate(email, password)).rejects.toThrow(BadRequestException)

      expect(userRepository.findOneBy).toHaveBeenCalledWith({ email })
    })

    it('should throw BadRequestException if the password does not match', async () => {
      const foundUser = { email, password: hashedPassword } as User

      jest.spyOn(mockUserRepository, 'findOneBy').mockResolvedValue(foundUser)
      jest.spyOn(bcrypt, 'compare').mockImplementation((password, hashedPassword) => false)

      // when
      await expect(authService.authenticate(email, password)).rejects.toThrow(BadRequestException)

      expect(userRepository.findOneBy).toHaveBeenCalledWith({ email })
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword)
    })
  })

  describe('issueToken', () => {
    const sub = 1
    const role = Role.USER
    const userObj = { sub, role }
    const secret = 'secret'
    const token = 'token'

    beforeEach(async () => {
      jest.spyOn(mockConfigService, 'get').mockReturnValue(secret)
      jest.spyOn(mockJwtService, 'signAsync').mockResolvedValue(token)
    })

    it('should issue refresh token without offering isRefreshToken boolean value', async () => {
      // given
      const type = 'refresh'
      const expiresIn = '24h'

      // when
      const result = await authService.issueToken(userObj)

      // then
      expect(result).toEqual(token)

      expect(configService.get).toHaveBeenCalledWith(ConstVariable.REFRESH_TOKEN_SECRET)
      expect(jwtService.signAsync).toHaveBeenCalledWith({ sub, role, type }, { secret, expiresIn })
    })

    it('should issue refresh token', async () => {
      // given
      const isRefreshToken = true
      const type = 'refresh'
      const expiresIn = '24h'

      // when
      const result = await authService.issueToken(userObj, isRefreshToken)

      // then
      expect(result).toEqual(token)

      expect(configService.get).toHaveBeenCalledWith(ConstVariable.REFRESH_TOKEN_SECRET)
      expect(jwtService.signAsync).toHaveBeenCalledWith({ sub, role, type }, { secret, expiresIn })
    })

    it('should issue access token', async () => {
      // given
      const isRefreshToken = false
      const type = 'access'
      const expiresIn = 60 * 5

      // when
      const result = await authService.issueToken(userObj, isRefreshToken)

      // then
      expect(result).toEqual(token)

      expect(configService.get).toHaveBeenCalledWith(ConstVariable.ACCESS_TOKEN_SECRET)
      expect(jwtService.signAsync).toHaveBeenCalledWith({ sub, role, type }, { secret, expiresIn })
    })
  })

  describe('tokenBlock', () => {
    const token = 'token'

    it('should return true after block specific token ', async () => {
      // given
      const payload = {
        exp: Math.floor(Date.now() / 1000) + 60,
      }

      jest.spyOn(mockJwtService, 'decode').mockReturnValue(payload)

      // when
      const result = await authService.blockToken(token)

      // then
      expect(result).toBe(true)

      expect(mockJwtService.decode).toHaveBeenCalledWith(token)
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        `BLOCK_TOKEN_${token}`,
        payload,
        expect.any(Number),
      )
    })

    it('should throw BadRequestException if token not exist ', async () => {
      // given
      jest.spyOn(mockJwtService, 'decode').mockReturnValue(null)

      // when & then
      await expect(authService.blockToken(token)).rejects.toThrow(BadRequestException)

      expect(mockJwtService.decode).toHaveBeenCalledWith(token)
    })
  })

  describe('parseBasicToken', () => {
    const email = 'user1@test.com'
    const password = '1234'

    it('should parse valid basic token and return user info containing email and password', async () => {
      // given
      const rawToken = encodeToBasicToken(email, password)
      const userInfo = { email, password }

      // when
      const result = authService.parseBasicToken(rawToken)

      // then
      expect(result).toEqual(userInfo)
    })

    it('should throw BadRequestException if rawToken cannot be separated by \'-\' before creating user ', async () => {
      // given
      const rawToken = 'awefawefawefawefew'

      // when & then
      /**
       * 비동기 환경에서 던져지는 에러가 아니면 expect 내부에서 별도로 함수 호출을 해야함
       * () => authService.parseBasicToken(rawToken)
       * */
      expect(() => authService.parseBasicToken(rawToken)).toThrow(BadRequestException)
    })

    it('should throw BadRequestException if rawToken prefix is not starting with \'basic\' before creating user ', async () => {
      // given
      const rawToken = encodeToBasicToken(email, password, false)

      // when & then
      expect(() => authService.parseBasicToken(rawToken)).toThrow(BadRequestException)
    })

    it('should throw BadRequestException if rawToken separator is not \':\' before creating user ', async () => {
      // given
      const rawToken = encodeToBasicToken(email, password, true, false)

      // when & then
      expect(() => authService.parseBasicToken(rawToken)).toThrow(BadRequestException)
    })
  })
})
