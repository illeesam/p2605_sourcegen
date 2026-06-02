# DTO 내부 클래스 사용 흐름

> `ZzExam{1,2,3}Dto` 안의 정적 내부 클래스 3종이 **언제 어디서 어떻게 흘러가는지** 정리합니다.
>
> - **`Request`** — 외부에서 들어오는 입력 (등록/수정 body, 검색조건, 페이징/정렬 통합)
> - **`Item`** — 단건 또는 한 행. 도메인 → 응답 DTO 변환 결과
> - **`Response`** — 페이지 응답 래퍼. `List<Item>` + 페이징 메타

---

## 목차

- [한눈에 보는 흐름](#한눈에-보는-흐름)
- [Request — 입력 흐름](#request--입력-흐름)
- [Item — 단건/행 흐름](#item--단건행-흐름)
- [Response — 페이지 응답 흐름](#response--페이지-응답-흐름)
- [메서드별 어떤 DTO를 쓰는가](#메서드별-어떤-dto를-쓰는가)
- [자주 헷갈리는 포인트](#자주-헷갈리는-포인트)

---

## 한눈에 보는 흐름

```
┌──────────────┐        ┌────────────┐         ┌──────────────┐         ┌──────────┐
│ HTTP Client  │──JSON─▶│ Controller │──Req──▶ │ Service      │──Req──▶ │ Repo     │
│  (Vue/curl)  │        │            │         │              │         │ Impl     │
└──────────────┘        └────────────┘         └──────────────┘         └────┬─────┘
                                                                              │
                                                              QueryDSL select │
                                                              new QXxxDto_Item│
                                                                              ▼
                                                                          ┌────────┐
                                                                          │ Item   │
                                                                          └───┬────┘
                                                                              │
                                                              Response.of(...)│
                                                                              ▼
┌──────────────┐        ┌────────────┐         ┌──────────────┐         ┌────────┐
│ HTTP Client  │◀─JSON──│ Controller │◀────────│ Service      │◀────────│ Resp   │
└──────────────┘        └────────────┘         └──────────────┘         └────────┘
```

- **요청 방향**: `Request` 만 흐른다.
- **응답 방향**: `Item` 또는 `Response<Item>` 가 돌아간다.
- **엔티티(`ZzExamN`)** 는 **Repository ↔ DB 사이에만** 등장. Service 위로는 항상 DTO.

---

## Request — 입력 흐름

### 1) Controller 에서 진입

| 사용처 | 어노테이션 | 직렬화 방식 |
|---|---|---|
| `POST` 등록 | `@RequestBody ZzExam1Dto.Request req` | JSON body → 객체 |
| `PUT` 수정 | `@RequestBody ZzExam1Dto.Request req` | JSON body → 객체 |
| `GET` 검색 | `ZzExam1Dto.Request search` (생략 가능) | Query string → 객체 (`@ModelAttribute` 기본) |

> Spring 이 자동으로 다음 중 하나로 바인딩한다.
> - `@RequestBody` → JSON 본문
> - 어노테이션 없으면 → URL 쿼리 파라미터 (예: `?exam1Nm=카테&page=1&size=10`)

### 2) 한 클래스가 4가지 역할

`Request` 는 다음 중 **사용된 필드만** 의미를 가진다 — 나머지는 무시.

| 역할 | 채워지는 필드 | 예시 |
|---|---|---|
| **등록 body** | PK + 일반 컬럼 + 이름 | `{ exam1Id, exam1Nm, col11, ... }` |
| **수정 body** | PK 제외한 변경 필드 (PK는 path 우선) | `{ exam1Nm, col11 }` |
| **검색 조건** | 검색하고 싶은 컬럼 | `{ exam1Nm: "카테" }` |
| **페이징/정렬** | `page`, `size`, `sortBy` | `{ page: 1, size: 10, sortBy: "exam1Id desc" }` |

### 3) Service 에서 변환

```java
// 등록 - Request → Entity
ZzExam1 entity = req.toEntity();
repo.save(entity);

// 수정 - Request 의 setter 값을 엔티티에 복사
entity.setExam1Nm(req.getExam1Nm());
entity.setCol11(req.getCol11());
// ... 더티체킹으로 update SQL 자동
```

### 4) Repository Impl 에서 검색조건 추출

```java
// 검색조건만 사용
if (StringUtils.hasText(s.getExam1Nm()))
    where.and(exam1.exam1Nm.like("%" + s.getExam1Nm() + "%"));

// 페이징/정렬 사용
.offset(search.getOffset())   // (page-1) * size
.limit(search.getSize())
.orderBy(buildOrder(search))  // sortBy 파싱
```

### 5) Request 의 핵심 메서드

| 메서드 | 사용 시점 | 설명 |
|---|---|---|
| `toEntity()` | Service.insert() | DB 저장용 엔티티 생성 |
| `getOffset()` | Repository.selectPageData() | `(page-1)*size` |
| getter 들 | Repository.buildCondition() | 검색조건 추출 |
| getter 들 | Service.update() | 엔티티 setter 호출 |

---

## Item — 단건/행 흐름

### 1) 두 가지 생성 경로

#### 경로 A: 엔티티에서 변환 (등록/수정 응답)

```java
// Service.insert(), Service.update()
ZzExam1 saved = repo.save(req.toEntity());
return ZzExam1Dto.Item.from(saved);   // ← from()
```

`Item.from(entity)` 는 **엔티티의 직접 컬럼만 복사**. LEFT JOIN 안 하므로 부모 이름은 `null`.

#### 경로 B: QueryDSL 직접 매핑 (조회 응답)

```java
// Repository Impl - selectById, selectList, selectPageData
queryFactory
    .select(new QZzExam1Dto_Item(    // ← @QueryProjection 생성자
        exam1.exam1Id, exam1.exam1Nm,
        exam1.col11, exam1.col12, exam1.col13, exam1.col14, exam1.col15
    ))
    .from(exam1)
    .leftJoin(exam2)...               // 부모/자식 LEFT JOIN
    .fetch();
```

`@QueryProjection` 생성자가 SELECT 결과를 `Item` 으로 직접 매핑.
**LEFT JOIN 으로 부모 이름까지 채워서** 옴 (예: `exam1Nm` 이 `null` 이 아님).

### 2) Controller 에서 응답으로 전달

```java
// 단건 조회
@GetMapping("/{exam1Id}")
public ResponseEntity<ZzExam1Dto.Item> selectById(@PathVariable String exam1Id) {
    return ResponseEntity.ok(service.selectById(exam1Id));
}

// 등록
@PostMapping
public ResponseEntity<ZzExam1Dto.Item> insert(@RequestBody ZzExam1Dto.Request req) {
    return ResponseEntity.ok(service.insert(req));   // Item 반환
}
```

Spring 이 Jackson 으로 JSON 직렬화 → 클라이언트로 전송.

### 3) Item 사용 시점 정리

| API | 응답 Item 출처 | 부모 이름 LEFT JOIN |
|---|---|---|
| `GET /selectById` | QueryDSL `new QXxxDto_Item(...)` | ✅ 포함 |
| `GET /list` | QueryDSL `new QXxxDto_Item(...)` | ✅ 포함 |
| `GET /page-list` (`Response.content` 의 행) | QueryDSL `new QXxxDto_Item(...)` | ✅ 포함 |
| `POST` 등록 응답 | `Item.from(entity)` | ❌ null |
| `PUT` 수정 응답 | `Item.from(entity)` | ❌ null |

> 등록/수정 직후 정확한 부모 이름이 필요하면 → 해당 PK 로 `selectById` 한 번 더 호출.

---

## Response — 페이지 응답 흐름

### 1) Repository Impl 에서 조립

```java
public ZzExam1Dto.Response selectPageData(ZzExam1Dto.Request search) {
    // 1. content 조회 (페이징 적용)
    List<ZzExam1Dto.Item> content = queryFactory
            .select(new QZzExam1Dto_Item(...))
            .from(exam1)
            .where(buildCondition(search))
            .orderBy(buildOrder(search))
            .offset(search.getOffset())
            .limit(search.getSize())
            .fetch();

    // 2. 전체 건수 조회 (페이징 X, 같은 where)
    Long total = queryFactory
            .select(exam1.count())
            .from(exam1)
            .where(buildCondition(search))
            .fetchOne();

    // 3. 정적 팩토리로 조립
    return ZzExam1Dto.Response.of(
        content,
        total == null ? 0L : total,
        search.getPage(),
        search.getSize()
    );
}
```

### 2) `Response.of()` 가 채우는 것

```java
public static Response of(List<Item> content, long totalCount, int page, int size) {
    int totalPages = size <= 0 ? 0 : (int) Math.ceil((double) totalCount / size);
    return Response.builder()
            .content(content)
            .totalCount(totalCount)
            .page(page)
            .size(size)
            .totalPages(totalPages)   // ← 자동 계산
            .build();
}
```

`totalPages` 만 계산 책임. 나머지는 그대로 echo.

### 3) Controller → 클라이언트

```java
@GetMapping("/page-list")
public ResponseEntity<ZzExam1Dto.Response> selectPageData(ZzExam1Dto.Request search) {
    return ResponseEntity.ok(service.selectPageData(search));
}
```

JSON 직렬화 결과:

```json
{
  "content":    [ Item, Item, ... ],
  "totalCount": 42,
  "page":       1,
  "size":       10,
  "totalPages": 5
}
```

### 4) 클라이언트(Vue)에서 사용

```javascript
const data = await fetch(`/api/exam1/page-list?page=1&size=10`).then(r => r.json());

list.value = data.content;          // 행들
page.value = {
    totalCount: data.totalCount,
    page:       data.page,
    size:       data.size,
    totalPages: data.totalPages
};
// 페이지 번호 버튼 = 1..data.totalPages
```

> ⚠️ `selectList` 는 `Response` 가 아니라 **`List<Item>`** 을 직접 반환 (페이징 없음). 응답 모양 다름.

---

## 메서드별 어떤 DTO를 쓰는가

### Controller 시그니처 한눈에

```java
// === Exam1 ===
GET    /api/exam1/{id}              → Item                  selectById(String id)
GET    /api/exam1/list              → List<Item>            selectList(Request)
GET    /api/exam1/page-list         → Response              selectPageData(Request)
POST   /api/exam1                   → Item                  insert(@RequestBody Request)
PUT    /api/exam1/{id}              → Item                  update(id, @RequestBody Request)
DELETE /api/exam1/{id}              → 204                   delete(String id)
```

### 각 계층에서 흐르는 타입

| 계층 | 입력 | 출력 |
|---|---|---|
| Controller | `@RequestBody Request` / Query → `Request` / `@PathVariable String` | `Item` / `List<Item>` / `Response` / `Void` |
| Service | `Request` / `String id` | `Item` / `List<Item>` / `Response` / `void` |
| Repository Impl | `Request` / `String id` | `Optional<Item>` / `List<Item>` / `Response` |
| Repository (JPA) | `entity` / PK | `entity` / `Optional<entity>` |

> **Service ↑** 는 항상 DTO, **Repository ↓** 는 엔티티/Q클래스. Repository Impl 에서 둘이 만난다.

---

## 자주 헷갈리는 포인트

### 1) `Request` 는 한 클래스가 4가지 역할 → "쓰지 않는 필드는 무시"

```java
// 등록 - PK 필요, page/size 무시
POST /api/exam1  body: { exam1Id, exam1Nm }

// 검색 - 채운 필드만 LIKE, 빈건 조건에서 제외
GET /api/exam1/page-list?exam1Nm=카테&page=2

// 수정 - PK 는 path 우선, body의 exam1Id 는 무시
PUT /api/exam1/A001  body: { exam1Nm: "수정" }
```

### 2) `Item.from(entity)` vs `new QXxxDto_Item(...)`

| 방식 | 사용 시점 | 부모 이름(LEFT JOIN 컬럼) |
|---|---|---|
| `Item.from(entity)` | insert/update 응답 | ❌ `null` |
| `new QXxxDto_Item(...)` (QueryDSL) | 모든 SELECT | ✅ 채워짐 |

**왜?** 엔티티는 `exam1` 테이블 자기 컬럼만 들고 있고, `exam2.exam1Nm` 같은 컬럼은 LEFT JOIN 결과라 엔티티에 없음.

### 3) `selectList` vs `selectPageData` — 응답 타입이 다름

```java
GET /api/exam1/list        → List<Item>           // 배열
GET /api/exam1/page-list   → Response             // { content: [...], totalCount, ... }
```

화면에서 처리도 다르게:
- `list`: 응답 자체가 배열 → `data.map(...)`
- `page-list`: 응답에서 `data.content` 추출 후 페이징 메타도 같이 갱신

### 4) `Response.content` 안의 `Item` 은 LEFT JOIN 결과

`selectPageData` 의 `content[i]` 는 QueryDSL `select(new QXxxDto_Item(...))` 로 만들어진 것이라 부모 이름 `exam1Nm`, `exam2Nm` 모두 채워져 있다.

### 5) `Request` 의 페이징 필드는 `selectList` 에서는 무시됨

```java
GET /api/exam1/list?page=99&size=1   // page/size 무시, 검색조건만 적용
```

### 6) DTO 컨테이너 클래스(`ZzExam1Dto`) 자체는 인스턴스화 못함

```java
private ZzExam1Dto() {}   // 생성자 private
```

내부 클래스만 사용. 컨테이너는 namespace 역할.

---

## 짧은 코드 예제 모음

### 등록

```java
// Client (Vue)
fetch('/api/exam1', { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ exam1Id:'C001', exam1Nm:'카테고리C', col11:'c11' })
});

// Controller
public ResponseEntity<ZzExam1Dto.Item> insert(@RequestBody ZzExam1Dto.Request req) { ... }

// Service
ZzExam1 saved = repo.save(req.toEntity());
return ZzExam1Dto.Item.from(saved);

// 응답: { exam1Id:"C001", exam1Nm:"카테고리C", col11:"c11", col12:null, ... }
```

### 페이지 조회

```java
// Client
fetch('/api/exam1/page-list?exam1Nm=카테&sortBy=exam1Id desc&page=1&size=10');

// Controller (Request 가 query string 에서 자동 바인딩)
public ResponseEntity<ZzExam1Dto.Response> selectPageData(ZzExam1Dto.Request search) { ... }

// Repository Impl - Item 직접 매핑 + Response 조립
List<Item> content = queryFactory.select(new QZzExam1Dto_Item(...))....fetch();
Long total = queryFactory.select(exam1.count())....fetchOne();
return Response.of(content, total, search.getPage(), search.getSize());

// 응답: { content:[Item, Item, ...], totalCount:3, page:1, size:10, totalPages:1 }
```

### 부모 이름으로 자식 검색 (LEFT JOIN 활용)

```java
// Client - exam1_nm 으로 exam2 검색
fetch('/api/exam2/page-list?exam1Nm=카테고리A');

// Repository Impl - Request.exam1Nm 을 exam1.exam1Nm 에 LIKE
.leftJoin(exam1).on(exam1.exam1Id.eq(exam2.id.exam1Id))
.where(s.getExam1Nm() != null
    ? exam1.exam1Nm.like("%" + s.getExam1Nm() + "%") : null)

// 응답 Item 에 exam1Nm 도 채워서 반환
{ exam1Id:"A001", exam1Nm:"카테고리A", exam2Id:"A001-01", exam2Nm:"서브A1", ... }
```
