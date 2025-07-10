import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm'
import { BaseTable } from './base.entity'
import { MovieDetail } from './movie-detail.entity'

// ManyToOne DIrector -> 감독은 여러개의 영화 제작 가능
// ManyToMany Genre -> 영화는 여러개의 장르를 가질ㄴ 수 있고 장르는 여러개의 영화에 속할 수 있음

@Entity()
export class Movie extends BaseTable {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  title: string

  @Column()
  genre: string

  // OneToOne MovieDetail -> 영화는 하나의 상세 정보를 가질 수 있음
  @OneToOne(() => MovieDetail)
  @JoinColumn()
  detail: MovieDetail
}
