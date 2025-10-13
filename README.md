# FC-Netflix

NestJS + TypeScript 기반 Netflix 유사 웹 서비스 토이 프로젝트.  

---

## 📚 프로젝트 목적
- TypeScript, NestJS, TypeOrm, Swagger 기반 Netflix 형태 백엔드 서비스를 GitHub actions 을 이용해 AWS EC2에 배포함으로써,
- JWT 인증, Winston 로깅, Redis 캐시, Jest 테스트(Unit/Integration/e2e2), 배포, Swagger 문서화 등 회사에서 수행했던 내용을 간단하게 다시 정리하고, 
- 잘못된 지식을 다시 고쳐 올바르게 기록하는 것을 주 목적으로 함. 

---

## 주요 기능
- **영화, 장르, 감독, 유저 CRUD**
- **회원가입 / 로그인**
    - Base64 ID/Password 사용
    - Access / Refresh 토큰 발급
    - 비밀번호 bcrypt 해싱 후 DB 저장
- **Redis 캐시**
    - 일부 조회 API에 적용 (영화 목록 등)
    - 캐시 미스 시 DB 조회 후 Redis 적재
- **Winston 로깅**
    - 콘솔 로그 중심
    - 환경변수 기반 로그 레벨 관리
- **문서화**
    - NestJS @nestjs/swagger 활용
    - /doc 엔드포인트 제공
    - 모든 모듈별 엔드포인트 및 요청/응답 스키마 확인 가능

---

## 브랜치 전략 (Git Flow)
- **main**: 운영 서버 배포 가능한 상태의 코드
- **develop**: 개발 서버 배포 가능한 상태의 코드 및 기능 개발 통합 브랜치
- **feature/{기능명}**: 신규 기능 개발 브랜치
- **fix/{기능명}**: 수정 사항 브랜치
- feature/fix 브랜치에서 개발/수정, 필요시 rebase로 충돌 최소화
- Git Flow 규칙을 따르며, PR 후 develop/main 병합

---

## 아키텍처 / 구조
- **모노레틱(Monolithic) 구조**로 모든 모듈이 하나의 애플리케이션 안에 통합
- 모듈: `AuthModule`, `UserModule`, `MovieModule`, `GenreModule`, `DirectorModule`
- 각 모듈: Controller → Service → Repository
- 환경 변수 관리: DB, Redis, JWT 비밀 키 등 `.env` 기반
- 로깅: Winston + NestJS 인터셉터

---

## 인증 / 토큰 흐름
1. Base64 인코딩 ID/Password를 이용한 로그인
2. Access / Refresh 토큰 발급
3. Access 토큰 만료 시 Refresh 토큰으로 재발급
4. Refresh 토큰 무효화 시 재로그인 필요

---

## 테스트
- **Unit 테스트**
    - 서비스 레이어 기능 검증
    - CRUD 정상/예외 처리
- **Integration 테스트**
    - DB + Redis 연결 후 CRUD 및 캐시 흐름 검증

---

## Winston 로깅
- 로그 레벨: debug
- 파일 로그 로컬 미생성 -> 추후 적용 예정

---

## Swagger 사용
- 서버 실행 후 /doc 접속
- API 엔드포인트 확인 및 테스트 가능
- NestJS 모듈에서 @ApiTags, @ApiOperation, @ApiResponse 등 내장 데코레이터 외 커스텀 데코레이터 사용

---

## 현재 작업 중 및 예정 사항
- e2e 작업중
- AWS 배포 예정
- Docker 컨테이너화 예정
- CI/CD 파이프라인 예정
- 전역적인 Redis 캐시 활용으로 조회 성능 최적화 예정
- MSA 아키텍쳐 적용해 서비스 분리 예정
- 로그 Sentry 오류 추적 예정
- dev 환경 이상인 경우 Winston 로그 저장 예정
- 암호화 해시 알고리즘 argon2 로 전환 예정

---

## 환경 변수 예시 (.env)
```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=secret
DB_DATABASE=fc_netflix
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
```

---

## ⚡ 설치 및 실행

```bash
# 프로젝트 설치
npm install

# 개발 모드 실행
npm run start:dev

# 프로덕션 모드 실행
npm run start:prod
```

---

## 🧪 테스트 실행
- 현재 

```bash
# 단위 테스트
npm run test

# e2e 테스트
npm run test:e2e

# 테스트 커버리지 확인
npm run test:cov
```

---

## 📝 기타

* NestJS 공식 구조와 스타일을 준수
* TypeScript 기반으로 안전한 타입 체킹
* 개인 학습용 프로젝트로 실제 서비스와는 무관
