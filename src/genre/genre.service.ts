import { Injectable, NotFoundException } from '@nestjs/common'
import { CreateGenreDto } from './dto/create-genre.dto'
import { UpdateGenreDto } from './dto/update-genre.dto'
import { Genre } from './entities/genre.entity'
import { In, Like, Repository } from 'typeorm'
import { InjectRepository } from '@nestjs/typeorm'

@Injectable()
export class GenreService {
  constructor(
    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,
  ) {}

  findAllGenre(name?: string) {
    if (!name) {
      return this.genreRepository.findAndCount()
    }
    return this.genreRepository.findAndCount({ where: { name: Like(`%${name}%`) } })
  }

  findOneGenre(id: number) {
    return this.genreRepository.findOne({ where: { id } })
  }

  async createGenre(createGenreDto: CreateGenreDto) {
    return await this.genreRepository.save(createGenreDto)
  }

  async updateGenre(id: number, updateGenreDto: UpdateGenreDto) {
    const genre = await this.findOneGenre(id)
    if (!genre) {
      throw new NotFoundException(`Not found genre with id ${id}.`)
    }

    Object.assign(genre, updateGenreDto)
    return await this.genreRepository.save(genre)
  }

  async deleteGenre(id: number) {
    const genre = await this.findOneGenre(id)
    if (!genre) {
      throw new NotFoundException(`Not found genre with id ${id}.`)
    }

    // softDelete 를 이용해서 삭제시 unique 에 영향을 받음 -> 지운 값도 포함해서 unique 조건에 걸림
    // await this.genreRepository.softDelete(id)
    await this.genreRepository.delete(id)
  }
}
