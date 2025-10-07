import { Injectable } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { join, parse } from 'path'
import { readdir, unlink } from 'fs/promises'
import { differenceInDays, parse as dateParse } from 'date-fns'

@Injectable()
export class TasksService {
  constructor() {
  }

  // @Cron('* * * * * *')
  logEverySecond() {
    console.log('1초 마다 실행')
  }

  // cron 매 시 0분 0초 삭제
  @Cron('* 0 * * * *')
  async eraseOrphanFiles() {
    const files = await readdir(join(process.cwd(), 'public', 'temp'))

    const nowDate = new Date()

    const deleteFilesTargets = files.filter((file) => {
      // path의 parse() 함수는 특정 파일의 확장자를 제외한 이름을 반환해줌
      const filename = parse(file).name
      const split = filename.split('_')

      if (split.length !== 2) {
        return true
      }

      try {
        // date-fns 라이브러리 parse 함수(중복 이름으로 dateParse로 이름 변경) 통해
        // 특정 format string date 를 date 객체로 변환
        const fileDate = dateParse(split[split.length - 1], 'yyyyMMddHHmmss', new Date())
        // date-fns 라이브러리 differenceInDays 함수 통해
        // 시작일 - 마지막일 간의 차이를 내림 후 반환
        // (2월 2일 0시 - 2월 2일 11시 59분 59초 -> 0 반환)
        // (2월 2일 0시 - 2월 4일 11시 59분 59초 -> 2 반환)
        return differenceInDays(fileDate, nowDate)
      } catch (e) {
        return true
      }
    })

    console.log(JSON.stringify(deleteFilesTargets))

    // 소수의 파일이면 상관없지만, 텀이 길고 삭제 대상 파일이 많으면 개별 비동기로 오래 걸림 -> Promise.all() 사용
    /*
    for (const tgtFile of deleteFilesTargets) {
      await unlink(join(process.cwd(), 'public', 'temp', tgtFile))
    }
    */
    await Promise.all(deleteFilesTargets.map(
      (tgtFile) => unlink(join(process.cwd(), 'public', 'temp', tgtFile)),
    ))
  }
}
