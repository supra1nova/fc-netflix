import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import * as request from 'supertest'
import { App } from 'supertest/types'
import { AppModule } from '../app.module'
import { User } from '../user/entities/user.entity'
import { Movie } from './entity/movie.entity'
import { Director } from '../director/entity/director.entity'
import { Genre } from '../genre/entities/genre.entity'
import { MovieDetail } from './entity/movie-detail.entity'
import { DataSource } from 'typeorm'
import { MovieUserLike } from './entity/movie-user-like.entity'

describe('MovieController (e2e)', () => {
  let app: INestApplication<App>
  let dataSource: DataSource

  let users: User[]
  let movies: Movie[]
  let directors: Director[]
  let genres: Genre[]

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    /** 실제 프로젝트에 적용했던 pipe 설정을 다시 적용 */
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    await app.init()

    /** 테스트용 DataSource 가져오기 */
    dataSource = app.get<DataSource>(DataSource)

    /** 테스트용 엔티티 Repository 가져오기 */
    const userRepository = dataSource.getRepository(User)
    const movieRepository = dataSource.getRepository(Movie)
    const movieDetailRepository = dataSource.getRepository(MovieDetail)
    const movieUserLikeRepository = dataSource.getRepository(MovieUserLike)
    const directorRepository = dataSource.getRepository(Director)
    const genreRepository = dataSource.getRepository(Genre)

    /** 데이터 초기화 - delete/clear/truncate */
    /*
    await genreRepository.clear()
    await directorRepository.clear()
    await movieUserLikeRepository.clear()
    await movieDetailRepository.clear()
    await movieRepository.clear()
    await userRepository.clear()
    */
    await dataSource.query(`
      TRUNCATE TABLE
        movie_user_like,
        movie_detail,
        movie,
        genre,
        director,
        "user"
      RESTART IDENTITY CASCADE;
    `)

    /** 테스트용 엔티티 생성 및 저장 */
    users = [1, 2].map((number) =>
      userRepository.create({
        id: number,
        email: `user${number}@test.com`,
        password: `password${number}`,
      }),
    )
    await userRepository.save(users)

    directors = [1, 2].map((number) =>
      directorRepository.create({
        id: number,
        dob: new Date(1990, 1, number),
        nationality: `country${number}`,
        name: `director${number}`,
      }),
    )
    await directorRepository.save(directors)

    genres = [1, 2].map((number) =>
      genreRepository.create({
        id: number,
        name: `genre${number}`,
        description: `description ${number}`,
      }),
    )
    await genreRepository.save(genres)

    movies = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((number) =>
      movieRepository.create({
        id: number,
        title: `title${number}`,
        creator: users[0],
        genres: genres,
        likeCount: 0,
        dislikeCount: 0,
        detail: movieDetailRepository.create({
          detail: `movie detail${number}`,
        }),
        movieFilePath: `movieFilePath${number}`,
        director: directors[0],
        createdAt: new Date(`2021-9-${number}`),
      }),
    )
    await movieRepository.save(movies)
  })

  beforeEach(async () => {})

  afterAll(async () => {
    /** 테스트 이후 DB 커넥션 종료 */
    await dataSource.destroy()

    /** 테스트 이후 NestJS 앱 종료 처리 */
    await app.close()
  })

  /*it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!')
  })*/

  describe('[GET /movie]', () => {
    it('Should get all movies', async () => {
      const { body, statusCode, error } = await request(
        app.getHttpServer(),
      ).get('/movie')

      expect(statusCode).toBe(200)
    })
  })
})
