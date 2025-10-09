import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
  Query,
} from '@nestjs/common'
import { UserService } from './user.service'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger'

@Controller('user')
@ApiBearerAuth()
@UseInterceptors(ClassSerializerInterceptor)
export class UserController {
  constructor(private readonly userService: UserService) {
  }

  @Get()
  @ApiQuery({
    name: 'email',
    required: false,
    description: '검색할 이메일',
    example: 'test1',
  })
  getAllUsers(@Query('email') email?: string | null) {
    return this.userService.findAllUsers(email)
  }

  @Get(':id')
  getOneUser(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findOneUser(id)
  }

  @Post()
  async postUser(@Body() createUserDto: CreateUserDto) {
    return await this.userService.createUser(createUserDto)
  }

  @Patch(':id')
  async updateUser(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: UpdateUserDto) {
    return await this.userService.updateUser(id, updateUserDto)
  }

  @Delete(':id')
  async deleteUser(@Param('id', ParseIntPipe) id: number) {
    return await this.userService.deleteUser(id)
  }

  @Delete('delete/:id')
  async deleteUserWithTransaction(@Param('id', ParseIntPipe) id: number) {
    return await this.userService.deleteUserWithTransaction(id)
  }
}
