import { IsOptional, IsString } from 'class-validator';

enum MovieGenre {
  Fantasy = 'fantasy',
  Horror = 'horror',
  Action = 'action',
}

export class UpdateMovieDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  genre?: string;
}
