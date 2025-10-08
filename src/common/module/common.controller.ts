import { BadRequestException, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth } from '@nestjs/swagger'

@Controller('common')
@ApiBearerAuth()
export class CommonController {
  @Post('upload/text')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 1000 * 1000 * 20,
    },
    fileFilter(req, file, callback) {
      if (file.mimetype !== 'text/plain') {
        return callback(new BadRequestException('TXT 파일만 업로드 가능합니다'), false)
      }

      return callback(null, true)
    },
  }))
  postText(
    @UploadedFile() text: Express.Multer.File,
  ) {
    console.log(text)
    // 위의 FileInterceptor 를 지나는 것만으로도 파일 자체는 자동으로 검증/폴더 저장까지 됨
    // 따라서 생성된 파일 이름을 돌려줘야 클라이언트에서 해당하는 파일 이름으로 게시글 저장시 함께 요청
    return {
      fileName: text.filename
    }
  }
}
