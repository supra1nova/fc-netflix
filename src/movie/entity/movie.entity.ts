import { Exclude, Expose } from 'class-transformer';

@Exclude()  // 적용시 return 안됨, 다만 하위 필드/method 가 @Expose() 를 달고 있으면 노출 가능
export class Movie {
  @Expose()
  id: number;
  @Expose()
  title: string;

  genre: string;

  @Expose()
  get description() {
    return '영화재밌어요.'
  }
}
