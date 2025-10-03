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
  Query, Req, UploadedFiles,
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
import { FileFieldsInterceptor } from '@nestjs/platform-express'

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
  // @UseInterceptors(FileInterceptor('movie'))
  // @UseInterceptors(FilesInterceptor('movies'))
  @UseInterceptors(FileFieldsInterceptor([
    {
      // 필드 이름
      name: 'movie',
      // 최대 파일 갯수
      maxCount: 1
    },
    {
      name: 'posters',
      maxCount: 2
    },
  ]))
  postMovie(
    @Body() createMovieDto: CreateMovieDto,
    @Req() req,
    // @UploadedFile() file: Express.Multer.File,
    // @UploadedFiles() files: Express.Multer.File[],
    @UploadedFiles() files: {
      movie?: Express.Multer.File[],
      posters?: Express.Multer.File[]
    },
  ) {
    // console.log(file)
    console.log(files)
    return this.movieService.createMovie(createMovieDto, req.queryRunner)
  }

  @Patch(':id')
  @RBAC(Role.admin)
  patchMovie(@Param('id', new ParseIntPipe()) id: number, @Body() updateMovieDto: UpdateMovieDto) {
    return this.movieService.updateMovie(id, updateMovieDto)
  }

  @Delete(':id')
  @RBAC(Role.admin)
  deleteMovie(@Param('id', new ParseIntPipe()) id: number) {
    return this.movieService.deleteMovie(id)
  }

  @Public()
  @Post('bulk-upload/:round')
  postMovies(@Param('round', new ParseIntPipe()) round: number) {
    return this.movieService.createDummyMovies(round)
  }
}
