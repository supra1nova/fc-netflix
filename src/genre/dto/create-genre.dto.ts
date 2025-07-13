import { IsNotEmpty, IsString } from 'class-validator'

export class CreateGenreDto {
  @IsNotEmpty()
  @IsString()
  name: string

  @IsNotEmpty()
  @IsString()
  description: string
}
