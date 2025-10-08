/** @nestjs/mapped-types 의 기본 내장 PartialType을 이용하면 당연히 작동하는게 정상이지만
 *  객체가 swagger 에서 빈값으로 나오며 인식되지 않음 -> @nestjs/swagger 에서 import 하면 같은 기능이지만 swagger에서 인식함
 */
// import { PartialType } from '@nestjs/mapped-types'
import { PartialType } from '@nestjs/swagger'
import { CreateMovieDto } from './create-movie.dto'

export class UpdateMovieDto extends PartialType(CreateMovieDto) {}
