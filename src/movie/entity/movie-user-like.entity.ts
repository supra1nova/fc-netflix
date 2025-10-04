import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm'
import { Movie } from './movie.entity'
import { User } from '../../user/entities/user.entity'

@Entity()
export class MovieUserLike {
  @PrimaryColumn({ type: 'int8' })
  movieId: number

  @PrimaryColumn({ type: 'int8' })
  userId: number

  @ManyToOne(() => Movie, (movie) => movie.likedUsers)
  @JoinColumn({ name: 'movieId' })
  movie: Movie

  @ManyToOne(() => User, (user) => user.likedMovies)
  @JoinColumn({ name: 'userId' })
  user: User

  @Column()
  isLike: boolean
}
