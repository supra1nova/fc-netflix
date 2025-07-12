import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Movie } from './movie.entity'
import { BaseTable } from './base.entity'

@Entity()
export class MovieDetail extends BaseTable {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  detail: string

  @OneToOne(
    () => Movie,
    // 일대일 관계에서는 생략가능하지만 상대 테이블의 어떤 컬럼을 참조할지 명시하는게 좋음
    (movie) => movie.id,
  )
  movie: Movie
}
