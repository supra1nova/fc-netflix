import { IsOptional, IsString } from 'class-validator'
import { CursorPaginationDto } from '../../common/dto/cursor-pagination.dto'
import { ApiProperty } from '@nestjs/swagger'

// export class GetMoviesDto extends PagePaginationDto {
export class GetMoviesDto extends CursorPaginationDto {
  @IsString()
  @IsOptional()
  @ApiProperty({
    description: '영화의 제목',
    example: '겨울왕국',
    required: false,
  })
  title?: string
}
