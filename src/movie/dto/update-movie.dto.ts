import { IsOptional, IsString, Validate, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { Transform } from 'class-transformer';

enum MovieGenre {
  FNTS = 'fantasy',
  HRRR = 'horror',
  ACTN = 'action',
}

@ValidatorConstraint()
class PasswordValidator implements ValidatorConstraintInterface {
  validate(value: any, validationArguments?: ValidationArguments): Promise<boolean> | boolean {
    // 비밀번호 길이는 4-8
    return value.length > 4 && value.length < 8;
  }

  defaultMessage(validationArguments?: ValidationArguments): string {
    return '비밀번호의 길이는 4-8자 여야 합니다. ($value)';
  }
}

export class UpdateMovieDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  genre?: string;

  // @IsEnum(MovieGenre)
  // @IsOptional()
  // test?: string[];

  // @Transform(( transformFnParams) => {
  //   const movieGenreElement: MovieGenre = MovieGenre[transformFnParams.value];
  //   if (!movieGenreElement) {
  //     return undefined
  //   }
  //   return transformFnParams.value;
  // })
  // test1: keyof typeof MovieGenre;

  @Validate(PasswordValidator, { message: '커스텀 에러 메세지' })
  test: string;
}
