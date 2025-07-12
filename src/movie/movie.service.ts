import { Injectable, NotFoundException } from '@nestjs/common'
import { CreateMovieDto } from './dto/create-movie.dto'
import { UpdateMovieDto } from './dto/update-movie.dto'
import { Movie } from './entity/movie.entity'
import { InjectRepository } from '@nestjs/typeorm'
import { Like, Repository } from 'typeorm'
import { MovieDetail } from './entity/movie-detail.entity'
import { Director } from '../director/entity/director.entity'

@Injectable()
export class MovieService {
  constructor(
    @InjectRepository(Movie)
    private readonly moviesRepository: Repository<Movie>,
    @InjectRepository(MovieDetail)
    private readonly movieDetailRepository: Repository<MovieDetail>,
    @InjectRepository(Director)
    private readonly directorRepository: Repository<Director>,
  ) {}

  async findListMovie(title?: string) {
    if (title) {
      return [
        await this.moviesRepository.find({ where: { title: Like(`%${title}%`) }, relations: ['detail'] }),
        await this.moviesRepository.count({ where: { title: Like(`%${title}%`) } }),
      ]
    }

    return this.moviesRepository.findAndCount({ relations: ['detail', 'director'] })
  }

  findOneMovie(id: number) {
    return this.moviesRepository.findOne({
      where: {
        id,
      },
      relations: ['detail', 'director'],
    })
  }

  // 저장 후 저장된 객체 리턴
  async createMovie(createMovieDto: CreateMovieDto) {
    const { detail, directorId, ...movieRest } = createMovieDto

    const director = await this.directorRepository.findOneBy({ id: directorId })
    if (!director) {
      throw new NotFoundException('director not found')
    }

    return await this.moviesRepository.save({ ...movieRest, detail: { detail }, director })
  }

  // 수정 후 수정된 객체 리턴
  async updateMovie(id: number, updateMovieDto: UpdateMovieDto) {
    const { detail, directorId, ...movieRest } = updateMovieDto

    const movie = await this.findOneMovie(id)
    if (!movie) {
      throw new NotFoundException('no movie id found')
    }

    let director
    if (directorId) {
      director = await this.directorRepository.findOneBy({ id: directorId })
      if (!director) {
        throw new NotFoundException('director not found')
      }
    }

    const newMovie = {
      ...(director && { director: director }),
      ...movieRest,
    }

    if (detail) {
      await this.movieDetailRepository.update(movie.detail.id, { detail })
    }
    await this.moviesRepository.update(id, newMovie)

    return await this.findOneMovie(id)
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
