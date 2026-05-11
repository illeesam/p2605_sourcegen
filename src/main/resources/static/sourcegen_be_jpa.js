/* ===== Source Generator : Backend (JPA) =====
 * Entity / Dto / Repository / RepositoryCustom / RepositoryCustomImpl / Service / Controller
 * 의존: fmCap(), gnAuditFields() (sourcegen.js)
 */

// ----- Entity (단일 PK) / Embedded Id -----
function gnEntityIdSource(pkg, className, pkCols) {
    const fields = pkCols.map(c =>
        `    @Column(name = "${c.name}", length = ${c.size || 20}, nullable = false)\n    private ${c.javaType} ${c.javaName};`
    ).join('\n\n');
    return `package ${pkg}.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;

/** ${className} 복합 PK */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class ${className}Id implements Serializable {

${fields}
}
`;
}

function gnEntitySource(pkg, className, tableName, dataCols, pkCols, hasAudit) {
    const isComposite = pkCols.length > 1;
    const importLocalDt = dataCols.some(c => c.javaType === 'LocalDateTime')
        ? 'import java.time.LocalDateTime;\n' : '';
    const extendsClause = hasAudit ? ' extends BaseEntity' : '';

    let pkPart;
    if (isComposite) {
        pkPart = `    @EmbeddedId\n    private ${className}Id id;`;
    } else {
        const pk = pkCols[0];
        pkPart = `    @Id\n    @Column(name = "${pk.name}", length = ${pk.size || 20}, nullable = false)\n    private ${pk.javaType} ${pk.javaName};`;
    }

    const otherCols = isComposite
        ? dataCols.filter(c => !c.isPk)
        : dataCols.filter(c => !c.isPk);
    const otherFields = otherCols.map(c => {
        const len = c.size ? `, length = ${c.size}` : '';
        const nn = c.nullable ? '' : ', nullable = false';
        return `    @Column(name = "${c.name}"${len}${nn}) private ${c.javaType} ${c.javaName};`;
    }).join('\n');

    return `package ${pkg}.domain;

import jakarta.persistence.*;
${importLocalDt}import lombok.*;

/** ${className} 엔티티 (${tableName}) */
@Entity
@Table(name = "${tableName}")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ${className}${extendsClause} {

${pkPart}

${otherFields}
}
`;
}

// ----- DTO -----
function gnDtoSource(pkg, className, dataCols, pkCols, nonPkCols, hasAudit, usesLocalDate) {
    const allItemCols = hasAudit ? [...dataCols, ...gnAuditFields()] : dataCols;
    const isComposite = pkCols.length > 1;
    const importLocalDt = (usesLocalDate || hasAudit)
        ? 'import java.time.LocalDateTime;\n' : '';

    // Request 필드
    const reqFields = dataCols.map(c => {
        const required = !c.nullable && !c.isAudit;
        const annot = required ? `        @NotBlank(message = "${c.javaName}는 필수입니다")\n` : '';
        const sizeAnn = c.size ? `        @Size(max = ${c.size})\n` : '';
        return `${annot}${sizeAnn}        private ${c.javaType} ${c.javaName};`;
    }).join('\n\n');

    // pageCond Map 빌더 — String 은 hasText, 그 외는 != null 체크. audit 컬럼 제외.
    const condCols = dataCols.filter(c => !c.isAudit);
    const condPutters = condCols.map(c => {
        const getter = 'get' + fmCap(c.javaName) + '()';
        const cond = c.javaType === 'String'
            ? `s.${getter} != null && !s.${getter}.isEmpty()`
            : `s.${getter} != null`;
        return `            if (${cond}) m.put("${c.javaName}", s.${getter});`;
    }).join('\n');

    // toEntity (등록 시)
    let toEntityBody;
    if (isComposite) {
        const idArgs = pkCols.map(c => c.javaName).join(', ');
        const setters = nonPkCols.map(c => `                    .${c.javaName}(${c.javaName})`).join('\n');
        toEntityBody = `            return ${className}.builder()
                    .id(new ${className}Id(${idArgs}))
${setters}
                    .build();`;
    } else {
        const setters = dataCols.map(c => `                    .${c.javaName}(${c.javaName})`).join('\n');
        toEntityBody = `            return ${className}.builder()
${setters}
                    .build();`;
    }

    // Item 필드
    const itemFields = allItemCols.map(c => `        private ${c.javaType} ${c.javaName};`).join('\n');
    // QueryProjection 인자
    const qpArgs = allItemCols.map(c => `${c.javaType} ${c.javaName}`).join(', ');
    const qpSetters = allItemCols.map(c => `            this.${c.javaName} = ${c.javaName};`).join('\n');

    // from(entity)
    let fromBody;
    if (isComposite) {
        const idGetters = pkCols.map(c => `                    .${c.javaName}(e.getId().get${fmCap(c.javaName)}())`).join('\n');
        const otherGetters = nonPkCols.map(c => `                    .${c.javaName}(e.get${fmCap(c.javaName)}())`).join('\n');
        const auditGetters = hasAudit
            ? `                    .regId(e.getRegId()).regDt(e.getRegDt())\n                    .updId(e.getUpdId()).updDt(e.getUpdDt())`
            : '';
        fromBody = `            return Item.builder()
${idGetters}
${otherGetters}
${auditGetters ? auditGetters + '\n' : ''}                    .build();`;
    } else {
        const getters = dataCols.map(c => `                    .${c.javaName}(e.get${fmCap(c.javaName)}())`).join('\n');
        const auditGetters = hasAudit
            ? `                    .regId(e.getRegId()).regDt(e.getRegDt())\n                    .updId(e.getUpdId()).updDt(e.getUpdDt())`
            : '';
        fromBody = `            return Item.builder()
${getters}
${auditGetters ? auditGetters + '\n' : ''}                    .build();`;
    }

    return `package ${pkg}.dto;

import ${pkg}.domain.${className};${isComposite ? `\nimport ${pkg}.domain.${className}Id;` : ''}
import com.querydsl.core.annotations.QueryProjection;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

${importLocalDt}import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;

/** ${className} DTO (Request / Item / Response) */
public class ${className}Dto {

    private ${className}Dto() {}

    /** 요청 DTO (등록/수정/검색/페이징/정렬/일괄저장 통합) */
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Request {
${reqFields}

        @Builder.Default private int pageNo = 1;
        @Builder.Default private int pageSize = 10;
        // 정렬: "컬럼 asc" / "컬럼 desc"
        private String sortBy;

        /** 행 상태: "I"=insert, "U"=update, "D"=delete (saveOne/saveList 용) */
        private String rowStatus;

        /** 페이지 offset 계산 */
        public int getOffset() { return (pageNo - 1) * pageSize; }

        /** 엔티티 변환 */
        public ${className} toEntity() {
${toEntityBody}
        }
    }

    /** 응답 DTO (단건/목록 행) */
    @Getter @Setter @NoArgsConstructor @Builder
    public static class Item {
${itemFields}

        /** QueryDSL 프로젝션 생성자 */
        @QueryProjection
        public Item(${qpArgs}) {
${qpSetters}
        }

        /** 엔티티 -> Item 변환 */
        public static Item from(${className} e) {
${fromBody}
        }
    }

    /** 페이지 응답 DTO */
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private List<Item> pageList;
        private long pageTotalCount;
        private int pageNo;
        private int pageSize;
        private int pageTotalPages;
        /** 검색 조건 echo (요청에 사용된 필드만 담김) */
        private Map<String, Object> pageCond;

        /** Response 생성 (pageTotalPages 자동 계산, pageCond 동봉) */
        public static Response of(List<Item> pageList, long pageTotalCount,
                                  int pageNo, int pageSize, Map<String, Object> pageCond) {
            int pageTotalPages = pageSize <= 0 ? 0 : (int) Math.ceil((double) pageTotalCount / pageSize);
            return Response.builder()
                    .pageList(pageList).pageTotalCount(pageTotalCount)
                    .pageNo(pageNo).pageSize(pageSize).pageTotalPages(pageTotalPages)
                    .pageCond(pageCond)
                    .build();
        }

        /** Request → pageCond Map 변환 (값이 있는 필드만 담음, 페이징/정렬/rowStatus 제외) */
        public static Map<String, Object> toCond(Request s) {
            Map<String, Object> m = new LinkedHashMap<>();
            if (s == null) {
                return m;
            }
${condPutters}
            return m;
        }
    }
}
`;
}

// ----- Repository -----
function gnRepoSource(pkg, className, pkCols) {
    const idType = pkCols.length > 1 ? `${className}Id` : pkCols[0].javaType;
    const idImport = pkCols.length > 1 ? `import ${pkg}.domain.${className}Id;\n` : '';
    return `package ${pkg}.repository;

import ${pkg}.domain.${className};
${idImport}import org.springframework.data.jpa.repository.JpaRepository;

/** ${className} 리포지토리 */
public interface ${className}Repository extends JpaRepository<${className}, ${idType}>, ${className}RepositoryCustom {
}
`;
}

function gnRepoCustomSource(pkg, className, pkCols) {
    const args = pkCols.map(c => `${c.javaType} ${c.javaName}`).join(', ');
    return `package ${pkg}.repository;

import ${pkg}.dto.${className}Dto;

import java.util.List;
import java.util.Optional;

/** ${className} QueryDSL Custom */
public interface ${className}RepositoryCustom {
    /** 단건 조회 */
    Optional<${className}Dto.Item> selectById(${args});
    /** 전체 목록 */
    List<${className}Dto.Item> selectList(${className}Dto.Request search);
    /** 페이지 목록 */
    ${className}Dto.Response selectPageList(${className}Dto.Request search);
}
`;
}

function gnRepoCustomImplSource(pkg, className, varName, dataCols, pkCols, hasAudit) {
    const isComposite = pkCols.length > 1;
    const allItemCols = hasAudit ? [...dataCols, ...gnAuditFields()] : dataCols;

    const qFields = allItemCols.map(c => {
        if (isComposite && c.isPk) return `${varName}.id.${c.javaName}`;
        return `${varName}.${c.javaName}`;
    }).join(', ');

    const args = pkCols.map(c => `${c.javaType} ${c.javaName}`).join(', ');
    const whereSelectOne = pkCols.map(c => {
        const path = isComposite ? `${varName}.id.${c.javaName}` : `${varName}.${c.javaName}`;
        return `${path}.eq(${c.javaName})`;
    }).join(', ');

    // 검색 조건 (PK 외 String 컬럼만)
    const searchCols = dataCols.filter(c => c.javaType === 'String' && !c.isAudit);
    const conditions = searchCols.map(c => {
        const path = isComposite && c.isPk ? `${varName}.id.${c.javaName}` : `${varName}.${c.javaName}`;
        return `        if (StringUtils.hasText(s.get${fmCap(c.javaName)}())) b.and(${path}.containsIgnoreCase(s.get${fmCap(c.javaName)}()));`;
    }).join('\n');

    // 정렬 case
    const orderCases = dataCols.map(c => {
        const path = isComposite && c.isPk ? `${varName}.id.${c.javaName}` : `${varName}.${c.javaName}`;
        return `            case "${c.javaName} asc":  return ${path}.asc();\n            case "${c.javaName} desc": return ${path}.desc();`;
    }).join('\n');

    const orderBy = isComposite
        ? pkCols.map(c => `${varName}.id.${c.javaName}.asc()`).join(', ')
        : `${varName}.${pkCols[0].javaName}.asc()`;

    return `package ${pkg}.repository.impl;

import ${pkg}.dto.${className}Dto;
import ${pkg}.domain.Q${className};
import ${pkg}.repository.${className}RepositoryCustom;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.Order;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.core.types.PathBuilder;
import com.querydsl.core.types.Projections;
import com.querydsl.jpa.impl.JPAQuery;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/** ${className} QueryDSL Custom 구현체 */
@RequiredArgsConstructor
public class ${className}RepositoryCustomImpl implements ${className}RepositoryCustom {

    private final JPAQueryFactory queryFactory;
    private static final Q${className} ${varName} = Q${className}.${varName};

    /** 단건 조회 */
    @Override
    public Optional<${className}Dto.Item> selectById(${args}) {
        ${className}Dto.Item dto = queryFactory
                .select(Projections.bean(${className}Dto.Item.class, ${qFields}))
                .from(${varName})
                .where(${whereSelectOne})
                .fetchOne();
        return Optional.ofNullable(dto);
    }

    /** 전체 목록 (pageNo/pageSize 가 양수면 페이징 적용) */
    @Override
    public List<${className}Dto.Item> selectList(${className}Dto.Request search) {
        BooleanBuilder where = buildCondition(search);
        List<OrderSpecifier<?>> orderList = buildOrder(search);
        var query = buildBaseQuery()
                .where(where);
        if (!orderList.isEmpty()) {
            query.orderBy(orderList.toArray(OrderSpecifier[]::new));
        }
        if (search.getPageSize() > 0 && search.getPageNo() > 0) {
            int offset = (search.getPageNo() - 1) * search.getPageSize();
            int limit  = search.getPageSize();
            query.offset(offset).limit(limit);
        }
        return query.fetch();
    }

    /** 페이지 목록 (pageNo/pageSize 미지정 시 1페이지/10건 기본) */
    @Override
    public ${className}Dto.Response selectPageList(${className}Dto.Request search) {
        int pageNo   = search.getPageNo()   > 0 ? search.getPageNo()   : 1;
        int pageSize = search.getPageSize() > 0 ? search.getPageSize() : 10;
        int offset   = (pageNo - 1) * pageSize;
        int limit    = pageSize;

        BooleanBuilder where = buildCondition(search);
        List<OrderSpecifier<?>> orderList = buildOrder(search);

        var query = buildBaseQuery()
                .where(where);
        if (!orderList.isEmpty()) {
            query = query.orderBy(orderList.toArray(OrderSpecifier[]::new));
        }
        List<${className}Dto.Item> content = query.offset(offset)
                .limit(limit)
                .fetch();

        Long total = queryFactory
                .select(${varName}.count())
                .from(${varName})
                .where(where)
                .fetchOne();

        return ${className}Dto.Response.of(content, total == null ? 0L : total, pageNo, pageSize,
                ${className}Dto.Response.toCond(search));
    }

    /** 기본 쿼리 빌드 */
    private JPAQuery<${className}Dto.Item> buildBaseQuery() {
        return queryFactory
                .select(Projections.bean(${className}Dto.Item.class, ${qFields}))
                .from(${varName});
    }

    /** 검색조건 빌드 */
    private BooleanBuilder buildCondition(${className}Dto.Request s) {
        BooleanBuilder b = new BooleanBuilder();
${conditions}
        return b;
    }

    /** 정렬조건 빌드
     * 예제: "exam1Id asc", "exam1Nm desc, col11 asc"
     * 형식: "필드명 방향" (asc/desc), 여러 개는 콤마로 구분
     */
    private List<OrderSpecifier<?>> buildOrder(${className}Dto.Request s) {
        if (!StringUtils.hasText(s.getSortBy())) return new ArrayList<>();
        PathBuilder<${className}> entityPath = new PathBuilder<>(${className}.class, "${varName}");
        String[] sortParts = s.getSortBy().split(",");
        List<OrderSpecifier<?>> orders = new ArrayList<>();
        for (String part : sortParts) {
            String trimmed = part.trim();
            String[] fieldAndDir = trimmed.split(" ");
            if (fieldAndDir.length == 2) {
                String field = fieldAndDir[0];
                String dir = fieldAndDir[1];
                Order order = "desc".equalsIgnoreCase(dir) ? Order.DESC : Order.ASC;
                orders.add(new OrderSpecifier(order, entityPath.get(field)));
            }
        }
        return orders;
    }
}
`;
}

// ----- Service -----
function gnServiceSource(pkg, className, pkCols, nonPkCols) {
    const isComposite = pkCols.length > 1;
    const args = pkCols.map(c => `${c.javaType} ${c.javaName}`).join(', ');
    const argsCall = pkCols.map(c => c.javaName).join(', ');
    const idType = isComposite ? `${className}Id` : pkCols[0].javaType;
    const idImport = isComposite ? `import ${pkg}.domain.${className}Id;\n` : '';
    const findById = isComposite
        ? `repo.findById(new ${className}Id(${argsCall}))`
        : `repo.findById(${argsCall})`;
    const existsById = isComposite
        ? `repo.existsById(new ${className}Id(${pkCols.map(c => 'req.get' + fmCap(c.javaName) + '()').join(', ')}))`
        : `repo.existsById(req.get${fmCap(pkCols[0].javaName)}())`;
    // saveOne/saveList 에서 req PK 값으로 update/delete 호출용
    const pkGettersFromReq = pkCols.map(c => 'req.get' + fmCap(c.javaName) + '()').join(', ');

    const setters = nonPkCols.map(c =>
        `        e.set${fmCap(c.javaName)}(req.get${fmCap(c.javaName)}());`
    ).join('\n');

    // patch: null 이 아닌 필드만 setter 호출 (PATCH 부분 업데이트)
    const patchSetters = nonPkCols.map(c =>
        `        if (req.get${fmCap(c.javaName)}() != null) e.set${fmCap(c.javaName)}(req.get${fmCap(c.javaName)}());`
    ).join('\n');

    return `package ${pkg}.service;

import ${pkg}.dto.${className}Dto;
import ${pkg}.domain.${className};
${idImport}import ${pkg}.repository.${className}Repository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.NoSuchElementException;
import java.util.List;

/** ${className} 서비스 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ${className}Service {

    private final ${className}Repository repo;

    /** 단건 조회 */
    public ${className}Dto.Item selectById(${args}) {
        return repo.selectById(${argsCall})
                .orElseThrow(() -> new NoSuchElementException("${className} not found"));
    }

    /** 전체 목록 */
    public List<${className}Dto.Item> selectList(${className}Dto.Request search) {
        return repo.selectList(search);
    }

    /** 페이지 목록 */
    public ${className}Dto.Response selectPageList(${className}Dto.Request search) {
        return repo.selectPageList(search);
    }

    /** 등록 */
    @Transactional
    public ${className}Dto.Item insert(${className}Dto.Request req) {
        if (${existsById}) {
            throw new IllegalArgumentException("Already exists");
        }
        return ${className}Dto.Item.from(repo.save(req.toEntity()));
    }

    /** 수정 (전체 교체 - 모든 필드를 req 값으로 덮어씀) */
    @Transactional
    public ${className}Dto.Item update(${args}, ${className}Dto.Request req) {
        ${className} e = ${findById}
                .orElseThrow(() -> new NoSuchElementException("${className} not found"));
${setters}
        return ${className}Dto.Item.from(e);
    }

    /** 부분 수정 (PATCH - null 이 아닌 필드만 적용. 빈 문자열은 적용됨) */
    @Transactional
    public ${className}Dto.Item patch(${args}, ${className}Dto.Request req) {
        ${className} e = ${findById}
                .orElseThrow(() -> new NoSuchElementException("${className} not found"));
${patchSetters}
        return ${className}Dto.Item.from(e);
    }

    /** 삭제 */
    @Transactional
    public void delete(${args}) {
        ${className} e = ${findById}
                .orElseThrow(() -> new NoSuchElementException("${className} not found"));
        repo.delete(e);
    }

    /**
     * 단건 일괄 저장 (rowStatus 분기)
     *  - "I" = insert / "U" = update / "D" = delete
     *  - PK 값은 req 안에 채워져 있어야 함
     */
    @Transactional
    public ${className}Dto.Item saveOne(${className}Dto.Request req) {
        String rs = req.getRowStatus() == null ? "" : req.getRowStatus().trim().toUpperCase();
        switch (rs) {
            case "I": return insert(req);
            case "U": return update(${pkGettersFromReq}, req);
            case "D": delete(${pkGettersFromReq}); return null;
            default:
                throw new IllegalArgumentException("Unknown rowStatus: [" + req.getRowStatus() + "] (expected I/U/D)");
        }
    }

    /**
     * 목록 일괄 저장 (D → U → I 순으로 처리)
     *  - 같은 트랜잭션 내에서 삭제 → 수정 → 등록 순으로 적용
     *  - rowStatus 가 비어있는 행은 무시
     */
    @Transactional
    public void saveList(List<${className}Dto.Request> reqList) {
        if (reqList == null || reqList.isEmpty()) {
            return;
        }
        // 1) D 먼저
        for (${className}Dto.Request r : reqList) {
            if ("D".equalsIgnoreCase(safe(r.getRowStatus()))) {
                saveOne(r);
            }
        }
        // 2) U
        for (${className}Dto.Request r : reqList) {
            if ("U".equalsIgnoreCase(safe(r.getRowStatus()))) {
                saveOne(r);
            }
        }
        // 3) I
        for (${className}Dto.Request r : reqList) {
            if ("I".equalsIgnoreCase(safe(r.getRowStatus()))) {
                saveOne(r);
            }
        }
    }

    private static String safe(String s) { return s == null ? "" : s.trim(); }
}
`;
}

// ----- Controller -----
function gnControllerSource(pkg, className, endpoint, pkCols) {
    const args = pkCols.map(c => `@PathVariable("${c.javaName}") ${c.javaType} ${c.javaName}`).join(',\n            ');
    const argsCall = pkCols.map(c => c.javaName).join(', ');
    const pathSeg = pkCols.map(c => `{${c.javaName}}`).join('/');

    return `package ${pkg}.controller;

import ${pkg}.dto.${className}Dto;
import ${pkg}.service.${className}Service;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** ${className} 컨트롤러 */
@Tag(name = "${className}", description = "${className} CRUD")
@RestController
@RequestMapping("/api/${endpoint}")
@RequiredArgsConstructor
public class ${className}Controller {

    private final ${className}Service service;

    /** 단건 조회 */
    @Operation(summary = "단건 조회")
    @GetMapping("/${pathSeg}")
    public ResponseEntity<${className}Dto.Item> selectById(
            ${args}) {
        return ResponseEntity.ok(service.selectById(${argsCall}));
    }

    /** 페이지 목록 */
    @Operation(summary = "페이지 목록")
    @GetMapping("/page-list")
    public ResponseEntity<${className}Dto.Response> selectPageList(@ModelAttribute ${className}Dto.Request search) {
        return ResponseEntity.ok(service.selectPageList(search));
    }

    /** 전체 목록 */
    @Operation(summary = "전체 목록")
    @GetMapping("/list")
    public ResponseEntity<List<${className}Dto.Item>> selectList(@ModelAttribute ${className}Dto.Request search) {
        return ResponseEntity.ok(service.selectList(search));
    }

    /** 등록 */
    @Operation(summary = "등록")
    @PostMapping
    public ResponseEntity<${className}Dto.Item> insert(@Valid @RequestBody ${className}Dto.Request req) {
        return ResponseEntity.ok(service.insert(req));
    }

    /** 수정 (전체 교체) */
    @Operation(summary = "수정 (전체 교체)", description = "모든 필드를 req 값으로 덮어씀")
    @PutMapping("/${pathSeg}")
    public ResponseEntity<${className}Dto.Item> update(
            ${args},
            @Valid @RequestBody ${className}Dto.Request req) {
        return ResponseEntity.ok(service.update(${argsCall}, req));
    }

    /** 부분 수정 (PATCH) */
    @Operation(summary = "부분 수정 (PATCH)", description = "null 이 아닌 필드만 변경. 빈 문자열은 적용됨")
    @PatchMapping("/${pathSeg}")
    public ResponseEntity<${className}Dto.Item> patch(
            ${args},
            @RequestBody ${className}Dto.Request req) {
        return ResponseEntity.ok(service.patch(${argsCall}, req));
    }

    /** 삭제 */
    @Operation(summary = "삭제")
    @DeleteMapping("/${pathSeg}")
    public ResponseEntity<Void> delete(
            ${args}) {
        service.delete(${argsCall});
        return ResponseEntity.noContent().build();
    }

    /** 단건 일괄 저장 (rowStatus=I/U/D) */
    @Operation(summary = "단건 일괄 저장",
               description = "Request.rowStatus 값으로 분기: I=insert / U=update / D=delete")
    @PostMapping("/save-one")
    public ResponseEntity<${className}Dto.Item> saveOne(@Valid @RequestBody ${className}Dto.Request req) {
        return ResponseEntity.ok(service.saveOne(req));
    }

    /** 목록 일괄 저장 (D → U → I 순) */
    @Operation(summary = "목록 일괄 저장",
               description = "각 행의 rowStatus 로 분기. 처리 순서: D → U → I (같은 트랜잭션)")
    @PostMapping("/save-list")
    public ResponseEntity<Void> saveList(@RequestBody List<${className}Dto.Request> reqList) {
        service.saveList(reqList);
        return ResponseEntity.noContent().build();
    }
}
`;
}
