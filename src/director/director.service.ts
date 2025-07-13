import { Injectable, NotFoundException } from '@nestjs/common'
import { CreateDirectorDto } from './dto/create-director.dto'
import { UpdateDirectorDto } from './dto/update-director.dto'
import { InjectRepository } from '@nestjs/typeorm'
import { Director } from './entity/director.entity'
import { Like, Repository } from 'typeorm'

@Injectable()
export class DirectorService {
  constructor(@InjectRepository(Director) private readonly directorRepository: Repository<Director>) {}

  findListDirector(name?: string) {
    if (name) {
      return this.directorRepository.find({ where: { name: Like(`%${name}%`) } })
    }

    return this.directorRepository.find()
  }

  findOneDirector(id: number) {
    return this.directorRepository.findOne({
      where: { id },
    })
  }

  async createDirector(createDirectorDto: CreateDirectorDto) {
    return await this.directorRepository.save(createDirectorDto)
  }

  async updateDirector(id: number, updateDirectorDto: UpdateDirectorDto) {
    const director = await this.findOneDirector(id)
    if (!director) {
      throw new NotFoundException('no director id found')
    }

    Object.assign(director, updateDirectorDto)
    return await this.directorRepository.save(director)
  }

  async deleteDirector(id: number) {
    const director = await this.findOneDirector(id)
    if (!director) {
      throw new NotFoundException('no director id found')
    }

    await this.directorRepository.delete(id)
  }
}
