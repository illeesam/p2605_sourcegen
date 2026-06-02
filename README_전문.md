# jap_exam123 - 전체 API 명세

> Spring Boot 3.3 + JPA + QueryDSL + Oracle / Vue3 CDN
>
> 모든 응답은 `application/json; charset=UTF-8`
> Base URL: `http://localhost:8080`

---

## 목차

- [공통 규약](#공통-규약)
- [Exam1 API](#exam1-api)
- [Exam2 API](#exam2-api)
- [Exam3 API](#exam3-api)
- [정렬 / 페이징 사용법](#정렬--페이징-사용법)
- [에러 응답](#에러-응답)

---

## 공통 규약

### 페이지/정렬 파라미터 (모든 목록 API 공통)

| 이름 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `page` | int | 1 | 1부터 시작 |
| `size` | int | 10 | 페이지 크기 |
| `sortBy` | string | `""` (미적용) | `"컬럼명 asc"` 또는 `"컬럼명 desc"`. 빈값/매칭없음 → ORDER BY 자체가 SQL에 포함되지 않음 |

### 검색 조건

- 모든 문자열 컬럼은 LIKE 검색 (`%값%`)
- ID 계열: `containsIgnoreCase` (DB는 LOWER 양변 비교)
- Name 계열(`exam{N}_nm`): `LIKE '%값%'` (대소문자 구분, Oracle 기본)
- 빈값/null은 조건에서 자동 제외

### 응답 공통 구조

| 응답 형태 | 사용처 |
|---|---|
| `Item` | 단건 조회 (selectById), 등록/수정 응답 |
| `List<Item>` | 전체 목록 (selectList) |
| `Response { content, totalCount, page, size, totalPages }` | 페이지 목록 (selectPageData) |

---

## Exam1 API

`zz_exam1` (단일 PK: `exam1_id`)

### 1) 단건 조회

| 항목 | 내용 |
|---|---|
| Method | `GET` |
| URL | `/api/exam1/{exam1Id}` |
| 응답 | `ZzExam1Dto.Item` |
| 실패 | `404 Not Found` |

**요청 예시**
```
GET /api/exam1/A001
```

**응답 예시 (200 OK)**
```json
{
  "exam1Id": "A001",
  "exam1Nm": "카테고리A",
  "col11": "a11",
  "col12": "a12",
  "col13": "a13",
  "col14": "a14",
  "col15": "a15"
}
```

---

### 2) 전체 목록 (페이징 X)

| 항목 | 내용 |
|---|---|
| Method | `GET` |
| URL | `/api/exam1/list` |
| Query | 검색조건 동일, `page`/`size`는 무시됨 |
| 응답 | `List<ZzExam1Dto.Item>` |

**요청 예시 (검색조건 + 정렬)**
```
GET /api/exam1/list?exam1Nm=카테고리&sortBy=exam1Id desc
```

**응답 예시 (200 OK)**
```json
[
  {
    "exam1Id": "B001",
    "exam1Nm": "카테고리B",
    "col11": "b11", "col12": "b12", "col13": "b13", "col14": "b14", "col15": "b15"
  },
  {
    "exam1Id": "A001",
    "exam1Nm": "카테고리A",
    "col11": "a11", "col12": "a12", "col13": "a13", "col14": "a14", "col15": "a15"
  }
]
```

---

### 3) 페이지 목록

| 항목 | 내용 |
|---|---|
| Method | `GET` |
| URL | `/api/exam1/page-list` |
| 응답 | `ZzExam1Dto.Response` (content + 페이징 메타) |

**Query 파라미터 전체**

| 이름 | 예시 | 설명 |
|---|---|---|
| `exam1Id` | `A` | LIKE `%A%` |
| `exam1Nm` | `카테` | LIKE `%카테%` |
| `col11`~`col15` | `a1` | 각 컬럼 LIKE |
| `page` | `1` | 기본 1 |
| `size` | `10` | 기본 10 |
| `sortBy` | `exam1Nm asc` | 정렬 (아래 표 참고) |

**`sortBy` 가능 값**

| 값 | 효과 |
|---|---|
| (빈값/생략) | ORDER BY 미적용 |
| `exam1Id asc` / `exam1Id desc` | exam1_id 정렬 |
| `exam1Nm asc` / `exam1Nm desc` | exam1_nm 정렬 |
| `col11 asc` ~ `col15 desc` | 일반 컬럼 정렬 |

**요청 예시 1: 단순 페이지 조회**
```
GET /api/exam1/page-list?page=1&size=5
```

**응답 예시 1**
```json
{
  "content": [
    { "exam1Id": "A001", "exam1Nm": "카테고리A",
      "col11": "a11", "col12": "a12", "col13": "a13", "col14": "a14", "col15": "a15" },
    { "exam1Id": "B001", "exam1Nm": "카테고리B",
      "col11": "b11", "col12": "b12", "col13": "b13", "col14": "b14", "col15": "b15" }
  ],
  "totalCount": 2,
  "page": 1,
  "size": 5,
  "totalPages": 1
}
```

**요청 예시 2: 검색 + 정렬 + 페이징**
```
GET /api/exam1/page-list?exam1Nm=카테&sortBy=exam1Nm desc&page=2&size=10
```

**응답 예시 2**
```json
{
  "content": [],
  "totalCount": 2,
  "page": 2,
  "size": 10,
  "totalPages": 1
}
```

---

### 4) 등록

| 항목 | 내용 |
|---|---|
| Method | `POST` |
| URL | `/api/exam1` |
| Body | `ZzExam1Dto.Request` (페이징/정렬 필드는 무시) |
| 응답 | `ZzExam1Dto.Item` |
| 실패 | `400 Bad Request` (PK 중복) |

**요청 예시**
```http
POST /api/exam1
Content-Type: application/json

{
  "exam1Id": "C001",
  "exam1Nm": "카테고리C",
  "col11": "c11",
  "col12": "c12",
  "col13": null,
  "col14": null,
  "col15": null
}
```

**응답 예시 (200 OK)**
```json
{
  "exam1Id": "C001",
  "exam1Nm": "카테고리C",
  "col11": "c11",
  "col12": "c12",
  "col13": null,
  "col14": null,
  "col15": null
}
```

---

### 5) 수정

| 항목 | 내용 |
|---|---|
| Method | `PUT` |
| URL | `/api/exam1/{exam1Id}` |
| Body | `ZzExam1Dto.Request` (PK는 path 우선) |
| 응답 | `ZzExam1Dto.Item` |
| 실패 | `404 Not Found` |

**요청 예시**
```http
PUT /api/exam1/C001
Content-Type: application/json

{
  "exam1Nm": "카테고리C-수정",
  "col11": "c11_x",
  "col12": "c12_x"
}
```

**응답 예시**
```json
{
  "exam1Id": "C001",
  "exam1Nm": "카테고리C-수정",
  "col11": "c11_x",
  "col12": "c12_x",
  "col13": null,
  "col14": null,
  "col15": null
}
```

---

### 6) 삭제

| 항목 | 내용 |
|---|---|
| Method | `DELETE` |
| URL | `/api/exam1/{exam1Id}` |
| 응답 | `204 No Content` |
| 실패 | `404 Not Found` |

**요청 예시**
```
DELETE /api/exam1/C001
```

**응답** : 본문 없음

---

## Exam2 API

`zz_exam2` (복합 PK: `exam1_id + exam2_id`) — `exam1` LEFT JOIN 으로 부모 이름 포함

### 1) 단건 조회

| 항목 | 내용 |
|---|---|
| Method | `GET` |
| URL | `/api/exam2/{exam1Id}/{exam2Id}` |
| 응답 | `ZzExam2Dto.Item` |

**요청 예시**
```
GET /api/exam2/A001/A001-01
```

**응답 예시 (200 OK)**
```json
{
  "exam1Id": "A001",
  "exam1Nm": "카테고리A",
  "exam2Id": "A001-01",
  "exam2Nm": "서브A1",
  "col21": "aa21",
  "col22": "aa22",
  "col23": "aa23",
  "col24": "aa24",
  "col25": "aa25"
}
```

---

### 2) 전체 목록

| 항목 | 내용 |
|---|---|
| Method | `GET` |
| URL | `/api/exam2/list` |
| 응답 | `List<ZzExam2Dto.Item>` |

**요청 예시 (특정 exam1 의 자식들 조회)**
```
GET /api/exam2/list?exam1Id=A001&sortBy=exam2Id asc
```

**응답 예시**
```json
[
  {
    "exam1Id": "A001", "exam1Nm": "카테고리A",
    "exam2Id": "A001-01", "exam2Nm": "서브A1",
    "col21": "aa21", "col22": "aa22", "col23": "aa23", "col24": "aa24", "col25": "aa25"
  },
  {
    "exam1Id": "A001", "exam1Nm": "카테고리A",
    "exam2Id": "A001-02", "exam2Nm": "서브A2",
    "col21": "ab21", "col22": "ab22", "col23": "ab23", "col24": "ab24", "col25": "ab25"
  }
]
```

---

### 3) 페이지 목록

| 항목 | 내용 |
|---|---|
| Method | `GET` |
| URL | `/api/exam2/page-list` |
| 응답 | `ZzExam2Dto.Response` |

**Query 파라미터 전체**

| 이름 | 설명 |
|---|---|
| `exam1Id`, `exam2Id` | LIKE |
| `exam1Nm` | **부모 이름** LIKE (`zz_exam1.exam1_nm`) |
| `exam2Nm` | LIKE |
| `col21`~`col25` | LIKE |
| `page`, `size`, `sortBy` | 공통 |

**`sortBy` 가능 값**

`exam1Id`, `exam1Nm`, `exam2Id`, `exam2Nm`, `col21`~`col25` (각각 ` asc` / ` desc`)

**요청 예시: 부모 이름 검색 + 정렬 + 페이징**
```
GET /api/exam2/page-list?exam1Nm=카테고리A&sortBy=exam2Nm desc&page=1&size=10
```

**응답 예시**
```json
{
  "content": [
    {
      "exam1Id": "A001", "exam1Nm": "카테고리A",
      "exam2Id": "A001-02", "exam2Nm": "서브A2",
      "col21": "ab21", "col22": "ab22", "col23": "ab23", "col24": "ab24", "col25": "ab25"
    },
    {
      "exam1Id": "A001", "exam1Nm": "카테고리A",
      "exam2Id": "A001-01", "exam2Nm": "서브A1",
      "col21": "aa21", "col22": "aa22", "col23": "aa23", "col24": "aa24", "col25": "aa25"
    }
  ],
  "totalCount": 2,
  "page": 1,
  "size": 10,
  "totalPages": 1
}
```

---

### 4) 등록

| 항목 | 내용 |
|---|---|
| Method | `POST` |
| URL | `/api/exam2` |
| Body | `ZzExam2Dto.Request` |
| 검증 | 부모 `exam1` 존재 필수 (없으면 404) |

**요청 예시**
```http
POST /api/exam2
Content-Type: application/json

{
  "exam1Id": "A001",
  "exam2Id": "A001-99",
  "exam2Nm": "서브A신규",
  "col21": "n21",
  "col22": "n22",
  "col23": null,
  "col24": null,
  "col25": null
}
```

**응답 예시**
```json
{
  "exam1Id": "A001",
  "exam1Nm": null,
  "exam2Id": "A001-99",
  "exam2Nm": "서브A신규",
  "col21": "n21",
  "col22": "n22",
  "col23": null,
  "col24": null,
  "col25": null
}
```

> 등록 응답의 `exam1Nm`은 `null`. (Item.from(entity)는 LEFT JOIN 안 함)
> 정확한 부모 이름이 필요하면 등록 후 `GET /api/exam2/{exam1Id}/{exam2Id}` 로 재조회

---

### 5) 수정

| 항목 | 내용 |
|---|---|
| Method | `PUT` |
| URL | `/api/exam2/{exam1Id}/{exam2Id}` |
| Body | `ZzExam2Dto.Request` (`exam2Nm` + col21~col25만 반영) |

**요청 예시**
```http
PUT /api/exam2/A001/A001-99
Content-Type: application/json

{
  "exam2Nm": "서브A신규-수정",
  "col21": "n21_x"
}
```

**응답 예시**
```json
{
  "exam1Id": "A001",
  "exam1Nm": null,
  "exam2Id": "A001-99",
  "exam2Nm": "서브A신규-수정",
  "col21": "n21_x",
  "col22": null,
  "col23": null,
  "col24": null,
  "col25": null
}
```

---

### 6) 삭제

```
DELETE /api/exam2/A001/A001-99
```

**응답** : `204 No Content`

---

## Exam3 API

`zz_exam3` (3중 복합 PK: `exam1_id + exam2_id + exam3_id`) — `exam1`, `exam2` LEFT JOIN

### 1) 단건 조회

```
GET /api/exam3/A001/A001-01/A001-01-01
```

**응답 예시**
```json
{
  "exam1Id": "A001", "exam1Nm": "카테고리A",
  "exam2Id": "A001-01", "exam2Nm": "서브A1",
  "exam3Id": "A001-01-01", "exam3Nm": "말단A1-1",
  "col31": "aaa31", "col32": "aaa32", "col33": "aaa33", "col34": "aaa34", "col35": "aaa35"
}
```

---

### 2) 전체 목록

```
GET /api/exam3/list?exam1Id=A001&exam2Id=A001-01&sortBy=exam3Id asc
```

**응답 예시**
```json
[
  {
    "exam1Id": "A001", "exam1Nm": "카테고리A",
    "exam2Id": "A001-01", "exam2Nm": "서브A1",
    "exam3Id": "A001-01-01", "exam3Nm": "말단A1-1",
    "col31": "aaa31", "col32": "aaa32", "col33": "aaa33", "col34": "aaa34", "col35": "aaa35"
  },
  {
    "exam1Id": "A001", "exam1Nm": "카테고리A",
    "exam2Id": "A001-01", "exam2Nm": "서브A1",
    "exam3Id": "A001-01-02", "exam3Nm": "말단A1-2",
    "col31": "aab31", "col32": "aab32", "col33": "aab33", "col34": "aab34", "col35": "aab35"
  }
]
```

---

### 3) 페이지 목록

| 항목 | 내용 |
|---|---|
| Method | `GET` |
| URL | `/api/exam3/page-list` |
| 응답 | `ZzExam3Dto.Response` |

**Query 파라미터 전체**

| 이름 | 설명 |
|---|---|
| `exam1Id`, `exam2Id`, `exam3Id` | LIKE |
| `exam1Nm` | **조부모 이름** LIKE |
| `exam2Nm` | **부모 이름** LIKE |
| `exam3Nm` | LIKE |
| `col31`~`col35` | LIKE |
| `page`, `size`, `sortBy` | 공통 |

**`sortBy` 가능 값**

`exam1Id`, `exam1Nm`, `exam2Id`, `exam2Nm`, `exam3Id`, `exam3Nm`, `col31`~`col35` (각각 ` asc` / ` desc`)

**요청 예시: 부모/조부모 검색 + 정렬 + 페이징**
```
GET /api/exam3/page-list?exam1Nm=카테고리A&exam2Nm=서브&sortBy=exam3Nm desc&page=1&size=20
```

**응답 예시**
```json
{
  "content": [
    {
      "exam1Id": "A001", "exam1Nm": "카테고리A",
      "exam2Id": "A001-01", "exam2Nm": "서브A1",
      "exam3Id": "A001-01-02", "exam3Nm": "말단A1-2",
      "col31": "aab31", "col32": "aab32", "col33": "aab33", "col34": "aab34", "col35": "aab35"
    },
    {
      "exam1Id": "A001", "exam1Nm": "카테고리A",
      "exam2Id": "A001-01", "exam2Nm": "서브A1",
      "exam3Id": "A001-01-01", "exam3Nm": "말단A1-1",
      "col31": "aaa31", "col32": "aaa32", "col33": "aaa33", "col34": "aaa34", "col35": "aaa35"
    }
  ],
  "totalCount": 2,
  "page": 1,
  "size": 20,
  "totalPages": 1
}
```

---

### 4) 등록

| 항목 | 내용 |
|---|---|
| Method | `POST` |
| URL | `/api/exam3` |
| 검증 | 부모 `exam2(exam1Id, exam2Id)` 존재 필수 |

**요청 예시**
```http
POST /api/exam3
Content-Type: application/json

{
  "exam1Id": "A001",
  "exam2Id": "A001-01",
  "exam3Id": "A001-01-99",
  "exam3Nm": "말단신규",
  "col31": "n31",
  "col32": null,
  "col33": null,
  "col34": null,
  "col35": null
}
```

**응답 예시**
```json
{
  "exam1Id": "A001",
  "exam1Nm": null,
  "exam2Id": "A001-01",
  "exam2Nm": null,
  "exam3Id": "A001-01-99",
  "exam3Nm": "말단신규",
  "col31": "n31",
  "col32": null,
  "col33": null,
  "col34": null,
  "col35": null
}
```

---

### 5) 수정

```http
PUT /api/exam3/A001/A001-01/A001-01-99
Content-Type: application/json

{
  "exam3Nm": "말단신규-수정",
  "col31": "n31_x",
  "col32": "n32_x"
}
```

**응답 예시**
```json
{
  "exam1Id": "A001",
  "exam1Nm": null,
  "exam2Id": "A001-01",
  "exam2Nm": null,
  "exam3Id": "A001-01-99",
  "exam3Nm": "말단신규-수정",
  "col31": "n31_x",
  "col32": "n32_x",
  "col33": null,
  "col34": null,
  "col35": null
}
```

---

### 6) 삭제

```
DELETE /api/exam3/A001/A001-01/A001-01-99
```

**응답** : `204 No Content`

---

## 정렬 / 페이징 사용법

### 정렬 — `sortBy` 단일 파라미터

> 형식: `"컬럼명 asc"` 또는 `"컬럼명 desc"`

| 예시 | SQL |
|---|---|
| `?sortBy=exam1Id asc` | `ORDER BY exam1_id ASC` |
| `?sortBy=exam2Nm desc` | `ORDER BY exam2_nm DESC` |
| `?sortBy=` (빈값) | (ORDER BY 절 자체 없음) |
| `?sortBy=잘못된값` | (ORDER BY 절 자체 없음) |

### 페이징 — `page`, `size`

| 예시 | 의미 |
|---|---|
| `?page=1&size=10` | 1페이지 (offset=0, limit=10) |
| `?page=3&size=20` | 3페이지 (offset=40, limit=20) |
| (생략) | page=1, size=10 |

응답 `Response` 의 메타:
- `totalCount`: 전체 건수
- `totalPages`: `ceil(totalCount / size)`
- `page`, `size`: 요청 그대로 echo

---

## 에러 응답

`GlobalExceptionHandler` 에서 일관 처리.

| 상황 | HTTP | 응답 본문 |
|---|---|---|
| 단건 조회 시 없음 | 404 | `{ "error": "ZzExam1 not found: XXX" }` |
| 등록 시 PK 중복 | 400 | `{ "error": "Already exists: XXX" }` |
| 등록 시 부모 없음 (exam2/exam3) | 404 | `{ "error": "Parent ZzExam1 not found: XXX" }` |
| 기타 서버 오류 | 500 | `{ "error": "..." }` |

**예시: 존재하지 않는 키 조회**
```
GET /api/exam1/NOPE
```
```json
{ "error": "ZzExam1 not found: NOPE" }
```

**예시: 부모 없이 자식 등록**
```http
POST /api/exam2
{ "exam1Id": "ZZZ", "exam2Id": "X", "exam2Nm": "X" }
```
```json
{ "error": "Parent ZzExam1 not found: ZZZ" }
```

---

## 화면 (Vue3 CDN)

| 메뉴 | URL | 설명 |
|---|---|---|
| 메인 | `http://localhost:8080/index.html` | 사이드바 메뉴 + iframe |
| Exam1 | `http://localhost:8080/exam1.html` | 단순 그리드 + 헤더 정렬 |
| Exam2 | `http://localhost:8080/exam2.html` | 그리드 + 헤더 정렬 + 행 아코디언 (자식 exam3) |
| Exam3 | `http://localhost:8080/exam3.html` | 3단 트리 (exam1 ▶ exam2 ▶ exam3) |

각 화면 하단에 **요청 URL / 파라미터 / 응답** 디버그 패널 포함.

---

## 실행 (VM 옵션)

```
-Dspring-boot.run.jvmArguments=-DDB_HOST=<host> -DDB_PORT=1521 -DDB_NAME=XEPDB1 -DDB_SCHEMA=SHOPJOY_2604 -DDB_USERNAME=<user> -DDB_PASSWORD=<pwd>
```

```bash
mvn spring-boot:run \
  -Dspring-boot.run.jvmArguments="-DDB_HOST=localhost -DDB_PORT=1521 -DDB_NAME=XEPDB1 -DDB_SCHEMA=SHOPJOY_2604 -DDB_USERNAME=shopjoy_2604 -DDB_PASSWORD=ssp1xpj234gh01ej"
```
