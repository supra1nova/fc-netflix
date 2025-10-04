import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { CreateMovieDto } from './dto/create-movie.dto'
import { UpdateMovieDto } from './dto/update-movie.dto'
import { Movie } from './entity/movie.entity'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, In, QueryRunner, Repository } from 'typeorm'
import { MovieDetail } from './entity/movie-detail.entity'
import { Director } from '../director/entity/director.entity'
import { Genre } from '../genre/entities/genre.entity'
import { GetMoviesDto } from './dto/get-movies.dto'
import { CommonService } from '../common/module/common.service'
import { join } from 'path'
import { rename } from 'fs/promises'
import { User } from '../user/entities/user.entity'
import { MovieUserLike } from './entity/movie-user-like.entity'

@Injectable()
export class MovieService {
  constructor(
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,
    @InjectRepository(Director)
    private readonly directorRepository: Repository<Director>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(MovieUserLike)
    private readonly movieUserLikeRepository: Repository<MovieUserLike>,
    // DataSource 는 TypeOrm 에서 가져오므로 그냥 불러오기만 하면 됨
    private readonly datasource: DataSource,
    private readonly commonService: CommonService,
  ) {
  }

  async findListMovie(dto: GetMoviesDto) {
    const { title } = dto

    let qb = this.movieRepository
      .createQueryBuilder('movie')
      .leftJoinAndSelect('movie.director', 'director')
      .leftJoinAndSelect('movie.genres', 'genres')

    if (title) {
      qb = qb.andWhere('movie.title LIKE :title', { title: `%${title}%` })
    }

    // 당연하게도 static 으로 추출해 사용할 수 있으나, 굳이 page형과 cursor형 pagination 을 module 로 사용하기 위해 적용
    // CommonUtil.ApplyPagePaginationParamsToQb(qb, dto)
    // this.commonService.applyPagePaginationParamsToQb(qb, dto)

    this.commonService.applyCursorPaginationParamsToQb(qb, dto)

    const [data, count] = await qb.getManyAndCount()

    const nextCursor = this.commonService.generateNextCursor(data, dto.order)

    return {
      data,
      nextCursor,
      count,
    }
  }

  findOneMovie(id: number) {
    const qb = this.movieRepository
      .createQueryBuilder('movie')
      .leftJoinAndSelect('movie.director', 'director')
      .leftJoinAndSelect('movie.genres', 'genres')
      .leftJoinAndSelect('movie.detail', 'detail')
      .leftJoinAndSelect('movie.creator', 'creator')
      .where('movie.id = :id')
      .setParameter('id', id)

    return qb.getOne()
  }

  async createMovie(createMovieDto: CreateMovieDto, userId: number, qr: QueryRunner) {
    const { genreIds, detail, directorId, ...movieRest } = createMovieDto

    // transaction 적용을 위해서는 개별 repository가 아니라 createQueryRunner.manager 를 이용해야 하며, 메서드의 첫번째 인수에 사용할 entity를 명시 필요(메서드에 따라 다르니 확인 필요)
    const genres = await qr.manager.find(Genre, { where: { id: In(genreIds) } })
    if (genres.length < 1) {
      throw new NotFoundException('genre not found')
    }
    if (genres.length !== genreIds.length) {
      const genreListIds = genres.map((genre) => genre.id)
      const joinedNotFoundGenreIds = genreIds.filter((genre) => !genreListIds.includes(genre)).join(', ')
      throw new NotFoundException(`genre with id ${joinedNotFoundGenreIds} not found`)
    }

    const director = await qr.manager.findOneBy(Director, { id: directorId })
    if (!director) {
      throw new NotFoundException('director not found')
    }

    // createQueryBuilder 의 insert를 사용하는 경우 createQueryRunner.manager 가 붙어도, 자체적으로 엔티티를 명시하고 있으므로 추가할 필요 없음
    const detailInsertResult = await qr.manager
      .createQueryBuilder()
      .insert()
      .into(MovieDetail)
      .values({ detail })
      .execute()
    const detailId = detailInsertResult.identifiers[0].id

    const filename = createMovieDto.movieFileName

    const movieInsertResult = await qr.manager
      .createQueryBuilder()
      .insert()
      .into(Movie)
      .values({
        detail: { id: detailId },
        director,
        creator: { id: userId },
        movieFilePath: filename,
        ...movieRest,
      })
      .execute()
    const movieId = movieInsertResult.identifiers[0].id

    await qr.manager.createQueryBuilder().relation(Movie, 'genres').of(movieId).add(genreIds)

    const tempMovieFilePath = join(process.cwd(), 'public', 'temp', filename)
    const newMovieFilePath = join(process.cwd(), 'public', 'movie', filename)

    // transaction 영향이 없는 곳(다른 로직 실행 후) 에서 실행
    await rename(tempMovieFilePath, newMovieFilePath)

    return await qr.manager.findOne(Movie, { where: { id: movieId }, relations: ['detail', 'director', 'genres'] })
  }

  async createDummyMovies(round: number) {
    const movieCount = await this.movieRepository.count()
    if (movieCount > 10) {
      return `create dummy movies not processed`
    }

    const genres = await this.genreRepository.find()
    const genresCount = genres.length - 1
    const directorsCount = await this.directorRepository.count() - 1

    const randomIdxArr = [] as number[]
    for (let num = 0; num < round; num++) {
      const randomNumber = Math.random()
      randomIdxArr.push(randomNumber)
    }

    const qr = this.datasource.createQueryRunner()
    await qr.connect()
    await qr.startTransaction()

    try {
      for (let i = 0; i < round; i++) {
        const genreId = genres[Math.round(randomIdxArr[i] * genresCount)].id
        const directorId = Math.round(randomIdxArr[i] * directorsCount) + 1

        const createMovieDto: CreateMovieDto = new CreateMovieDto()
        createMovieDto.genreIds = [genreId]
        createMovieDto.title = `test${genreId} 제목${i}`
        createMovieDto.detail = `test${genreId} 내용입니다.`
        createMovieDto.directorId = directorId

        const { genreIds, detail, ...movieRest } = createMovieDto

        const detailInsertResult = await qr.manager
          .createQueryBuilder()
          .insert()
          .into(MovieDetail)
          .values({ detail: createMovieDto.detail })
          .execute()
        const detailId = detailInsertResult.identifiers[0].id

        const movieInsertResult = await qr.manager
          .createQueryBuilder()
          .insert()
          .into(Movie)
          .values({ detail: { id: detailId }, director: { id: directorId }, ...movieRest })
          .execute()
        const movieId = movieInsertResult.identifiers[0].id

        await qr.manager.createQueryBuilder().relation(Movie, 'genres').of(movieId).add(genreIds)
      }

      await qr.commitTransaction()

    } catch (e) {
      await qr.rollbackTransaction()

      throw e
    } finally {
      await qr.release()
      console.log('error occurred during create dummy movies processing')
    }

    return `create dummy movie processed successfully`
  }

  async updateMovie(id: number, updateMovieDto: UpdateMovieDto) {
    const qr = this.datasource.createQueryRunner()
    await qr.connect()
    await qr.startTransaction()

    try {
      const { genreIds, detail, directorId, ...movieRest } = updateMovieDto

      const movie = await this.findOneMovie(id)
      if (!movie) {
        throw new NotFoundException('no movie id found')
      }

      if (genreIds && genreIds.length > 0) {
        const genres = await qr.manager.find(Genre, { where: { id: In(genreIds) } })
        if (genres.length < 1) {
          throw new NotFoundException('genre not found')
        }

        if (genres.length !== genreIds.length) {
          const genreListIds = genres.map((genre: Genre) => genre.id)
          const joinedNotFoundGenreIds = genreIds.filter((genre) => !genreListIds.includes(genre)).join(', ')
          throw new NotFoundException(`${joinedNotFoundGenreIds} genre not found`)
        }

        // relation.of.set 의 경우 관련 데이터를 다 지우고 새로 등록하므로, 특정 데이터를 넣고 지우는 addAndRemove 보다 오히려 깔끔하다고 볼 수 있음
        await qr.manager.createQueryBuilder().relation(Movie, 'genres').of(id).set(genreIds)
      }

      if (directorId) {
        const director = await qr.manager.findOneBy(Director, { id: directorId })
        if (!director) {
          throw new NotFoundException('director not found')
        }
      }

      if (detail) {
        // createQueryBuilder 의 update 사용하는 경우 update 메서드의 첫번째 인수는 entity 가 필수, 두번째 인수는 alias 로 선택
        await qr.manager
          .createQueryBuilder()
          .update(MovieDetail)
          .set({ detail })
          .where('id = :id', { id: movie.detail.id })
          .execute()
      }

      let qb = qr.manager
        .createQueryBuilder()
        .update(Movie)
        .set({ ...movieRest })
        .where('id = :id', { id })

      if (directorId) {
        qb = qb.set({ director: { id: directorId } })
      }

      await qb.execute()

      await qr.commitTransaction()

      return await this.findOneMovie(id)
    } catch (e) {
      await qr.rollbackTransaction()
      throw e
    } finally {
      await qr.release()
    }
  }

  async deleteMovie(id: number) {
    const qr = this.datasource.createQueryRunner()
    await qr.connect()
    await qr.startTransaction()

    try {
      const movie = await this.findOneMovie(id)
      if (!movie) {
        throw new NotFoundException('no movie id found')
      }

      // cascade 가 있음에 따라 movie 부터 삭제 후 연관 테이블의 데이터 삭제 진행
      // createQueryBuilder 의 delete 사용하는 경우 from 메서드를 추가하고 인수로 entity 명시 필수
      await qr.manager.createQueryBuilder().delete().from(Movie).where('id = :id', { id }).execute()
      await qr.manager
        .createQueryBuilder()
        .delete()
        .from(MovieDetail)
        .where('id = :id', { id: movie.detail.id })
        .execute()

      await qr.commitTransaction()
    } catch (e) {
      await qr.rollbackTransaction()
      throw e
    } finally {
      await qr.release()
    }
  }

  async toggleMovieLike(movieId: number, userId: number, isLike: boolean, qr: QueryRunner) {
    const movie = await qr.manager.findOneBy(Movie, { id: movieId })

    if (!movie) {
      throw new BadRequestException('존재하지 않는 영화입니다.')
    }

    const user = await qr.manager.findOneBy(User, { id: userId })

    if (!user) {
      throw new UnauthorizedException('사용자 정보가 존재하지 않습니다.')
    }

    const likeRecord = await qr.manager.findOne(MovieUserLike, { where: { userId, movieId } })

    if (likeRecord) {
      if (isLike === likeRecord.isLike) {
        await qr.manager
          .createQueryBuilder()
          .delete()
          .from(MovieUserLike)
          .where({ movie: { id: movieId }, user: { id: userId } })
          .execute()
      } else {
        await qr.manager
          .createQueryBuilder()
          .update(MovieUserLike)
          .set({ isLike })
          .where('userId = :userId', { userId })
          .andWhere('movieId = :movieId', { movieId })
          .execute()
      }
    } else {
      await qr.manager
        .createQueryBuilder()
        .insert()
        .into(MovieUserLike)
        .values({ movie: { id: movieId }, user: { id: userId }, isLike })
        .execute()
    }

    const result = await qr.manager.findOneBy(MovieUserLike, { movie: { id: movieId }, user: { id: userId } })

    return {
      isLike: result?.isLike ?? null,
    }
  }
}
