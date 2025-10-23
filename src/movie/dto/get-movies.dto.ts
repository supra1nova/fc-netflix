import { IsOptional, IsString } from 'class-validator'
import { CursorPaginationDto } from '../../common/dto/cursor-pagination.dto'
import { ApiProperty } from '@nestjs/swagger'

// export class GetMoviesDto extends PagePaginationDto {
export class GetMoviesDto extends CursorPaginationDto {
  @ApiProperty({
    description: '영화 제목',
    // example: '겨울왕국',
    required: false,
  })
  @IsString()
  @IsOptional()
  title?: string
}
