import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Movie } from './movie.entity'
import { BaseTable } from './base.entity'

@Entity()
export class MovieDetail extends BaseTable {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  detail: string

  @OneToOne(() => Movie)
  movie: Movie
}
