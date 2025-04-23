import { Transform } from 'class-transformer';

export class Movie {
  id: number;
  title: string;
  @Transform(({value}) => {
    return value.toString().toUpperCase();
  })
  genre: string;
}
