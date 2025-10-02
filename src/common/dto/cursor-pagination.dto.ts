import { IsIn, IsInt, IsOptional } from 'class-validator'

export class CursorPaginationDto {
  @IsOptional()
  @IsInt()
  id?: number

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order: 'ASC' | 'DESC' = 'DESC'

  @IsInt()
  @IsOptional()
  take: number = 5
}
