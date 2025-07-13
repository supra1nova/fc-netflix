import { ArrayNotEmpty, IsArray, IsNotEmpty, IsNumber, IsString } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateMovieDto {
  @IsNotEmpty()
  @IsString()
  title: string

  @IsNotEmpty()
  @IsString()
  detail: string

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  directorId: number

  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsNumber(
    {},
    {
      each: true, // each true 인 경우 배열 내부의 값을 모두 검증
    },
  )
  genreIds: number[]
}
