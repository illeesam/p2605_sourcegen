# 개발환경 가이드

> 새 개발자가 처음 프로젝트를 받을 때 따라하면 되는 단계.

---

## 1. 사전 준비

### 1-1. JDK 17

```
설치 확인:  java -version   →   17.x.x
```

설치 안 되어 있으면 [Microsoft Build of OpenJDK 17](https://learn.microsoft.com/java/openjdk/download) 또는 Adoptium / Eclipse Temurin 설치.

환경변수:
```
JAVA_HOME = C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot
PATH      에 %JAVA_HOME%\bin 추가
```

### 1-2. IDE — IntelliJ IDEA (권장)

- 내장 Maven 사용 (별도 설치 불필요)
- Lombok 플러그인 설치 (`File → Settings → Plugins → Lombok`)
- Annotation Processing 활성화: `Settings → Build, Execution, Deployment → Compiler → Annotation Processors → Enable annotation processing`

### 1-3. DB

Oracle 또는 PostgreSQL 중 사용할 DB 준비. (둘 다 지원)

**Oracle**
- Oracle 19c, 21c, XE 18+ (XEPDB1)
- 스키마: `SHOPJOY_2604`

**PostgreSQL**
- PostgreSQL 12+
- DB: `postgres` / 스키마: `shopjoy_2604`

DDL 적용:
- Oracle: [ddl_oracle.txt](ddl_oracle.txt) 실행
- PostgreSQL: [ddl_postgresql.txt](ddl_postgresql.txt) 실행

샘플 데이터: `zz_exam1`(3건), `zz_exam2`(15건), `zz_exam3`(40건) 자동 INSERT.

---

## 2. 프로젝트 가져오기

```
git clone <repo>
cd jap_exam123
```

또는 폴더를 그대로 받았으면 IntelliJ 에서 `File → Open → pom.xml 선택 → Open as Project`.

---

## 3. 의존성 다운로드

IntelliJ 가 자동으로 Maven 의존성을 받는다. 안 되면:

```bash
mvn clean compile
```

또는 IntelliJ 내장 Maven:
```powershell
$mvn = "C:\Program Files\JetBrains\IntelliJ IDEA 2024.2.6\plugins\maven\lib\maven3\bin\mvn.cmd"
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot"
& $mvn clean compile
```

이 단계에서 **Q클래스**(`target/generated-sources/annotations/...`)가 자동 생성된다. 자세한 내용은 [README_q.md](README_q.md) 참고.

---

## 4. 실행 (VM 옵션)

DB 접속정보를 VM 옵션으로 전달.

### Oracle 프로파일

```
-Dspring.profiles.active=oracle
-DDB_HOST=<host>
-DDB_PORT=1521
-DDB_NAME=XEPDB1
-DDB_SCHEMA=SHOPJOY_2604
-DDB_USERNAME=<user>
-DDB_PASSWORD=<pwd>
```

### PostgreSQL 프로파일

```
-Dspring.profiles.active=pgsql
-DDB_HOST=<host>
-DDB_PORT=5432
-DDB_NAME=postgres
-DDB_SCHEMA=shopjoy_2604
-DDB_USERNAME=<user>
-DDB_PASSWORD=<pwd>
```

### IntelliJ Run Configuration

1. `Run → Edit Configurations`
2. `+ Application`
3. Main class: `com.exam.jap_exam123.JapExam123Application`
4. **Modify options → Add VM options** 체크
5. VM options 에 위 값 붙여넣기
6. Run

### 명령행 실행 (mvn)

```bash
mvn spring-boot:run \
  -Dspring-boot.run.jvmArguments="-Dspring.profiles.active=oracle -DDB_HOST=localhost -DDB_PORT=1521 -DDB_NAME=XEPDB1 -DDB_SCHEMA=SHOPJOY_2604 -DDB_USERNAME=user -DDB_PASSWORD=pwd"
```

---

## 5. 정상 기동 확인

서버 시작 시 콘솔에 다음과 같은 정보가 출력되면 정상:

```
============================================================
  Application Started
============================================================
  Local        : http://localhost:8080
  Profiles     : active=[oracle], default=[default]
  ...
  DataSource
    URL        : jdbc:oracle:thin:@host:1521/XEPDB1
    ...
============================================================
```

브라우저에서 확인:
- 메인: http://localhost:8080/index.html
- Swagger UI: http://localhost:8080/swagger-ui.html
- API 직접: http://localhost:8080/api/exam1/list

---

## 6. 자주 마주치는 이슈

### 6-1. `cannot find symbol: QZzExam1`

Q클래스 미생성. `mvn clean compile` 한 번.

### 6-2. `Got minus one from a read call`

Oracle JDBC 가 서버 거부. 호스트/포트/방화벽/IP 화이트리스트 확인.

### 6-3. PostgreSQL `relation "..." does not exist`

스키마가 잘못됨. `DB_SCHEMA` 값 확인. PostgreSQL 은 소문자 권장 (`shopjoy_2604`).

### 6-4. 한글 깨짐

- DB: PostgreSQL UTF8 / Oracle AL32UTF8 인코딩
- VM 옵션: `-Dfile.encoding=UTF-8` 추가

### 6-5. 포트 8080 점유

`server.port` 변경 (application.yml) 또는 점유 프로세스 종료.

---

## 7. 코드 변경 후

| 변경 | 추가 작업 |
|---|---|
| Java 코드 | IDE 가 자동 컴파일. AOP/Q클래스도 함께 |
| Entity 컬럼 추가 | `mvn clean compile` (Q클래스 재생성) |
| 정적 리소스 (html/css/js) | 새로고침만으로 반영 |
| pom.xml | IntelliJ Maven 새로고침 |

---

## 8. 주요 라이브러리 버전

자세한 의존성 / 환경 정보는 [README_환경정보.md](README_환경정보.md) 참고.

---

## 9. 디렉터리 구조

```
jap_exam123/
├─ src/main/java/com/exam/jap_exam123/
│  ├─ JapExam123Application.java    ← 진입점
│  ├─ aop/                          ← 로깅 AOP
│  ├─ config/                       ← Auditing/CORS/QueryDSL/Swagger/Startup
│  ├─ controller/                   ← REST API
│  ├─ dto/                          ← Request/Item/Response 통합 DTO
│  ├─ domain/                       ← JPA Entity (BaseEntity 포함)
│  ├─ repository/                   ← JpaRepository + Custom 인터페이스
│  │  └─ impl/                      ← QueryDSL Custom 구현체
│  └─ service/                      ← 비즈니스 로직
├─ src/main/resources/
│  ├─ application.yml               ← 공통 설정
│  ├─ application-oracle.yml        ← Oracle DataSource
│  ├─ application-pgsql.yml         ← PostgreSQL DataSource
│  ├─ logback-spring.xml            ← 로그 (콘솔+파일+SQL)
│  └─ static/                       ← Vue3 CDN 화면
├─ target/generated-sources/        ← Q클래스 (자동 생성, 커밋 X)
├─ logs/                            ← 일별 로그 파일
├─ ddl_oracle.txt                   ← Oracle DDL + 샘플
├─ ddl_postgresql.txt               ← PostgreSQL DDL + 샘플
├─ pom.xml
└─ README_*.md                      ← 문서들
```

---

## 10. 추가 문서

| 문서 | 내용 |
|---|---|
| [README_환경정보.md](README_환경정보.md) | 의존성 / 버전 / 포트 / 패키지 구조 |
| [README_전문.md](README_전문.md) | 전체 API 명세 + 응답 JSON 예제 |
| [README_dto.md](README_dto.md) | DTO 내부 클래스(Request/Item/Response) 사용 흐름 |
| [README_q.md](README_q.md) | QueryDSL Q클래스 개념 / 생성 방법 |
