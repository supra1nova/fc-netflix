import { CreateDateColumn, UpdateDateColumn, VersionColumn } from 'typeorm'
import { Exclude } from 'class-transformer'
import { ApiHideProperty } from '@nestjs/swagger'

export class BaseTable {
  @CreateDateColumn()
  @Exclude()
  @ApiHideProperty()
  createdAt: Date

  @UpdateDateColumn()
  @Exclude()
  @ApiHideProperty()
  updatedAt: Date

  @VersionColumn()
  @Exclude()
  @ApiHideProperty()
  version: number
}
