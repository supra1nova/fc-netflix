import { IsOptional, IsString, registerDecorator, Validate, ValidationArguments, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { Transform } from 'class-transformer';

enum MovieGenre {
  FNTS = 'fantasy',
  HRRR = 'horror',
  ACTN = 'action',
}

@ValidatorConstraint({
  // 비동기로 처리 가능
  async: true,
})
class PasswordValidator implements ValidatorConstraintInterface {
  validate(value: any, validationArguments?: ValidationArguments): Promise<boolean> | boolean {
    // 비밀번호 길이는 4-8
    return value.length > 4 && value.length < 8;
  }

  defaultMessage(validationArguments?: ValidationArguments): string {
    return '비밀번호의 길이는 4-8자 여야 합니다. ($value)';
  }
}

// custom validation decorator
function IsPasswordValid(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: PasswordValidator,
    })
  };
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

  // @Validate(PasswordValidator, { message: '커스텀 에러 메세지' })
  @IsPasswordValid({message: 'testing'})
  test: string;
}
