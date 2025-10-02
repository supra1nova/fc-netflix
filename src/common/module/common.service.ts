import { Injectable } from '@nestjs/common'
import { ObjectLiteral, SelectQueryBuilder } from 'typeorm'
import { PagePaginationDto } from '../dto/page-pagination.dto'
import { CursorPaginationDto } from '../dto/cursor-pagination.dto'

@Injectable()
export class CommonService {
  constructor() {
  }

  applyPagePaginationParamsToQb<T extends ObjectLiteral>(qb: SelectQueryBuilder<T>, dto: PagePaginationDto) {
    const { page, limit, order } = dto

    const offset = (page - 1) * limit
    qb.offset(offset)
    qb.limit(limit)
    qb.orderBy(`${qb.alias}.id`, order)
  }

  applyCursorPaginationParamsToQb<T extends ObjectLiteral>(qb: SelectQueryBuilder<T>, dto: CursorPaginationDto) {
    const { id, order, take } = dto

    if (id) {
      const direction = order === 'ASC' ? '>' : '<'

      // order -> ASC : movie.id > :id
      // order -> DESC : movie.id < :id
      qb.where(`${qb.alias}.id ${direction} :id`, {id})
    }

    qb.take(take)
    qb.orderBy(`${qb.alias}.id`, order)
  }
}
