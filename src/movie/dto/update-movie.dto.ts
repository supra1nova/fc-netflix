import { isEmpty, IsOptional, IsString } from 'class-validator'
import { Transform } from 'class-transformer'

export enum MovieGenre {
  FANTASY = 'Fantasy',
  HORROR = 'Horror',
  ACTION = 'Action',
}

export class UpdateMovieDto {
  @IsString()
  @IsOptional()
  title?: string

  @Transform(({ value }): any => {
    if (isEmpty(value)) {
      return value
    }
    const tgtVal = value as string
    return `${tgtVal.substring(0, 1).toUpperCase()}${tgtVal.substring(1)}`
  })
  @IsString()
  @IsOptional()
  genre?: string
}
