# 환경정보

> 프로젝트 의존성 / 버전 / 설정 / 포트 한눈.

---

## 1. 기술 스택

| 영역 | 기술 | 버전 |
|---|---|---|
| 언어 | Java | 17 |
| 프레임워크 | Spring Boot | 3.3.0 |
| ORM | Spring Data JPA + Hibernate | (Boot 동봉, Hibernate 6.5.x) |
| Type-safe Query | QueryDSL | 5.1.0 (jakarta) |
| Validation | Jakarta Bean Validation | (starter-validation) |
| 보일러플레이트 | Lombok | (Boot 동봉) |
| API 문서 | springdoc-openapi | 2.6.0 |
| 로깅 | SLF4J + Logback | (Boot 동봉) |
| AOP | Spring AOP / AspectJ | (starter-aop) |
| DB Driver | Oracle JDBC (ojdbc11) / PostgreSQL JDBC | (Boot 동봉) |
| 빌드 | Maven | 3.x |
| Frontend | Vue 3 (CDN) + JSZip (CDN) | latest |

---

## 2. 빌드 설정 (pom.xml)

| 설정 | 값 |
|---|---|
| Java version | 17 |
| Parent | `spring-boot-starter-parent:3.3.0` |
| Annotation Processor | `lombok` + `querydsl-apt:jakarta` + `jakarta.persistence-api:3.1.0` |
| 패키징 | jar |
| Spring Boot Maven Plugin | Lombok exclude (실행 jar 슬림화) |

---

## 3. 의존성 목록

```xml
spring-boot-starter-web
spring-boot-starter-data-jpa
spring-boot-starter-validation
spring-boot-starter-aop
com.querydsl:querydsl-jpa:5.1.0:jakarta
com.oracle.database.jdbc:ojdbc11
org.postgresql:postgresql
org.springdoc:springdoc-openapi-starter-webmvc-ui:2.6.0
org.projectlombok:lombok
spring-boot-starter-test
```

---

## 4. 프로파일

| 프로파일 | 파일 | 용도 |
|---|---|---|
| (active) | application.yml | 공통 (JPA / Swagger) |
| `oracle` | application-oracle.yml | Oracle DataSource + Dialect |
| `pgsql` | application-pgsql.yml | PostgreSQL DataSource + Dialect |

선택: `-Dspring.profiles.active=oracle` 또는 `pgsql` (기본값: oracle)

---

## 5. 환경변수 (DB 접속)

| 변수 | 기본값 | 설명 |
|---|---|---|
| `DB_HOST` | (필수) | DB 호스트 |
| `DB_PORT` | (필수) | DB 포트 (Oracle 1521 / PG 5432) |
| `DB_NAME` | XEPDB1 / postgres | DB명/SID |
| `DB_SCHEMA` | SHOPJOY_2604 / shopjoy_2604 | 스키마 |
| `DB_USERNAME` | (필수) | DB 사용자 |
| `DB_PASSWORD` | (필수) | DB 비밀번호 |

---

## 6. 포트 / URL

| 항목 | 값 |
|---|---|
| 서버 포트 | 8080 |
| 메인 화면 | http://localhost:8080/index.html |
| Swagger UI | http://localhost:8080/swagger-ui.html |
| OpenAPI JSON | http://localhost:8080/v3/api-docs |

---

## 7. 패키지 구조

```
com.exam.jap_exam123
├─ JapExam123Application       (진입점, @EnableJpaRepositories)
├─ aop
│  └─ LoggingAspect             (Controller/Service/Repository 호출 로깅)
├─ config
│  ├─ JpaAuditingConfig         (@EnableJpaAuditing + AuditorAware)
│  ├─ OpenApiConfig             (Swagger 메타정보)
│  ├─ QueryDslConfig            (JPAQueryFactory Bean)
│  ├─ StartupInfoLogger         (시작 시 환경 출력)
│  └─ WebConfig                 (전역 CORS)
├─ controller
│  ├─ GlobalExceptionHandler
│  ├─ ZzExam1Controller
│  ├─ ZzExam2Controller
│  └─ ZzExam3Controller
├─ dto
│  ├─ ZzExam1Dto                (Request / Item / Response)
│  ├─ ZzExam2Dto
│  └─ ZzExam3Dto
├─ domain
│  ├─ BaseEntity                (감사 필드)
│  ├─ ZzExam1
│  ├─ ZzExam2 + ZzExam2Id
│  └─ ZzExam3 + ZzExam3Id
├─ repository
│  ├─ ZzExam{1,2,3}Repository
│  ├─ ZzExam{1,2,3}RepositoryCustom
│  └─ impl
│     └─ ZzExam{1,2,3}RepositoryCustomImpl
└─ service
   ├─ ZzExam1Service
   ├─ ZzExam2Service
   └─ ZzExam3Service
```

---

## 8. 적용된 패턴 / 규칙

### Controller
- `@Tag` / `@Operation` / `@Parameter` (Swagger)
- `@Valid` (Bean Validation)
- `@PathVariable("name")` (명시적)

### DTO (`ZzExamN Dto`)
- 정적 내부 클래스 3종: `Request` / `Item` / `Response`
- `Request`: `@NotBlank` / `@Size` 검증 + `toEntity()` 변환
- `Item`: `@QueryProjection` 생성자 (QueryDSL 직접 매핑)
- `Response`: `content + totalCount + page + size + totalPages`

### Service
- 클래스 레벨 `@Transactional(readOnly = true)`
- 변경 메서드(`insert/update/delete`)만 `@Transactional` 메서드 레벨 override

### Repository
- `JpaRepository` + Custom 인터페이스 + CustomImpl 분리
- `@EnableJpaRepositories(repositoryImplementationPostfix = "CustomImpl")`
- QueryDSL: `selectById` / `selectList` / `selectPageList`
- 정렬: `sortBy = "컬럼 asc/desc"` 단일 파라미터, switch 분기, 빈값/매칭없음 = ORDER BY 미적용
- 검색: `containsIgnoreCase` (ID), `like("%x%")` (이름)

### Domain
- 모든 엔티티 `BaseEntity` 상속 → 감사 필드 4개 자동 채움
- 복합 PK 는 `@EmbeddedId` + 별도 `XxxId` 클래스

### Logging
- AOP 로 통합 (Controller `▶ ◀` / Service `▶▶ ◀◀` / Repository `▶▶▶ ◀◀◀`)
- 콘솔 + 파일 (`logs/jap_exam123.log` 일별 분할 30일 보관)
- SQL 출력: `org.hibernate.SQL=DEBUG` + 바인딩 파라미터 `org.hibernate.orm.jdbc.bind=TRACE`

### CORS
- 전역 (`/**` 모든 origin/method/header 허용)

### Auditing
- `BaseEntity` + `@EnableJpaAuditing` + `AuditorAware<String>` (현재 `"system"` 고정)

---

## 9. 정적 리소스 (Frontend)

| 파일 | 용도 |
|---|---|
| `index.html` | 메인 (사이드바 + iframe) |
| `exam1.html` | Exam1 그리드 (정렬) |
| `exam2.html` | Exam2 그리드 + 아코디언 (자식 exam3) |
| `exam3.html` | Exam3 트리 (3단) |
| `sourcegen_oracle.html` | Oracle DDL → 소스 생성기 |
| `sourcegen_postgresql.html` | PostgreSQL DDL → 소스 생성기 |
| `common.css` | 공통 스타일 |
| `common.js` | 공통 Vue 앱 팩토리 (`createExamApp`) |
| `sourcegen.js` | DDL 파서 + 코드 생성기 |

---

## 10. Q클래스 (자동 생성)

`mvn compile` 시 `target/generated-sources/annotations/` 에 자동 생성:
- `domain/QZzExam{1,2,3,2Id,3Id}.java`
- `dto/QZzExam{1,2,3}Dto_Item.java`

자세한 내용: [README_q.md](README_q.md)

---

## 11. 로그 파일

| 위치 | 파일명 | 정책 |
|---|---|---|
| 현재 로그 | `logs/jap_exam123.log` | 실시간 |
| 일별 백업 | `logs/jap_exam123.YYYY-MM-DD.log` | 매일 자정 분할 |
| 보관 | 30일 / 1GB cap | 초과 시 삭제 |

---

## 12. 다른 문서

- [README_개발환경가이드.md](README_개발환경가이드.md) — 새 개발자 시작 가이드
- [README_전문.md](README_전문.md) — 전체 API 명세
- [README_dto.md](README_dto.md) — DTO 내부 클래스 흐름
- [README_q.md](README_q.md) — Q클래스 가이드
