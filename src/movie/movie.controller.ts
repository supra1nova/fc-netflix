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

@Controller('movie')
@UseInterceptors(ClassSerializerInterceptor)
export class MovieController {
  constructor(private readonly movieService: MovieService) {}

  @Get()
  getListMovie(@Query('title') title?: string) {
    return this.movieService.findListMovie(title)
  }

  @Get(':id')
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
  postMovie(@Body() createMovieDto: CreateMovieDto) {
    return this.movieService.createMovie(createMovieDto)
  }

  @Patch(':id')
  patchMovie(@Param('id', new ParseIntPipe()) id: number, @Body() updateMovieDto: UpdateMovieDto) {
    return this.movieService.updateMovie(+id, updateMovieDto)
  }

  @Delete(':id')
  deleteMovie(@Param('id', new ParseIntPipe()) id: number) {
    return this.movieService.deleteMovie(+id)
  }
}
