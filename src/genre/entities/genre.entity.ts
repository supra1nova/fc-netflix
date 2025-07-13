import { Column, Entity, JoinColumn, JoinTable, ManyToMany, PrimaryGeneratedColumn } from 'typeorm'
import { Movie } from '../../movie/entity/movie.entity'
import { BaseTable } from '../../common/entity/base.entity'

@Entity()
export class Genre extends BaseTable {
  @PrimaryGeneratedColumn()
  id: number

  @Column({
    unique: true,
  })
  name: string

  @Column()
  description: string

  @ManyToMany(() => Movie, (movie) => movie.genres)
  movies: Movie[]
}
