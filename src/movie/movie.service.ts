import { Injectable, NotFoundException } from '@nestjs/common'
import { CreateMovieDto } from './dto/create-movie.dto'
import { UpdateMovieDto } from './dto/update-movie.dto'
import { Movie } from './entity/movie.entity'
import { InjectRepository } from '@nestjs/typeorm'
import { Like, Repository } from 'typeorm'
import { MovieDetail } from './entity/movie-detail.entity'

@Injectable()
export class MovieService {
  constructor(
    @InjectRepository(Movie)
    private readonly moviesRepository: Repository<Movie>,
    @InjectRepository(MovieDetail)
    private readonly movieDetailRepository: Repository<MovieDetail>,
  ) {}

  async getManyMovies(title?: string) {
    if (title) {
      return [
        await this.moviesRepository.find({ where: { title: Like(`%${title}%`) }, relations: ['detail'] }),
        await this.moviesRepository.count({ where: { title: Like(`%${title}%`) } }),
      ]
    }

    return this.moviesRepository.findAndCount({ relations: ['detail'] })
  }

  getMovieById(id: number) {
    return this.moviesRepository.findOne({
      where: {
        id,
      },
      relations: ['detail'],
    })
  }

  // 저장 후 저장된 객체 리턴
  async createMovie(createMovieDto: CreateMovieDto) {
    const { title, genre, detail } = createMovieDto

    return await this.moviesRepository.save({ title, genre, detail: { detail } })
  }

  // 수정 후 수정된 객체 리턴
  async updateMovie(id: number, updateMovieDto: UpdateMovieDto) {
    const { detail, ...movieRest } = updateMovieDto

    const movie = await this.getMovieById(id)

    if (!movie) {
      throw new NotFoundException('no movie id found')
    }

    if (detail) {
      await this.movieDetailRepository.update(movie.detail.id, { detail })
    }
    await this.moviesRepository.update(id, movieRest)

    return await this.getMovieById(id)
  }

  async deleteMovie(id: number) {
    const movie = await this.getMovieById(id)

    if (!movie) {
      throw new NotFoundException('no movie id found')
    }

    // softDelete 는 @DeleteDateColumn() 이 entity 에 존재해야 사용 가능
    await this.movieDetailRepository.softDelete(movie.detail.id)
    await this.moviesRepository.softDelete(id)
  }
}
