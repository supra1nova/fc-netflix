import { Injectable, NotFoundException } from '@nestjs/common'
import { CreateMovieDto } from './dto/create-movie.dto'
import { MovieGenre, UpdateMovieDto } from './dto/update-movie.dto'
import { Movie } from './entity/movie.entity'

@Injectable()
export class MovieService {
  private movies: Movie[] = []
  private idCounter: number = 2

  constructor() {
    const movie0 = new Movie()
    movie0.id = 0
    movie0.title = '해리포터'
    movie0.genre = MovieGenre.FANTASY

    const movie1 = new Movie()
    movie0.id = 1
    movie0.title = '반지의 제왕'
    movie0.genre = MovieGenre.ACTION

    const movie2 = new Movie()
    movie2.id = 2
    movie2.title = '스크림'
    movie2.genre = MovieGenre.HORROR

    this.movies.push(movie0, movie1, movie2)
  }

  getMultipleMovies(title?: string): Movie[] {
    if (!title) {
      return this.movies
    }

    return this.movies.filter((m) => m.title.includes(title))
  }

  getMovieById(id: number) {
    const movie = this.movies.find((m) => m.id === id)

    if (!movie) {
      throw new NotFoundException('no movie id found')
    }

    return movie
  }

  createMovie(createMovieDto: CreateMovieDto) {
    const movie: Movie = {
      id: ++this.idCounter,
      ...createMovieDto,
    }

    this.movies.push(movie)

    return movie
  }

  updateMovie(id: number, updateMovieDto: UpdateMovieDto) {
    const movie = this.movies.find((m) => m.id === id)

    if (!movie) {
      throw new NotFoundException('no movie id found')
    }

    const updateDto = this.stripUndefined(updateMovieDto)
    Object.assign(movie, updateDto)
    console.log(this.movies)

    return movie
  }

  deleteMovie(id: number) {
    const movies = this.movies
    const movieIdx = movies.findIndex((m) => m.id === id)

    if (movieIdx === -1) {
      throw new NotFoundException('no movie id found')
    }

    movies.splice(movieIdx, 1)

    return id
  }

  stripUndefined(obj: Record<string, any>) {
    return Object.fromEntries(Object.entries(obj).filter(([_, value]) => value !== undefined))
  }
}
