import { Injectable, NotFoundException } from '@nestjs/common'
import { CreateMovieDto } from './dto/create-movie.dto'
import { UpdateMovieDto } from './dto/update-movie.dto'
import { Movie } from './entity/movie.entity'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { MovieDetail } from './entity/movie-detail.entity'
import { Director } from '../director/entity/director.entity'
import { Genre } from '../genre/entities/genre.entity'

@Injectable()
export class MovieService {
  constructor(
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
    @InjectRepository(MovieDetail)
    private readonly movieDetailRepository: Repository<MovieDetail>,
    @InjectRepository(Director)
    private readonly directorRepository: Repository<Director>,
    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,
  ) {}

  findListMovie(title?: string) {
    let qb = this.movieRepository
      .createQueryBuilder('movie')
      .leftJoinAndSelect('movie.director', 'director')
      .leftJoinAndSelect('movie.genres', 'genres')

    if (title) {
      qb = qb.andWhere('movie.title LIKE :title', { title: `%${title}%` })
    }

    return qb.orderBy('movie.createdAt', 'DESC').getManyAndCount()
  }

  findOneMovie(id: number) {
    const qb = this.movieRepository
      .createQueryBuilder('movie')
      .leftJoinAndSelect('movie.director', 'director')
      .leftJoinAndSelect('movie.genres', 'genres')
      .leftJoinAndSelect('movie.detail', 'detail')
      .where('movie.id = :id')
      .setParameter('id', id)

    return qb.getOne()
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

    const detailInsertResult = await this.movieDetailRepository
      .createQueryBuilder()
      .insert()
      .into(MovieDetail)
      .values({ detail })
      .execute()
    const detailId = detailInsertResult.identifiers[0].id

    const movieInsertResult = await this.movieRepository
      .createQueryBuilder()
      .insert()
      .into(Movie)
      .values({ detail: { id: detailId }, director, ...movieRest })
      .execute()
    const movieId = movieInsertResult.identifiers[0].id

    await this.movieRepository.createQueryBuilder().relation(Movie, 'genres').of(movieId).add(genreIds)

    return await this.findOneMovie(movieId)
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

      // relation.of.set 의 경우 관련 데이터를 다 지우고 새로 등록하므로, 특정 데이터를 넣고 지우는 addAndRemove 보다 오히려 깔끔하다고 볼 수 있음
      await this.movieRepository.createQueryBuilder().relation(Movie, 'genres').of(id).set(genreIds)
    }

    if (directorId) {
      const director = await this.directorRepository.findOneBy({ id: directorId })
      if (!director) {
        throw new NotFoundException('director not found')
      }
    }

    if (detail) {
      await this.movieDetailRepository
        .createQueryBuilder()
        .update()
        .set({ detail })
        .where('id = :id', { id: movie.detail.id })
        .execute()
    }

    let qb = this.movieRepository
      .createQueryBuilder()
      .update()
      .set({ ...movieRest })
      .where('id = :id', { id })

    if (directorId) {
      qb = qb.set({ director: { id: directorId } })
    }

    await qb.execute()

    return await this.findOneMovie(id)
  }

  async deleteMovie(id: number) {
    const movie = await this.findOneMovie(id)
    if (!movie) {
      throw new NotFoundException('no movie id found')
    }

    // cascade 가 있음에 따라 movie 부터 삭제 후 연관 테이블의 데이터 삭제 진행
    await this.movieRepository.createQueryBuilder().delete().where('id = :id', { id }).execute()
    await this.movieDetailRepository.createQueryBuilder().delete().where('id = :id', { id: movie.detail.id }).execute()
  }
}
