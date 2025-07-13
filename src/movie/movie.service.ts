import { Injectable, NotFoundException } from '@nestjs/common'
import { CreateMovieDto } from './dto/create-movie.dto'
import { UpdateMovieDto } from './dto/update-movie.dto'
import { Movie } from './entity/movie.entity'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Like, Repository } from 'typeorm'
import { MovieDetail } from './entity/movie-detail.entity'
import { Director } from '../director/entity/director.entity'
import { Genre } from '../genre/entities/genre.entity'

@Injectable()
export class MovieService {
  constructor(
    @InjectRepository(Movie)
    private readonly moviesRepository: Repository<Movie>,
    @InjectRepository(MovieDetail)
    private readonly movieDetailRepository: Repository<MovieDetail>,
    @InjectRepository(Director)
    private readonly directorRepository: Repository<Director>,
    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,
  ) {}

  async findListMovie(title?: string) {
    if (title) {
      return [
        await this.moviesRepository.find({
          where: { title: Like(`%${title}%`) },
          relations: ['detail', 'director', 'genres'],
        }),
        await this.moviesRepository.count({ where: { title: Like(`%${title}%`) } }),
      ]
    }

    return this.moviesRepository.findAndCount({ relations: ['detail', 'director', 'genres'] })
  }

  findOneMovie(id: number) {
    return this.moviesRepository.findOne({
      where: {
        id,
      },
      relations: ['detail', 'director', 'genres'],
    })
  }

  async createMovie(createMovieDto: CreateMovieDto) {
    const { genreIds, detail, directorId, ...movieRest } = createMovieDto

    const genres = await this.genreRepository.find({ where: { id: In(genreIds) } })
    if (genres.length < 1) {
      throw new NotFoundException('genre not found')
    }
    if (genres.length !== genreIds.length) {
      const genreListIds = genres.map((genre) => genre.id)
      const joinedNotFoundGenreIds = genreIds.filter((genre) => !genreListIds.includes(genre)).join(', ')
      throw new NotFoundException(`genre with id ${joinedNotFoundGenreIds} not found`)
    }

    const director = await this.directorRepository.findOneBy({ id: directorId })
    if (!director) {
      throw new NotFoundException('director not found')
    }

    return await this.moviesRepository.save({ ...movieRest, genres, detail: { detail }, director })
  }

  async updateMovie(id: number, updateMovieDto: UpdateMovieDto) {
    const { genreIds, detail, directorId, ...movieRest } = updateMovieDto

    const movie = await this.findOneMovie(id)
    if (!movie) {
      throw new NotFoundException('no movie id found')
    }

    if (genreIds && genreIds.length > 0) {
      const genres = await this.genreRepository.find({ where: { id: In(genreIds) } })
      if (genres.length < 1) {
        throw new NotFoundException('genre not found')
      }

      if (genres.length !== genreIds.length) {
        const genreListIds = genres.map((genre: Genre) => genre.id)
        const joinedNotFoundGenreIds = genreIds.filter((genre) => !genreListIds.includes(genre)).join(', ')
        throw new NotFoundException(`${joinedNotFoundGenreIds} genre not found`)
      }

      movie.genres = genres
    }

    if (directorId) {
      const director = await this.directorRepository.findOneBy({ id: directorId })
      if (!director) {
        throw new NotFoundException('director not found')
      }

      movie.director = director
    }

    if (detail) {
      movie.detail.detail = detail
    }

    Object.assign(movie, movieRest)

    return await this.moviesRepository.save(movie)
  }

  async deleteMovie(id: number) {
    const movie = await this.findOneMovie(id)
    if (!movie) {
      throw new NotFoundException('no movie id found')
    }

    // softDelete 는 @DeleteDateColumn() 이 entity 에 존재해야 사용 가능
    await this.movieDetailRepository.softDelete(movie.detail.id)
    await this.moviesRepository.softDelete(id)
  }
}
