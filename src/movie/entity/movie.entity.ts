import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm'
import { BaseTable } from '../../common/entity/base.entity'
import { MovieDetail } from './movie-detail.entity'
import { Director } from '../../director/entity/director.entity'
import { Genre } from '../../genre/entities/genre.entity'
import { Transform } from 'class-transformer'
import { isNotEmpty } from 'class-validator'
import { User } from '../../user/entities/user.entity'
import { MovieUserLike } from './movie-user-like.entity'

// ManyToOne DIrector -> 감독은 여러개의 영화 제작 가능
// ManyToMany Genre -> 영화는 여러개의 장르를 가질 수 있고 장르는 여러개의 영화에 속할 수 있음
@Entity()
export class Movie extends BaseTable {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true })
  title: string

  @Column({ default: 0 })
  likeCount: number

  @Column({ default: 0 })
  dislikeCount: number

  @Column({ nullable: true })
  @Transform(({ value }) => {
    if (isNotEmpty(value)) {
      return `http://localhost:3000/public/movie/${value}`
    }
  })
  movieFilePath: string

  @ManyToMany(() => Genre, (genre) => genre.movies, { cascade: true })
  @JoinTable() // 🎯 ManyToMany 인 경우 반드시 소유자 쪽에만 작성
  genres: Genre[]

  // OneToOne MovieDetail -> 영화는 하나의 상세 정보를 가질 수 있음
  @OneToOne(
    () => MovieDetail,
    // 일대일 관계에서는 생략가능하지만 상대 테이블의 어떤 컬럼을 참조할지 명시하는게 좋음
    (movieDetail) => movieDetail.id,
    {
      // 기본은 false 이므로 생성/수정/삭제시에 영향을 받음
      cascade: true,
      nullable: false,
    },
  )
  @JoinColumn()
  detail: MovieDetail

  @ManyToOne(() => Director, (director) => director.id, {
    cascade: true,
    nullable: false,
  })
  director: Director

  @ManyToOne(() => User, (user) => user.createdMovies, { cascade: false, nullable: true })
  creator: User

  @OneToMany(() => MovieUserLike, (mul) => mul.movie)
  likedUsers: MovieUserLike[]
}
