import { IsArray, IsInt, IsOptional, IsString } from 'class-validator'
import { Transform } from 'class-transformer'

export class CursorPaginationDto {
  // id_52,likeCount_20
  @IsOptional()
  @IsString()
  cursor?: string

  // [id_DESC, likeCount_DESC]
  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value) ? value : [value],
  )
  @IsArray()
  @IsString({
    each: true,
  })
  order: string[] = ['id_DESC']

  @IsOptional()
  @IsInt()
  take: number = 5
}
