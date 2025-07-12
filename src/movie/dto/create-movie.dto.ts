import { IsNotEmpty, IsNumber, IsString } from 'class-validator'
import { Transform, Type } from 'class-transformer'

export class CreateMovieDto {
  @IsNotEmpty()
  @IsString()
  title: string

  @IsNotEmpty()
  @Transform(({ value }) => {
    const tgtVal = value as string
    return `${tgtVal.substring(0, 1)?.toUpperCase()}${tgtVal.substring(1)?.toLowerCase()}`
  })
  @IsString()
  genre: string

  @IsNotEmpty()
  @IsString()
  detail: string

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  directorId: number
}
