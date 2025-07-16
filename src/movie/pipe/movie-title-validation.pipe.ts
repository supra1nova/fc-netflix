import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common'

// PipeTransform의 generic type에는 parameter의 type과, 최종적으로 return 될 타입을 명시
@Injectable()
export class MovieTitleValidationPipe implements PipeTransform<string, string> {
  // transform 의 value 에는 검증 대상의 값이 parameter 로 들어옴
  transform(value: string, metadata: ArgumentMetadata): string {
    // 값이 없는경우 그냥 지나감
    if (!value) {
      return value
    }

    // 값이 들어왔을 경우, 만약 글자 길이가 2자이거나 작으면 에러 발생
    if (value.length <= 2) {
      throw new BadRequestException('The title should be more than 3 characters long')
    }
    return value
  }
}
