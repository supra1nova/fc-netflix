import { Test, TestingModule } from '@nestjs/testing'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { Role, User } from '../user/entities/user.entity'
import { Request } from 'express'

const mockAuthService = {
  signUpUser: jest.fn(),
  signInUser: jest.fn(),
  issueToken: jest.fn(),
  blockToken: jest.fn(),
}

describe('AuthController', () => {
  let authController: AuthController
  let authService: AuthService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile()

    authController = module.get<AuthController>(AuthController)
    authService = module.get<AuthService>(AuthService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(authController).toBeDefined()
  })

  describe('signUpUser', () => {
    it('should return user info after sign up', async () => {
      // given
      const token = 'token'

      const user = {
        id: 1,
        email: 'test1@test.com',
        password: '1234',
        role: Role.USER,
      } as User

      jest.spyOn(mockAuthService, 'signUpUser').mockResolvedValue(user)

      // when
      const result = await authController.signUpUser(token)

      // then
      expect(result).toEqual(user)

      expect(mockAuthService.signUpUser).toHaveBeenCalledWith(token)
    })
  })

  describe('signInUser', () => {
    it('should return user info after sign in', async () => {
      // given
      const token = 'token'

      const refreshToken = 'refreshToken'
      const accessToken = 'accessToken'

      jest.spyOn(mockAuthService, 'signInUser').mockResolvedValue({ refreshToken, accessToken })

      // when
      const result = await authController.signInUser(token)

      // then
      expect(result).toEqual({ refreshToken, accessToken })

      expect(mockAuthService.signInUser).toHaveBeenCalledWith(token)
    })
  })

  describe('rotateAccessToken', () => {
    it('should return new access token', async () => {
      // given
      const user = { sub: 1, role: Role.USER }
      const req = { user } as unknown as Request

      const accessToken = 'accessToken'

      jest.spyOn(mockAuthService, 'issueToken').mockResolvedValue(accessToken)

      // when
      const result = await authController.rotateAccessToken(req)

      // then
      expect(result).toEqual({ accessToken })

      expect(mockAuthService.issueToken).toHaveBeenCalledWith(user, false)
    })
  })

  describe('blockToken', () => {
    it('should return true after block specific user token', async () => {
      // given
      const token = 'token'

      jest.spyOn(mockAuthService, 'blockToken').mockReturnValue(true)

      // when
      const result = await authController.blockToken(token)

      // then
      expect(result).toBe(true)

      expect(mockAuthService.blockToken).toHaveBeenCalledWith(token)
    })
  })

  describe('signInUserPassport', () => {
    it('should return refresh/access token', async () => {
      // given
      const user = { sub: 1, role: Role.USER }
      const req = { user } as unknown as Request
      const token = 'token'

      jest.spyOn(mockAuthService, 'issueToken').mockResolvedValue(token)

      // when
      const result = await authController.signInUserPassport(req)

      // then
      expect(result).toEqual({ refreshToken: token, accessToken: token })

      expect(mockAuthService.issueToken).toHaveBeenNthCalledWith(1, user)
      expect(mockAuthService.issueToken).toHaveBeenLastCalledWith(user, false)
      expect(mockAuthService.issueToken).toHaveBeenCalledTimes(2)
    })
  })

  describe('private', () => {
    it('should return user info', async () => {
      // given
      const user = { sub: 1, role: Role.USER }
      const req = { user } as unknown as Request

      // when
      const result = authController.private(req)

      // then
      expect(result).toEqual(user)
    })
  })
})
