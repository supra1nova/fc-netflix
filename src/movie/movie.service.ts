import { Injectable, NotFoundException } from '@nestjs/common';

export interface Movie {
  id: number;
  title: string;
}

@Injectable()
export class MovieService {
  private movies: Movie[] = [
    {
      id: 1,
      title: '해리포터',
    },
    {
      id: 2,
      title: '반지의 제왕',
    },
  ];

  private idCounter: number = 2;

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

  createMovie(movie: Movie) {
    movie.id = ++this.idCounter;

    this.movies.push(movie);

    return movie;
  }

  updateMovie(id: number, title: string) {
    const movie = this.movies.find((m) => m.id === +id);

    if (!movie) {
      throw new NotFoundException('no movie id found');
    }

    Object.assign(movie, { title });

    return movie;
  }

  deleteMovie(id: number) {
    const movies = this.movies;
    const movieIdx = movies.findIndex((m) => m.id === +id);

    if (movieIdx === -1) {
      throw new NotFoundException('no movie id found');
    }

    movies.splice(movieIdx, 1);

    return id;
  }
}
