import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { Movie } from './entity/movie.entity';

@Injectable()
export class MovieService {
  private movies: Movie[] = [];
  private idCounter: number = 2;

  constructor() {
    const movie1 = new Movie();
    movie1.id = 1;
    movie1.title = '해리포터';
    movie1.genre = 'fantasy';

    const movie2 = new Movie();
    movie2.id = 2;
    movie2.title = '반지의 제왕';
    movie2.genre = 'action';

    this.movies.push(movie1, movie2);
  }

  getMultipleMovies(title?: string): any {
    if (!title) {
      return this.movies;
    }

    return this.movies.filter((m) => m.title.includes(title));
  }

  getMovieById(id: number) {
    const movie = this.movies.find((m) => m.id === id);

    if (!movie) {
      throw new NotFoundException('no movie id found');
    }

    return movie;
  }

  createMovie(createMovieDto: CreateMovieDto) {
    const movie: Movie = {
      id: ++this.idCounter,
      ...createMovieDto,
      description: 'test'
    };

    this.movies.push(movie);

    return movie;
  }

  updateMovie(id: number, updateMovieDto: UpdateMovieDto) {
    const movie = this.movies.find((m) => m.id === id);

    if (!movie) {
      throw new NotFoundException('no movie id found');
    }

    Object.assign(movie, updateMovieDto);

    return movie;
  }

  deleteMovie(id: number) {
    const movies = this.movies;
    const movieIdx = movies.findIndex((m) => m.id === id);

    if (movieIdx === -1) {
      throw new NotFoundException('no movie id found');
    }

    movies.splice(movieIdx, 1);

    return id;
  }
}
