import { IsIn, IsInt, IsOptional } from 'class-validator'

export class PagePaginationDto {
  @IsInt()
  @IsOptional()
  page: number = 1

  @IsInt()
  @IsOptional()
  limit: number = 5

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order: 'ASC' | 'DESC' = 'DESC'
}
