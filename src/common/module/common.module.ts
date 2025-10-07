import { Module } from '@nestjs/common'
import { CommonService } from './common.service'
import { MulterModule } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { join } from 'path'
import { v4 } from 'uuid'
import { format } from 'date-fns'
import { CommonController } from './common.controller'
import { TasksService } from '../tasks.service'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Movie } from '../../movie/entity/movie.entity'
import { DefaultLogger } from '../logger/default.logger'

@Module({
  imports: [
    TypeOrmModule.forFeature([Movie]),
    MulterModule.register({
      storage: diskStorage(
        {
          // path 의 join 함수를 통해 경로를 이어 붙일수 있음, path 는 nodejs 에서 지원하는 내장 함수
          // .../netflix/public/movie
          // OS 가 달라지면 폴더 표기가 달라질 수 있으므로 사용 필요
          // cwd: current working directory
          destination: join(process.cwd(), 'public', 'temp'),
          // filename 지정
          // cb(발생되는error유형, 파일명) 형태로 제공되며, 에러가 없을 경우 null 을 입력
          // filename 을 설정하지 않으면 Multer가 스스로 랜덤하게 파일 이름을 지정 및 저장
          filename: (req, file, cb) => {
            const dateString = format(new Date, 'yyyyMMddHHmmss')

            // file extension 의 경우 게시물을 실제 저장할 때 mimetype 을 확인해서 db에 저장한 뒤 불러와 붙일 예정이므로 굳이 저장할 필요 없음
            const filename = `${v4()}_${dateString}.txt`

            console.log(filename)

            cb(null, filename)
          },
        },
      ),
    }),
  ],
  controllers: [CommonController],
  providers: [CommonService, TasksService, DefaultLogger],
  exports: [CommonService, DefaultLogger],
})
export class CommonModule {
}
