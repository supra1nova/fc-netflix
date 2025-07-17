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

  @Column()
  password: string

  @Column({
    enum: Role,
    default: Role.user,
  })
  @Exclude()
  role: Role
}
