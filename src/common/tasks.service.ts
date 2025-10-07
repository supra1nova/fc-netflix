import { Inject, Injectable, LoggerService } from '@nestjs/common'
import { Cron, SchedulerRegistry } from '@nestjs/schedule'
import { join, parse } from 'path'
import { readdir, unlink } from 'fs/promises'
import { differenceInDays, parse as dateParse } from 'date-fns'
import { Logger, Repository } from 'typeorm'
import { Movie } from 'src/movie/entity/movie.entity'
import { InjectRepository } from '@nestjs/typeorm'
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston'

@Injectable()
export class TasksService {
  // 내장로거 instantiate해서 사용
  // private readonly logger = new Logger(TasksService.name)

  constructor(
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
    private readonly schedulerRegistry: SchedulerRegistry,
    /*private readonly logger: DefaultLogger*/
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
  }

  @Cron('*/5 * * * * *')
  logEverySecond() {
    console.log('1초 마다 실행')

    this.logger.fatal?.('fatal', null, TasksService.name)
    this.logger.error('error', null, TasksService.name)
    this.logger.warn('warn', TasksService.name)
    this.logger.log('log', TasksService.name)
    this.logger.debug?.('debug', TasksService.name)
    this.logger.verbose?.('verbose', TasksService.name)
  }

  // cron 매 시 0분 0초 삭제
  // @Cron('* 0 * * * *')
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

  // @Cron('*/10 * * * * *')
  async calculateMovieLikeCount() {
    await this.movieRepository.query(`update movie m
                                      set "likeCount" = (select count(*)
                                                         from movie_user_like mul
                                                         where mul."movieId" = m.id
                                                           and mul."isLike" = true)`)

    await this.movieRepository.query(`update movie m
                                      set "dislikeCount" = (select count(*)
                                                            from movie_user_like mul
                                                            where mul."movieId" = m.id
                                                              and mul."isLike" = false)`)


  }

  /*
  @Cron(CronExpression.EVERY_SECOND, {
    name: 'printer_cron'
  })
  */
  printer() {
    console.log('print every seconds')
  }

  // @Cron(CronExpression.EVERY_5_SECONDS)
  stopper() {
    console.log('---- stopper run ----')
    const job = this.schedulerRegistry.getCronJob('printer_cron')

    console.log('# Last Date')
    // lastDate() → Date | null (순수 JS Date 객체, UTC 기준)
    // 그래서 toISOString() 하면 항상 UTC 기준 ISO 문자열이 나옴
    console.log(job.lastDate())

    console.log('# Next Date')
    // nextDate() → DateTime (luxon 라이브러리 기반, cron 내부에서 luxon 사용)
    // 그래서 ts와 zone 정보까지 포함되어 있고, Asia/Seoul처럼 타임존도 같이 표시됨.
    console.log(job.nextDate())

    console.log('# Next Dates')
    console.log(job.nextDates(5))

    if (job.isActive) {
      console.log('deactivate printer_cron')
      job.stop()
    } else {
      console.log('activate printer_cron')
      job.start()
    }
  }
}
