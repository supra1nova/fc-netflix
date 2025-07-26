import { Module } from '@nestjs/common'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { User } from '../user/entities/user.entity'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtModule } from '@nestjs/jwt'
import { LocalStrategy } from './strategy/local.strategy'
import { JwtStrategy } from './strategy/jwt.strategy'

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    // jwtNoduleOptions 의 경우 각 토큰마다 옵션값을 다르게 적용해야하므로(secret, 만료시간 등) 개별 토큰 생성시 설정
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
