# Q 클래스 가이드 (QueryDSL Generated Sources)

> `target/generated-sources/annotations/` 아래에 자동 생성되는 **Q 클래스**가 무엇이고,
> 언제 / 어떻게 만들어지는지 / 수동 생성 방법 정리.

---

## 목차

- [Q 클래스란?](#q-클래스란)
- [현재 프로젝트에 생성되는 Q 클래스](#현재-프로젝트에-생성되는-q-클래스)
- [언제 / 어떻게 자동 생성되는가](#언제--어떻게-자동-생성되는가)
- [수동 생성 방법](#수동-생성-방법)
- [실제 동작 방식](#실제-동작-방식)
- [트러블슈팅](#트러블슈팅)

---

## Q 클래스란?

**QueryDSL** 의 타입 안전한 쿼리를 위해 컴파일 시점에 자동 생성되는 **헬퍼 클래스**.

원본 클래스에 어노테이션이 붙어 있으면, **Annotation Processor** 가 컴파일 단계에서 검사해 동일 이름 앞에 `Q` 가 붙은 클래스를 만들어 준다.

| 원본 | 트리거 어노테이션 | 생성되는 Q 클래스 | 역할 |
|---|---|---|---|
| `@Entity` 클래스 | `@Entity` (JPA) | `QXxx extends EntityPathBase<Xxx>` | 쿼리 작성 (`select`, `from`, `where` 의 컬럼 참조) |
| `@Embeddable` 클래스 (복합 PK) | `@Embeddable` | `QXxxId extends BeanPath<XxxId>` | 임베디드 ID 필드 참조 |
| 생성자에 `@QueryProjection` | `@QueryProjection` | `QXxx_Inner extends ConstructorExpression<...>` | DTO 직접 매핑 (`select(new QXxx(...))`) |

> 두 자바 라이브러리가 같이 작동:
> - **JPA Annotation Processor** — 직접 안 씀 (Hibernate). QueryDSL 이 JPA 메타정보를 읽어들임.
> - **QueryDSL APT (`querydsl-apt`)** — Q 클래스 실제 생성기.

---

## 현재 프로젝트에 생성되는 Q 클래스

### 1) Entity Q 클래스 (`domain` 패키지)

| 원본 | Q 클래스 | 비고 |
|---|---|---|
| [ZzExam1.java](src/main/java/com/exam/jap_exam123/domain/ZzExam1.java) | `QZzExam1` | 단일 PK |
| [ZzExam2.java](src/main/java/com/exam/jap_exam123/domain/ZzExam2.java) | `QZzExam2` | `@EmbeddedId` 사용 |
| [ZzExam2Id.java](src/main/java/com/exam/jap_exam123/domain/ZzExam2Id.java) | `QZzExam2Id` | 복합 PK 클래스 |
| [ZzExam3.java](src/main/java/com/exam/jap_exam123/domain/ZzExam3.java) | `QZzExam3` | `@EmbeddedId` 사용 |
| [ZzExam3Id.java](src/main/java/com/exam/jap_exam123/domain/ZzExam3Id.java) | `QZzExam3Id` | 복합 PK 클래스 |

**생성 위치**: `target/generated-sources/annotations/com/exam/jap_exam123/domain/`

**예시** (자동 생성된 `QZzExam1.java`):
```java
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QZzExam1 extends EntityPathBase<ZzExam1> {
    public static final QZzExam1 zzExam1 = new QZzExam1("zzExam1");
    public final StringPath exam1Id = createString("exam1Id");
    public final StringPath exam1Nm = createString("exam1Nm");
    public final StringPath col11 = createString("col11");
    // ...
}
```

**사용**:
```java
import static com.exam.jap_exam123.domain.QZzExam1.zzExam1;

queryFactory.selectFrom(zzExam1)
    .where(zzExam1.exam1Id.eq("A001"))
    .fetchOne();
```

### 2) DTO Projection Q 클래스 (`dto` 패키지)

| 원본 (`@QueryProjection` 생성자가 있는 내부 클래스) | Q 클래스 |
|---|---|
| `ZzExam1Dto.Item` | `QZzExam1Dto_Item` |
| `ZzExam2Dto.Item` | `QZzExam2Dto_Item` |
| `ZzExam3Dto.Item` | `QZzExam3Dto_Item` |

> 내부 클래스라 `_` 로 연결됨 (`ZzExam1Dto$Item` → `QZzExam1Dto_Item`).

**생성 위치**: `target/generated-sources/annotations/com/exam/jap_exam123/dto/`

**예시** (자동 생성된 `QZzExam1Dto_Item.java`):
```java
@Generated("com.querydsl.codegen.DefaultProjectionSerializer")
public class QZzExam1Dto_Item extends ConstructorExpression<ZzExam1Dto.Item> {
    public QZzExam1Dto_Item(Expression<String> exam1Id, Expression<String> exam1Nm,
                             Expression<String> col11, /* ... */) {
        super(ZzExam1Dto.Item.class, new Class<?>[]{String.class, ...}, exam1Id, ...);
    }
}
```

**사용**:
```java
queryFactory
    .select(new QZzExam1Dto_Item(
        exam1.exam1Id, exam1.exam1Nm,
        exam1.col11, exam1.col12, exam1.col13, exam1.col14, exam1.col15
    ))
    .from(exam1)
    .fetch();
```

> ⚠️ Q 클래스 생성자 인자 개수/타입이 DTO 생성자와 1:1 매칭되어야 함. 컴파일 시점에 검증되므로 인자가 맞지 않으면 빌드 실패.

---

## 언제 / 어떻게 자동 생성되는가

### 1) 트리거: Maven 컴파일 단계

`mvn compile` (또는 `mvn package`, `mvn install` 등 컴파일을 거치는 모든 라이프사이클) 실행 시:

```
[1] resources:resources         (정적 리소스 복사)
[2] compiler:compile            ← 여기서 Q 클래스 생성
        ├─ JavaCompiler 가 src/main/java 컴파일 시작
        ├─ Annotation Processor (querydsl-apt) 호출
        ├─ @Entity / @Embeddable / @QueryProjection 스캔
        └─ Q*.java 를 target/generated-sources/annotations/ 에 생성
        그리고 같이 컴파일 → target/classes/.../Q*.class
```

### 2) pom.xml 설정 (이 프로젝트)

[pom.xml](pom.xml) 의 `maven-compiler-plugin` 설정:

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-compiler-plugin</artifactId>
    <configuration>
        <annotationProcessorPaths>
            <path>
                <groupId>org.projectlombok</groupId>
                <artifactId>lombok</artifactId>
                <version>${lombok.version}</version>
            </path>
            <path>
                <groupId>com.querydsl</groupId>
                <artifactId>querydsl-apt</artifactId>
                <version>${querydsl.version}</version>
                <classifier>jakarta</classifier>     <!-- Spring Boot 3.x = jakarta -->
            </path>
            <path>
                <groupId>jakarta.persistence</groupId>
                <artifactId>jakarta.persistence-api</artifactId>
                <version>3.1.0</version>
            </path>
        </annotationProcessorPaths>
    </configuration>
</plugin>
```

- **`querydsl-apt:jakarta`** → Q 클래스 생성 본체
- **`jakarta.persistence-api`** → `@Entity`, `@Embeddable` 어노테이션 정의
- **`lombok`** → `@Getter` 등도 같은 APT 단계에서 처리

### 3) 출력 경로 (Maven 표준)

```
target/
├─ generated-sources/
│  └─ annotations/                          ← Q 클래스 .java
│     └─ com/exam/jap_exam123/
│        ├─ domain/  Q*.java
│        └─ dto/     Q*_Item.java
└─ classes/
   └─ com/exam/jap_exam123/
      ├─ domain/  Q*.class                  ← 컴파일된 .class
      └─ dto/     Q*_Item.class
```

`target/generated-sources/annotations/` 경로는 **Maven 컴파일러가 자동으로 sourcepath에 포함**해서 IDE/빌드에서 보이게 한다. 별도 build helper 플러그인 불필요.

### 4) 언제 다시 생성되나

| 상황 | Q 클래스 재생성 |
|---|---|
| `mvn compile` (변경된 .java 만) | **변경 없으면 안 함** (incremental) |
| `mvn clean compile` | target 삭제 후 **전부 재생성** |
| Entity 의 컬럼/필드 추가 | 다음 컴파일 시 **자동 반영** |
| `@QueryProjection` 생성자 인자 변경 | 다음 컴파일 시 **자동 반영** |
| pom.xml 의 querydsl 버전 변경 | `mvn clean compile` 권장 |

---

## 수동 생성 방법

### 방법 1: 강제 클린 빌드 (가장 확실)

```bash
mvn clean compile
```

`target/` 통째로 지우고 다시 컴파일 → Q 클래스 새로 생성.

### 방법 2: 어노테이션 프로세서만 실행

```bash
# generate-sources 페이즈만 (컴파일은 안 함)
mvn generate-sources

# process-sources (resources + APT)
mvn process-sources
```

> 다만 `maven-compiler-plugin` 의 APT 는 `compile` 단계에서 동작하므로, 위 명령으로는 Q 클래스가 안 만들어질 수 있음. **확실하게 하려면 `mvn compile`**.

### 방법 3: IntelliJ 에서 강제 재생성

1. **`Build → Rebuild Project`** (전체 재빌드)
2. **`Maven 도구창 → 프로젝트 우클릭 → Generate Sources and Update Folders`**
3. (Q 클래스가 안 보일 때) **`File → Invalidate Caches and Restart`**

### 방법 4: 명령행에서 IntelliJ 내장 Maven 사용 (이 프로젝트 환경)

```powershell
$mvn = "C:\Program Files\JetBrains\IntelliJ IDEA 2024.2.6\plugins\maven\lib\maven3\bin\mvn.cmd"
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot"
Set-Location "c:\_pjt_zz2604\jap_exam123"
& $mvn clean compile
```

### 방법 5: target 만 부분 삭제

```bash
# Q 클래스 영역만 삭제 후 재컴파일
rm -rf target/generated-sources/annotations
mvn compile
```

### 검증

```bash
# 생성된 Q 클래스 목록 확인
find target/generated-sources -name "Q*.java"

# 기대 결과 (이 프로젝트):
# target/generated-sources/annotations/com/exam/jap_exam123/domain/QZzExam1.java
# target/generated-sources/annotations/com/exam/jap_exam123/domain/QZzExam2.java
# target/generated-sources/annotations/com/exam/jap_exam123/domain/QZzExam2Id.java
# target/generated-sources/annotations/com/exam/jap_exam123/domain/QZzExam3.java
# target/generated-sources/annotations/com/exam/jap_exam123/domain/QZzExam3Id.java
# target/generated-sources/annotations/com/exam/jap_exam123/dto/QZzExam1Dto_Item.java
# target/generated-sources/annotations/com/exam/jap_exam123/dto/QZzExam2Dto_Item.java
# target/generated-sources/annotations/com/exam/jap_exam123/dto/QZzExam3Dto_Item.java
```

---

## 실제 동작 방식

### 흐름도

```
┌──────────────┐
│ ZzExam1.java │ ← @Entity
└──────┬───────┘
       │
       │ mvn compile
       ▼
┌──────────────────┐
│ JavaCompiler     │
│ (-processor 옵션)│
└──────┬───────────┘
       │
       │ Annotation 발견
       ▼
┌──────────────────┐
│ querydsl-apt     │ ← JPAAnnotationProcessor
│ (Annotation     │     스캔: @Entity, @Embeddable
│  Processor)      │     스캔: @QueryProjection
└──────┬───────────┘
       │
       │ 코드 생성
       ▼
┌────────────────────────┐
│ target/generated-       │
│  sources/annotations/   │
│   QZzExam1.java         │
└──────┬─────────────────┘
       │
       │ 같은 컴파일 라운드
       ▼
┌──────────────────┐
│ target/classes/  │
│  QZzExam1.class  │
└──────────────────┘
```

### 처리 단계 상세

1. `mvn compile` 실행
2. `maven-compiler-plugin` 이 `javac` 호출
3. `javac` 가 `-processor` 옵션으로 `querydsl-apt` 활성화
4. `JPAAnnotationProcessor` 가 `@Entity` / `@Embeddable` 스캔
5. `QueryProjectionAnnotationProcessor` 가 `@QueryProjection` 스캔
6. 각각에 대해 `Q*.java` 소스 코드 생성 → `target/generated-sources/annotations/`
7. 같은 컴파일 라운드 안에서 생성된 `.java` 까지 같이 컴파일 → `target/classes/`

### Q 클래스 사용 측 (Repository Impl)

```java
// import 시 generated-sources 의 Q 클래스 참조
import com.exam.jap_exam123.domain.QZzExam1;
import com.exam.jap_exam123.dto.QZzExam1Dto_Item;

public class ZzExam1RepositoryCustomImpl implements ZzExam1RepositoryCustom {
    private static final QZzExam1 exam1 = QZzExam1.zzExam1;   // singleton 인스턴스 사용

    public Optional<ZzExam1Dto.Item> selectById(String id) {
        return Optional.ofNullable(queryFactory
                .select(new QZzExam1Dto_Item(                    // DTO 직접 매핑
                    exam1.exam1Id, exam1.exam1Nm,                 // ← Q 클래스의 필드
                    exam1.col11, exam1.col12, exam1.col13,
                    exam1.col14, exam1.col15
                ))
                .from(exam1)
                .where(exam1.exam1Id.eq(id))
                .fetchOne());
    }
}
```

---

## 트러블슈팅

### 1) Q 클래스가 생성 안 됨

**원인**: `pom.xml` 의 `annotationProcessorPaths` 에 `querydsl-apt` 가 빠짐.

**해결**: pom.xml 확인 후 `mvn clean compile`.

### 2) "cannot find symbol: QXxx" 컴파일 에러

**원인**: Q 클래스가 아직 안 만들어짐 (IDE 가 sourcepath 인식 못함).

**해결**:
- `mvn clean compile` 한 번 실행
- IntelliJ: `Maven → Generate Sources and Update Folders`
- IDE 재시작 + Invalidate Caches

### 3) Q 클래스가 두 곳에 중복 생성

**원인**: 과거에 `apt-maven-plugin` + `maven-compiler-plugin` 둘 다 설정되어 있을 때 발생.

**증상**: `Attempt to recreate a file for type com.exam.jap_exam123.entity.QZzExam1`

**해결**: `apt-maven-plugin` 제거하고 `maven-compiler-plugin` 의 `annotationProcessorPaths` 만 사용 (이 프로젝트가 적용한 방식).

### 4) Entity 필드 추가했는데 Q 클래스에 안 보임

**원인**: incremental compile 이 변경을 놓침.

**해결**: `mvn clean compile`.

### 5) `@QueryProjection` 생성자 인자 바꿨는데 Q 클래스가 옛 시그니처

**원인**: 위와 동일.

**해결**: `mvn clean compile`. 또는 `target/generated-sources/annotations/dto/` 만 삭제 후 `mvn compile`.

### 6) Spring Boot 2.x 에서 마이그레이션 시 "javax vs jakarta" 에러

**원인**: `querydsl-apt` 의 `classifier` 가 jakarta 가 아니거나 `jpa` 인 경우.

**해결**: Spring Boot 3.x 는 반드시 `<classifier>jakarta</classifier>` 사용.

```xml
<path>
    <groupId>com.querydsl</groupId>
    <artifactId>querydsl-apt</artifactId>
    <version>${querydsl.version}</version>
    <classifier>jakarta</classifier>   ← 이게 필수
</path>
```

### 7) Git 에 Q 클래스를 커밋해야 하나?

**아니오.** `target/` 은 항상 `.gitignore` 처리. Q 클래스는 빌드 산출물이라 어디서든 `mvn compile` 로 재생성된다.

```gitignore
target/
```

---

## 요약

| 질문 | 답 |
|---|---|
| Q 클래스가 뭔가? | QueryDSL 의 타입 안전 쿼리용 헬퍼. `@Entity` / `@Embeddable` / `@QueryProjection` 으로부터 자동 생성. |
| 어디에 만들어지나? | `target/generated-sources/annotations/<원본 패키지>/` |
| 누가 만드나? | `querydsl-apt` Annotation Processor (Maven Compiler Plugin 이 컴파일 단계에 호출) |
| 언제 만들어지나? | `mvn compile` 실행 시. 변경 없으면 incremental 로 skip. |
| 수동 생성? | `mvn clean compile` 또는 IntelliJ `Generate Sources and Update Folders` |
| 커밋? | ❌ Git 에 안 올림. 빌드 산출물. |
| 변경 시? | Entity 컬럼/생성자 바뀌면 다음 컴파일 때 자동 반영. 안 보이면 `mvn clean compile`. |
