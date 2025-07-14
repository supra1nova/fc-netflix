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
} from '@nestjs/common'
import { GenreService } from './genre.service'
import { CreateGenreDto } from './dto/create-genre.dto'
import { UpdateGenreDto } from './dto/update-genre.dto'

@Controller('genre')
@UseInterceptors(ClassSerializerInterceptor)
export class GenreController {
  constructor(private readonly genreService: GenreService) {}

  @Get()
  getManyGenre(@Query('name') name?: string) {
    return this.genreService.findAllGenre(name)
  }

  @Get(':id')
  getOneGenre(@Param('id') id: string) {
    return this.genreService.findOneGenre(+id)
  }

  @Post()
  postGenre(@Body() createGenreDto: CreateGenreDto) {
    return this.genreService.createGenre(createGenreDto)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateGenreDto: UpdateGenreDto) {
    return this.genreService.updateGenre(+id, updateGenreDto)
  }

  @Delete(':id')
  deleteGenre(@Param('id') id: string) {
    return this.genreService.deleteGenre(+id)
  }
}
