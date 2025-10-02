import { BadRequestException, Injectable } from '@nestjs/common'
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
    let { cursor, order, take } = dto

    if (cursor) {
      const decodedCursor = Buffer.from(cursor, 'base64').toString('utf-8')
      const cursorObj = JSON.parse(decodedCursor)

      order = cursorObj.order
      const { values } = cursorObj

      // WHERE (column1 > value1)
      //    OR (column1 = value1 AND column2 < value2)
      //    OR (column1 = value1 AND column2 = value2 AND column3 = value3)
      //    OR (column1 = value1 AND column2 = value2 AND column3 < value3 AND column4 = value4)

      // (column1, column2, column3) > (value1, value2, value3)
      const columns = Object.keys(values)

      const comparisonOperator = order.some((o) => o.endsWith('DESC')) ? '<' : '>'
      const whereConditions = columns.map((c) => `${qb.alias}.${c}`).join(',')
      const whereParams = columns.map((c) => `:${c}`).join(',')

      qb.where(`(${whereConditions}) ${comparisonOperator} (${whereParams})`, values)
    }

    for (let i = 0; i < order.length; i++) {
      const [column, direction] = order[i].split('_')

      if (direction !== 'ASC' && direction !== 'DESC') {
        throw new BadRequestException('Order에 ASC 또는 DESC 를 입력해주세요')
      }

      if (i < 1) {
        qb.orderBy(`${qb.alias}.${column}`, direction)
      } else {
        qb.addOrderBy(`${qb.alias}.${column}`, direction)
      }
    }

    qb.take(take)
  }

  generateNextCursor<T>(results: T[], order: string[]) {
    if (results.length === 0) {
      return null
    }

    /**
     * {
     *   values: {
     *     id: 27
     *   },
     *   order: ['likeCount_DESC', 'id_DESC']
     * }
     */
    const lastItem = results[results.length - 1]

    const values = {}

    order.forEach((columnOrder) => {
      const [column] = columnOrder.split('_')
      values[column] = lastItem[column]
    })

    const cursorObj = { values, order }

    return Buffer.from(JSON.stringify(cursorObj)).toString('base64')
  }
}
