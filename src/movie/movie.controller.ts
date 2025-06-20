import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { MovieService } from './movie.service'
import { CreateMovieDto } from './dto/create-movie.dto'
import { UpdateMovieDto } from './dto/update-movie.dto'
import { Movie } from './entity/movie.entity'

@Controller('movie')
export class MovieController {
  constructor(private readonly movieService: MovieService) {}

  @Get()
  getMovies(@Query('title') title?: string): Movie[] {
    return this.movieService.getMultipleMovies(title)
  }

  @Get(':id')
  getMovie(@Param('id') id: string): Movie {
    return this.movieService.getMovieById(+id)
  }

  @Post()
  postMovie(@Body() createMovieDto: CreateMovieDto): Movie {
    return this.movieService.createMovie(createMovieDto)
  }

  @Patch(':id')
  patchMovie(@Param('id') id: string, @Body() updateMovieDto: UpdateMovieDto): Movie {
    return this.movieService.updateMovie(+id, updateMovieDto)
  }

  @Delete(':id')
  deleteMovie(@Param('id') id: string): number {
    return this.movieService.deleteMovie(+id)
  }
}
