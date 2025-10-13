import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import * as request from 'supertest'
import { App } from 'supertest/types'
import { AppModule } from '../app.module'
import { Role, User } from '../user/entities/user.entity'
import { Movie } from './entity/movie.entity'
import { Director } from '../director/entity/director.entity'
import { Genre } from '../genre/entities/genre.entity'
import { MovieDetail } from './entity/movie-detail.entity'
import { DataSource } from 'typeorm'
import { MovieUserLike } from './entity/movie-user-like.entity'
import { AuthService } from '../auth/auth.service'
import { CreateMovieDto } from './dto/create-movie.dto'
import { UpdateMovieDto } from './dto/update-movie.dto'

describe('MovieController (e2e)', () => {
  let app: INestApplication<App>
  let dataSource: DataSource

  let users: User[]
  let movies: Movie[]
  let directors: Director[]
  let genres: Genre[]

  let accessToken: string

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

    /** 토큰 위해 auth service 호출 */
    let authService = moduleFixture.get(AuthService)

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

    accessToken = await authService.issueToken(
      { sub: users[0].id, role: Role.ADMIN },
      false,
    )
  })

  beforeEach(async () => {})

  afterAll(async () => {
    /** 테스트 이후 DB 커넥션 종료 */
    await dataSource.destroy()

    /** 테스트 이후 NestJS 앱 종료 처리 */
    await app.close()
  })

  describe('[GET /movie]', () => {
    it('Should get all movies', async () => {
      const { body, statusCode, error } = await request(
        app.getHttpServer(),
      ).get('/movie')

      expect(statusCode).toBe(200)
      expect(body).toHaveProperty('data')
      expect(body).toHaveProperty('nextCursor')
      expect(body).toHaveProperty('count')
      expect(body.data).toHaveLength(5)
    })
  })

  describe('[GET /movie/recent]', () => {
    it('Should throw ForbiddenException recent movies', async () => {
      const { body, statusCode, error } = await request(
        app.getHttpServer(),
      ).get('/movie/recent')

      expect(statusCode).toBe(403)
    })

    it('Should get recent movies', async () => {
      const { body, statusCode, error } = await request(app.getHttpServer())
        .get('/movie/recent')
        .set('Authorization', `Bearer ${accessToken}`)

      expect(statusCode).toBe(200)
      expect(body).toHaveLength(10)
    })
  })

  describe('[GET /movie/{id}', () => {
    it('should throw NotFoundException if movie does not exist ', async () => {
      await request(app.getHttpServer())
        .get('/movie/99')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
    })

    it('should return movie with specific id', async () => {
      await request(app.getHttpServer())
        .get(`/movie/${movies[0].id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id')
          expect(res.body).toHaveProperty('title')
          expect(res.body).toHaveProperty('likeCount')
          expect(res.body.id).toBe(movies[0].id)
        })
    })
  })

  describe('[Post /movie]', () => {
    it('Should create movie', async () => {
      const {
        body: { fileName },
      } = await request(app.getHttpServer())
        .post(`/common/upload/text`)
        .set('Authorization', `Bearer ${accessToken}`)
        /**
         * supertest의 attach 함수로 파일 첨부
         *   두번재 파라미터에 수신받게 파일명 명시 -> 로직 실행시 첨부된 파일 생성됨
         * */
        .attach('file', Buffer.from('test'), 'test.txt')
        .expect(201)

      const dto = {
        title: 'e2e test title1',
        detail: 'e2e test details 1',
        directorId: directors[0].id,
        genreIds: genres.map((genre) => genre.id),
        movieFileName: fileName,
      } as CreateMovieDto

      await request(app.getHttpServer())
        .post('/movie')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(dto)
        .expect(201)
        .expect((res) => {
          expect(res.body.title).toBe(dto.title)
          expect(res.body.detail.detail).toBe(dto.detail)
          expect(res.body.director.id).toBe(dto.directorId)
          expect(res.body.genres[0].id).toBe(dto.genreIds[0])
          expect(res.body.movieFilePath).toContain(dto.movieFileName)
        })
    })
  })

  describe('[Patch /movie/{id}]', () => {
    it('Should update movie', async () => {
      const movieId = movies[0].id

      const dto = {
        title: 'update e2e test title1',
        detail: 'update e2e test details 1',
        directorId: directors[1].id,
        genreIds: [genres[0].id],
      } as UpdateMovieDto

      await request(app.getHttpServer())
        .patch(`/movie/${movieId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(dto)
        .expect(200)
        .expect((res) => {
          expect(res.body.title).toBe(dto.title)
          expect(res.body.detail.detail).toBe(dto.detail)
          expect(res.body.director.id).toBe(dto.directorId)
          expect(res.body.genres[0].id).toBe(dto.genreIds?.[0])
        })
    })
  })

  describe('[Delete /movie/id]')
})
