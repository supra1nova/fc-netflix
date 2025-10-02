import { Injectable } from '@nestjs/common'
import { ObjectLiteral, SelectQueryBuilder } from 'typeorm'
import { PagePaginationDto } from '../dto/page-pagination.dto'

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
}
