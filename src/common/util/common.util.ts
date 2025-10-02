import { ObjectLiteral, SelectQueryBuilder } from 'typeorm'
import { PagePaginationDto } from '../dto/page-pagination.dto'

export class CommonUtil {
  static ApplyPagePaginationParamsToQb<T extends ObjectLiteral>(qb: SelectQueryBuilder<T>, dto: PagePaginationDto) {
    const { page, limit } = dto

    const offset = (page - 1) * limit
    qb = qb.offset(offset)
    qb = qb.limit(limit)
  }
}
