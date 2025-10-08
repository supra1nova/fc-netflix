import { ArrayNotEmpty, IsArray, IsNotEmpty, IsNumber, IsString } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'

export class CreateMovieDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: '영화 제목',
    example: '겨울왕국',
  })
  title: string

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: '영화 설명',
    example: '3시간 휴가쥬?ㅎㅎ',
  })
  detail: string

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @ApiProperty({
    description: '감독 객체 ID',
    example: 1,
  })
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
  @ApiProperty({
    description: '장르 객체 ID 배열',
    example: [5, 6],
  })
  genreIds: number[]

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: '영화 파일 이름',
    example: 'aaa-bbb-ccc-dddd',
  })
  movieFileName: string
}
