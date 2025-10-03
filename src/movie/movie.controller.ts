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
  Query, Req, UploadedFile, UploadedFiles,
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
import { FileFieldsInterceptor, FileInterceptor, FilesInterceptor } from '@nestjs/platform-express'
import { MovieFilePipe } from './pipe/movie-file.pipe'

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
  // FileInterceptor / FilesInterceptor / FileFieldsInterceptor 가 다르니 상황에 따라 각각 달리 사용 필요
  // 차이에 대해서도 익혀두는 것이 좋음
  @UseInterceptors(FileInterceptor('movie', {
    // limits 내부에 제한되면 지정된 장소에 파일이 올라가지 않음
    limits: {
      // 업로드 파일의 사이즈 제한
      // 1000 * 1000 = 10^6 byte = 1 MB
      fileSize: 1000 * 1000 * 20,
    },
    // fileFilter 의 callback을 통해 파일 수신/미수신 여부 결정 가능하며, 필요시 사용자 지정 예외를 반환
    // callback 의 첫번째 param은 예외 유형, 두번재 param은 파일 수신 여부 설정
    fileFilter(req, file, callback) {
      console.log(file)
      if (file.mimetype !== 'text/plain') {
        return callback(new BadRequestException('TXT 파일만 업로드 가능합니다'), false)
      }

      return callback(null, true)
    },
  }))
  postMovie(
    @Body() createMovieDto: CreateMovieDto,
    @Req() req,
    @UploadedFiles() movie: Express.Multer.File,
  ) {
    console.log(movie)
    return this.movieService.createMovie(createMovieDto, req.queryRunner)
  }

  @Post('files-interceptor')
  @RBAC(Role.admin)
  @UseInterceptors(TransactionInterceptor)
  @UseInterceptors(FilesInterceptor('movies', 2, {
    limits: {
      fileSize: 1000 * 1000 * 20,
    },
    fileFilter(req, file, callback) {
      console.log(file)
      if (file.mimetype !== 'text/plain') {
        return callback(new BadRequestException('TXT 파일만 업로드 가능합니다'), false)
      }

      return callback(null, true)
    },
  }))
  postMovieForFilesInterceptor(
    @Body() createMovieDto: CreateMovieDto,
    @Req() req,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    console.log(files)
    return this.movieService.createMovie(createMovieDto, req.queryRunner)
  }

  @Post('file-fields-interceptor')
  @RBAC(Role.admin)
  @UseInterceptors(TransactionInterceptor)
  @UseInterceptors(FileFieldsInterceptor([
    {
      // 필드 이름
      name: 'movie',
      // 최대 파일 갯수
      maxCount: 1,
    },
    {
      name: 'posters',
      maxCount: 2,
    },
  ], {
    limits: {
      fileSize: 1000 * 1000 * 20,
    },
    fileFilter(req, file, callback) {
      console.log(file)
      if (file.mimetype !== 'text/plain') {
        return callback(new BadRequestException('TXT 파일만 업로드 가능합니다'), false)
      }

      return callback(null, true)
    },
  }))
  postMovieForFileFieldsInterceptor(
    @Body() createMovieDto: CreateMovieDto,
    @Req() req,
    @UploadedFiles() files: {
      movie?: Express.Multer.File[],
      posters?: Express.Multer.File[]
    },
  ) {
    console.log(files)
    return this.movieService.createMovie(createMovieDto, req.queryRunner)
  }

  @Post('movie-file-pipe')
  @RBAC(Role.admin)
  @UseInterceptors(TransactionInterceptor)
  @UseInterceptors(FileInterceptor('movie', {
    limits: {
      fileSize: 1000 * 1000 * 20,
    },
    fileFilter(req, file, callback) {
      console.log(file)
      if (file.mimetype !== 'text/plain') {
        return callback(new BadRequestException('TXT 파일만 업로드 가능합니다'), false)
      }

      return callback(null, true)
    },
  }))
  postMovieForMovieFilePipe(
    @Body() createMovieDto: CreateMovieDto,
    @Req() req,
    @UploadedFile(new MovieFilePipe({
      maxSize: 20,
      mimeType: 'text/plain',
    })) file: Express.Multer.File,
  ) {
    console.log(file)
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
