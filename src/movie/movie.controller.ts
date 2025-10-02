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
  Query, Req,
  UseInterceptors,
} from '@nestjs/common'
import { MovieService } from './movie.service'
import { CreateMovieDto } from './dto/create-movie.dto'
import { UpdateMovieDto } from './dto/update-movie.dto'
import { Public } from '../auth/decorator/public.decorator'
import { RBAC } from '../auth/decorator/rbac.decorator'
import { Role } from '../user/entities/user.entity'
import { GetMoviesDto } from './dto/get-movies.dto'
import { TransactionInterceptor } from '../common/interceptor/transaction.interceptor'

@Controller('movie')
@UseInterceptors(ClassSerializerInterceptor)
export class MovieController {
  constructor(private readonly movieService: MovieService) {
  }

  @Get()
  @Public()
  getListMovie(@Query() dto: GetMoviesDto) {
    return this.movieService.findListMovie(dto)
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
  @UseInterceptors(TransactionInterceptor)
  postMovie(@Body() createMovieDto: CreateMovieDto, @Req() req) {
    return this.movieService.createMovie(createMovieDto, req.queryRunner)
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

  @Public()
  @Post('bulk-upload/:round')
  postMovies(@Param('round', new ParseIntPipe()) round: number) {
    return this.movieService.createDummyMovies(round)
  }
}
