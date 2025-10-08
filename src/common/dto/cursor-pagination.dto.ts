import { IsArray, IsInt, IsOptional, IsString } from 'class-validator'
import { Transform } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'

export class CursorPaginationDto {
  // id_52,likeCount_20
  @IsOptional()
  @IsString()
  @ApiProperty({
    description: '페이지네이션 커서',
    example: 'eyJ2YWx1ZXMiOnsiaWQiOjM0OX0sIm9yZGVyIjpbImlkX0RFU0MiXX0=',
    required: false,
  })
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
  @ApiProperty({
    description: '내림차 또는 오름차 정렬',
    example: ['id_DESC'],
    required: false,
  })
  order: string[] = ['id_DESC']

  @IsOptional()
  @IsInt()
  @ApiProperty({
    description: '가져올 데이터 갯수',
    example: 5,
    required: false,
  })
  take: number = 5
}
