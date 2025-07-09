import { Injectable, NotFoundException } from '@nestjs/common'
import { CreateMovieDto } from './dto/create-movie.dto'
import { MovieGenre, UpdateMovieDto } from './dto/update-movie.dto'
import { Movie } from './entity/movie.entity'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

@Injectable()
export class MovieService {
  constructor(
    @InjectRepository(Movie)
    private readonly moviesRepository: Repository<Movie>,
  ) {}

  getManyMovies(title?: string) {
    /*
    if (!title) {
      return this.movies
    }

    return this.movies.filter((m) => m.title.includes(title))
    */

    // return this.moviesRepository.find({ where: { title: title } })
    return this.moviesRepository.find({ where: { title: title } })
  }

  getMovieById(id: number) {
    /*
    const movie = this.movies.find((m) => m.id === id)

    if (!movie) {
      throw new NotFoundException('no movie id found')
    }

    return movie
    */
    return this.moviesRepository.findOneBy({ id })
  }

  // 저장 후 저장된 객체 리턴
  async createMovie(createMovieDto: CreateMovieDto) {
    /*
    const movie: Movie = {
      id: ++this.idCounter,
      ...createMovieDto,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 0,
    }

    this.movies.push(movie)

    return movie
    */

    /*
    const movie = this.moviesRepository.create(createMovieDto)
    await this.moviesRepository.save(movie)
    */

    return await this.moviesRepository.save(createMovieDto)
  }

  // 수정 후 수정된 객체 리턴
  async updateMovie(id: number, updateMovieDto: UpdateMovieDto) {
    /*
    const movie = this.movies.find((m) => m.id === id)

    if (!movie) {
      throw new NotFoundException('no movie id found')
    }

    const updateDto = this.stripUndefined(updateMovieDto)
    Object.assign(movie, updateDto)
    console.log(this.movies)

    return movie
    */

    const movie = await this.getMovieById(id)

    if (!movie) {
      throw new NotFoundException('no movie id found')
    }

    await this.moviesRepository.update(id, updateMovieDto)

    return await this.getMovieById(id)
  }

  async deleteMovie(id: number) {
    /*
    const movies = this.movies
    const movieIdx = movies.findIndex((m) => m.id === id)

    if (movieIdx === -1) {
      throw new NotFoundException('no movie id found')
    }

    movies.splice(movieIdx, 1)

    return id
    */

    const movie = await this.getMovieById(id)

    if (!movie) {
      throw new NotFoundException('no movie id found')
    }

    // softRemove 는 @DeleteDateColumn() 이 entity 에 존재해야 사용 가능
    await this.moviesRepository.softRemove({ id })
    // await this.moviesRepository.delete({ id })
  }

  stripUndefined(obj: Record<string, any>) {
    return Object.fromEntries(Object.entries(obj).filter(([_, value]) => value !== undefined))
  }
}
