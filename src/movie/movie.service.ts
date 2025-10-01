import { Injectable, NotFoundException } from '@nestjs/common'
import { CreateMovieDto } from './dto/create-movie.dto'
import { UpdateMovieDto } from './dto/update-movie.dto'
import { Movie } from './entity/movie.entity'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, In, Repository } from 'typeorm'
import { MovieDetail } from './entity/movie-detail.entity'
import { Director } from '../director/entity/director.entity'
import { Genre } from '../genre/entities/genre.entity'

@Injectable()
export class MovieService {
  constructor(
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
    // DataSource 는 TypeOrm 에서 가져오므로 그냥 불러오기만 하면 됨
    private readonly datasource: DataSource,
  ) {}

  findListMovie(title?: string) {
    let qb = this.movieRepository
      .createQueryBuilder('movie')
      .leftJoinAndSelect('movie.director', 'director')
      .leftJoinAndSelect('movie.genres', 'genres')

    if (title) {
      qb = qb.andWhere('movie.title LIKE :title', { title: `%${title}%` })
    }

    return qb.orderBy('movie.createdAt', 'DESC').getManyAndCount()
  }

  findOneMovie(id: number) {
    const qb = this.movieRepository
      .createQueryBuilder('movie')
      .leftJoinAndSelect('movie.director', 'director')
      .leftJoinAndSelect('movie.genres', 'genres')
      .leftJoinAndSelect('movie.detail', 'detail')
      .where('movie.id = :id')
      .setParameter('id', id)

    return qb.getOne()
  }

  async createMovie(createMovieDto: CreateMovieDto) {
    // 새로운 QueryRunner 인스턴스를 생성
    // QueryRunner는 TypeORM에서 하나의 데이터베이스 커넥션을 수동으로 제어할 수 있는 도구
    // 자동 커밋되는 일반 Repository 메서드와 달리, 직접 커넥션 열고, 트랜잭션을 시작하고, 커밋/롤백하는 작업을 수동으로 처리 가능
    // 이 시점에서는 아직 커넥션을 할당받지 않았고, 단지 껍데기 객체(QueryRunner)만 생성된 상태
    const qr = this.datasource.createQueryRunner()
    // 내부적으로 커넥션 풀에서 커넥션 하나를 꺼내 QueryRunner와 연결하고, release() 하기 전까지 유지됨
    // 이 커넥션은 트랜잭션 전용이며, 이 QueryRunner를 통해 실행되는 모든 쿼리는 같은 커넥션 안에서 실행됨
    await qr.connect()
    // 내부적 DB에 START TRANSACTION 또는 BEGIN 명령을 날려 트랜잭션을 시작하며, 이후 실행되는 쿼리들은 모두 이 트랜잭션 안에서 실행
    // COMMITTED < READ UNCOMMITTED < REPEATABLE READ < SERIALIZABLE 순으로 강력함(순위가 높아짐), 그 중 택일 할 수 있으나 기본은 READ COMMITTED 로 작동
    await qr.startTransaction()

    try {
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

      const movieInsertResult = await qr.manager
        .createQueryBuilder()
        .insert()
        .into(Movie)
        .values({ detail: { id: detailId }, director, ...movieRest })
        .execute()
      const movieId = movieInsertResult.identifiers[0].id

      await qr.manager.createQueryBuilder().relation(Movie, 'genres').of(movieId).add(genreIds)

      // 트랜잭션 내에서 실행한 모든 변경사항(INSERT, UPDATE, DELETE 등)을 DB에 확정 반영
      await qr.commitTransaction()

      return await this.findOneMovie(movieId)
    } catch (e) {
      // 트랜잭션 내에서 실행된 모든 변경사항을 되돌림
      await qr.rollbackTransaction()

      // 그리고 에러 반환
      throw e
    } finally {
      // QueryRunner는 커넥션 풀에서 커넥션을 가져와 사용하기 때문에, 사용이 끝난 뒤 반드시 release()를 호출해서 커넥션을 반환해야 함.
      // 커넥션 풀에 커넥션을 반환하지 않으면 물고 있을 수 있으므로 꼭 반환 필수
      await qr.release()
    }
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
}
