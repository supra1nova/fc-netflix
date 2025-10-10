import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  ClassSerializerInterceptor,
  ParseIntPipe,
} from '@nestjs/common'
import { GenreService } from './genre.service'
import { CreateGenreDto } from './dto/create-genre.dto'
import { UpdateGenreDto } from './dto/update-genre.dto'
import { ApiBearerAuth } from '@nestjs/swagger'

@Controller('genre')
@ApiBearerAuth()
@UseInterceptors(ClassSerializerInterceptor)
export class GenreController {
  constructor(private readonly genreService: GenreService) {
  }

  @Get()
  getManyGenre(@Query('name') name?: string) {
    return this.genreService.findAllGenre(name)
  }

  @Get(':id')
  getOneGenre(@Param('id', new ParseIntPipe()) id: number) {
    return this.genreService.findOneGenre(+id)
  }

  @Post()
  postGenre(@Body() createGenreDto: CreateGenreDto) {
    return this.genreService.createGenre(createGenreDto)
  }

  @Patch(':id')
  patchGenre(@Param('id', new ParseIntPipe()) id: number, @Body() updateGenreDto: UpdateGenreDto) {
    return this.genreService.updateGenre(+id, updateGenreDto)
  }

  @Delete(':id')
  deleteGenre(@Param('id', new ParseIntPipe()) id: number) {
    return this.genreService.deleteGenre(+id)
  }
}
