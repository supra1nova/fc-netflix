import { PartialType } from '@nestjs/mapped-types'
import { CreateMovieDto } from './create-movie.dto'

export enum MovieGenre {
  FANTASY = 'Fantasy',
  HORROR = 'Horror',
  ACTION = 'Action',
}

export class UpdateMovieDto extends PartialType(CreateMovieDto) {}
