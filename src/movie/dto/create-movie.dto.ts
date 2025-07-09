import { IsNotEmpty, IsString } from 'class-validator'
import { Transform } from 'class-transformer'

export class CreateMovieDto {
  @IsNotEmpty()
  @IsString()
  title: string

  @IsNotEmpty()
  @Transform(({ value }) => {
    const tgtVal = value as string
    return `${tgtVal.substring(0, 1)?.toUpperCase()}${tgtVal.substring(1)?.toLowerCase()}`
  })
  genre: string
}
