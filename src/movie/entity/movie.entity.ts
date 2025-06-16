import { Transform } from 'class-transformer'

export class Movie {
  id: number
  title: string
  @Transform(({ value }): string => {
    return (value as string).toUpperCase()
  })
  genre: string
}
