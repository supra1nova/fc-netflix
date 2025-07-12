import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm'
import { BaseTable } from '../../common/entity/base.entity'
import { MovieDetail } from './movie-detail.entity'
import { Director } from '../../director/entity/director.entity'

// ManyToOne DIrector -> 감독은 여러개의 영화 제작 가능
// ManyToMany Genre -> 영화는 여러개의 장르를 가질 수 있고 장르는 여러개의 영화에 속할 수 있음

@Entity()
export class Movie extends BaseTable {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  title: string

  @Column()
  genre: string

  // OneToOne MovieDetail -> 영화는 하나의 상세 정보를 가질 수 있음
  @OneToOne(
    () => MovieDetail,
    // 일대일 관계에서는 생략가능하지만 상대 테이블의 어떤 컬럼을 참조할지 명시하는게 좋음
    (movieDetail) => movieDetail.id,
    {
      // 기본은 false 이므로 생성/수정/삭제시에 영향을 받음
      cascade: true,
    },
  )
  @JoinColumn()
  detail: MovieDetail

  @ManyToOne(() => Director, (director) => director.id, { cascade: true })
  director: Director
}
