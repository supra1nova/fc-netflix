import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform, UnauthorizedException } from '@nestjs/common'
import { v4 } from 'uuid'
import { rename } from 'fs/promises'
import { join } from 'path'

@Injectable()
export class MovieFilePipe implements PipeTransform<Express.Multer.File, Promise<Express.Multer.File>> {
  constructor(
    private readonly options: {
      maxSize: number,
      mimeType: string,
    },
  ) {
  }

  async transform(value: Express.Multer.File, metadata: ArgumentMetadata): Promise<Express.Multer.File> {
    console.log(value)
    console.log(metadata)
    if (!value) {
      throw new BadRequestException('Movie 필드는 필수 입니다.')
    }

    const byteSize = 1000 * 1000 * this.options.maxSize
    if (value.size > byteSize) {
      throw new BadRequestException(`${this.options.maxSize} MB 이하의 사이즈만 업로드 가능합니다.`)
    }

    if (value.mimetype !== this.options.mimeType) {
      throw new BadRequestException(`${this.options.mimeType} 만 업로드 가능합니다.`)
    }

    const split = value.originalname.split('.')

    let extension = 'txt'

    if (split.length > 1) {
      extension = split[split.length - 1]
    }

    // uuid_date.txt
    const filename = `${v4()}_${Date.now()}.${extension}`
    const newPath = join(value.destination, filename)

    await rename(value.path, newPath)

    return {
      ...value,
      filename,
      path: newPath,
    }
  }
}
