import { Injectable, NotFoundException } from '@nestjs/common'
import { CreateMovieDto } from './dto/create-movie.dto'
import { UpdateMovieDto } from './dto/update-movie.dto'
import { Movie } from './entity/movie.entity'
import { InjectRepository } from '@nestjs/typeorm'
import { Like, Repository } from 'typeorm'

@Injectable()
export class MovieService {
  constructor(
    @InjectRepository(Movie)
    private readonly moviesRepository: Repository<Movie>,
  ) {}

  async getManyMovies(title?: string) {
    if (title) {
      return [
        await this.moviesRepository.find({ where: { title: Like(`%${title}%`) } }),
        await this.moviesRepository.count({ where: { title: Like(`%${title}%`) } }),
      ]
    }

    return this.moviesRepository.findAndCount()
  }

  getMovieById(id: number) {
    return this.moviesRepository.findOneBy({ id })
  }

  // 저장 후 저장된 객체 리턴
  async createMovie(createMovieDto: CreateMovieDto) {
    return await this.moviesRepository.save(createMovieDto)
  }

  // 수정 후 수정된 객체 리턴
  async updateMovie(id: number, updateMovieDto: UpdateMovieDto) {
    const movie = await this.getMovieById(id)

    if (!movie) {
      throw new NotFoundException('no movie id found')
    }

    await this.moviesRepository.update(id, updateMovieDto)

    return await this.getMovieById(id)
  }

  async deleteMovie(id: number) {
    const movie = await this.getMovieById(id)

    if (!movie) {
      throw new NotFoundException('no movie id found')
    }

    // softRemove 는 @DeleteDateColumn() 이 entity 에 존재해야 사용 가능
    await this.moviesRepository.softRemove({ id })
  }
}
