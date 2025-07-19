import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'
import { BaseTable } from '../../common/entity/base.entity'
import { Exclude } from 'class-transformer'

export enum Role {
  admin,
  paidUser,
  user,
}

@Entity()
export class User extends BaseTable {
  @PrimaryGeneratedColumn()
  id: number

  @Column({
    unique: true,
  })
  email: string

  // @Exclude 의 toPlainOnly 는 plain 으로 변환시 제외 원할때 적용, toClassOnly 는 class로 변환시 제외 원할 때 적용
  @Column()
  @Exclude({ toPlainOnly: true })
  password: string

  @Column({
    enum: Role,
    default: Role.user,
  })
  @Exclude()
  role: Role
}
