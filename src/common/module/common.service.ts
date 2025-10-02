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

  /**
   * 복합 비교(튜플 비교) -> 일괄 ASC/DESC 적용시 사용
   * (column1, column2, column3) > (value1, value2, value3)
   */
  applyComplexComparisonCursorPaginationParamsToQb<T extends ObjectLiteral>(qb: SelectQueryBuilder<T>, dto: CursorPaginationDto) {
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

  /**
   * OR-AND 누적 조건 생성 -> 개별 ASC/DESC 적용시 사용
   * WHERE (column1 > value1)
   *    OR (column1 = value1 AND column2 < value2)
   *    OR (column1 = value1 AND column2 = value2 AND column3 = value3)
   *    OR (column1 = value1 AND column2 = value2 AND column3 < value3 AND column4 = value4)
   */
  applyCursorPaginationParamsToQb<T extends ObjectLiteral>(qb: SelectQueryBuilder<T>, dto: CursorPaginationDto) {
    let { cursor, order, take } = dto

    if (cursor) {
      const decodedCursor = Buffer.from(cursor, 'base64').toString('utf-8')
      const cursorObj = JSON.parse(decodedCursor)

      order = cursorObj.order
      const { values } = cursorObj

      const conditions: string[] = []
      const params: Record<string, any> = {}
      let prevCondition: string[] = []

      // WHERE 절 처리
      order.forEach((o) => {
        const [col, dir] = o.split('_')
        const aliasCol = `${qb.alias}.${col}`

        const operator = dir === 'DESC' ? '<' : '>'
        // 이전 컬럼 = 값 조건 + 현재 비교 컬럼 조건
        const currentCondition = [...prevCondition, `${aliasCol} ${operator} :${col}`]

        conditions.push(`(${currentCondition.join(' AND ')})`)
        params[col] = values[col]

        // 다음 단계에서 사용할 prevCondition 업데이트 (동일 컬럼 = 값)
        prevCondition.push(`${aliasCol} = :${col}`)
      })

      qb.andWhere(conditions.join(' OR '), params)
    }

    // ORDER BY 처리
    order.forEach((o, i) => {
      const [column, direction] = o.split('_')

      if (direction !== 'ASC' && direction !== 'DESC') {
        throw new BadRequestException('Order에 ASC 또는 DESC 를 입력해주세요')
      }

      if (i < 1) {
        qb.orderBy(`${qb.alias}.${column}`, direction as 'ASC' | 'DESC')
      } else {
        qb.addOrderBy(`${qb.alias}.${column}`, direction as 'ASC' | 'DESC')
      }
    })

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
