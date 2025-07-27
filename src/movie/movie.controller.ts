import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common'
import { MovieService } from './movie.service'
import { CreateMovieDto } from './dto/create-movie.dto'
import { UpdateMovieDto } from './dto/update-movie.dto'
import { MovieTitleValidationPipe } from './pipe/movie-title-validation.pipe'
import { Public } from '../auth/decorator/public.decorator'
import { RBAC } from '../auth/decorator/rbac.decorator'
import { Role } from '../user/entities/user.entity'

@Controller('movie')
@UseInterceptors(ClassSerializerInterceptor)
export class MovieController {
  constructor(private readonly movieService: MovieService) {}

  @Get()
  @Public()
  getListMovie(@Query('title', MovieTitleValidationPipe) title?: string) {
    return this.movieService.findListMovie(title)
  }

  @Get(':id')
  @Public()
  // getOneMovie(@Param('id', ParseIntPipe) id: number) {
  getOneMovie(
    @Param(
      'id',
      new ParseIntPipe({
        exceptionFactory(error) {
          throw new BadRequestException('숫자를 입력해주세요')
        },
      }),
    )
    id: number,
  ) {
    return this.movieService.findOneMovie(id)
  }

  @Post()
  @RBAC(Role.admin)
  postMovie(@Body() createMovieDto: CreateMovieDto) {
    return this.movieService.createMovie(createMovieDto)
  }

  @Patch(':id')
  @RBAC(Role.admin)
  patchMovie(@Param('id', new ParseIntPipe()) id: number, @Body() updateMovieDto: UpdateMovieDto) {
    return this.movieService.updateMovie(+id, updateMovieDto)
  }

  @Delete(':id')
  @RBAC(Role.admin)
  deleteMovie(@Param('id', new ParseIntPipe()) id: number) {
    return this.movieService.deleteMovie(+id)
  }
}
