/* ===== Source Generator : Backend (JPA) =====
 * Entity / Dto / Repository / QRepository / QRepositoryImpl / Service / Controller / VoUtil
 * 의존: fmCap(), gnAuditFields() (sourcegen.js)
 */

// ----- VoUtil (테이블 무관 공통 유틸 - Spring BeanUtils 기반 필드 복사) -----
function gnVoUtilSource(pkg) {
    return `package ${pkg}.util;

import org.springframework.beans.BeanUtils;
import org.springframework.beans.BeanWrapper;
import org.springframework.beans.BeanWrapperImpl;

import java.beans.PropertyDescriptor;
import java.util.ArrayList;
import java.util.List;

/**
 * VO/DTO/Entity 간 동일 이름 필드 복사 유틸 (Spring BeanUtils 기반)
 *  - voCopy(src, dst)           : 모든 필드 복사 (src 의 null 도 그대로 덮어씀)
 *  - voCopyIgnoreNull(src, dst) : src 의 null 필드는 건너뛰고 복사 (부분 수정용)
 */
public final class VoUtil {

    private VoUtil() {}

    /** 동일 이름 프로퍼티를 src → dst 로 전체 복사 */
    public static void voCopy(Object src, Object dst) {
        BeanUtils.copyProperties(src, dst);
    }

    /** 동일 이름 프로퍼티를 src → dst 로 복사하되, src 값이 null 인 필드는 건너뜀 */
    public static void voCopyIgnoreNull(Object src, Object dst) {
        BeanUtils.copyProperties(src, dst, nullPropertyNames(src));
    }

    /** src 에서 값이 null 인 프로퍼티 이름 목록 (ignore 대상) */
    private static String[] nullPropertyNames(Object src) {
        BeanWrapper bw = new BeanWrapperImpl(src);
        List<String> nulls = new ArrayList<>();
        for (PropertyDescriptor pd : bw.getPropertyDescriptors()) {
            if (bw.getPropertyValue(pd.getName()) == null) {
                nulls.add(pd.getName());
            }
        }
        return nulls.toArray(new String[0]);
    }
}
`;
}

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

        // 통합검색: searchValue 가 있으면 LIKE OR 검색, searchType 은 콤마구분 csv (비어있으면 전체 String 필드)
        private String searchType;
        private String searchValue;

        // 기간검색: dateType(reg_date|upd_date) + dateStart + dateEnd (yyyy-MM-dd, 끝일 포함)
        private String dateType;
        private String dateStart;
        private String dateEnd;

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
import ${pkg}.repository.qrydsl.Q${className}Repository;
${idImport}import org.springframework.data.jpa.repository.JpaRepository;

/** ${className} 리포지토리 */
public interface ${className}Repository extends JpaRepository<${className}, ${idType}>, Q${className}Repository {
}
`;
}

function gnRepoCustomSource(pkg, className, pkCols) {
    const args = pkCols.map(c => `${c.javaType} ${c.javaName}`).join(', ');
    return `package ${pkg}.repository.qrydsl;

import ${pkg}.domain.${className};
import ${pkg}.dto.${className}Dto;

import java.util.List;
import java.util.Optional;

/** ${className} QueryDSL Custom */
public interface Q${className}Repository {
    /** 단건 조회 */
    Optional<${className}Dto.Item> selectById(${args});
    /** 전체 목록 */
    List<${className}Dto.Item> selectList(${className}Dto.Request search);
    /** 페이지 목록 */
    ${className}Dto.Response selectPageData(${className}Dto.Request search);
    /** 동적 부분 수정 (null 이 아닌 필드만 set, updDt 는 DB CURRENT_TIMESTAMP 강제) */
    int updateSelective(${className} entity);
}
`;
}

function gnRepoCustomImplSource(pkg, className, varName, dataCols, pkCols, hasAudit) {
    const isComposite = pkCols.length > 1;
    const allItemCols = hasAudit ? [...dataCols, ...gnAuditFields()] : dataCols;

    const qFields = allItemCols.map(c => {
        if (isComposite && c.isPk) return `${varName}.id.${c.javaName}`;
        return `${varName}.${c.javaName}`;
    }).join(`
                        , `);

    const args = pkCols.map(c => `${c.javaType} ${c.javaName}`).join(', ');
    const whereSelectOne = pkCols.map(c => {
        const path = isComposite ? `${varName}.id.${c.javaName}` : `${varName}.${c.javaName}`;
        return `${path}.eq(${c.javaName})`;
    }).join(', ');

    // 검색 조건 (PK 외 String 컬럼만)
    const searchCols = dataCols.filter(c => c.javaType === 'String' && !c.isAudit);
    // 개별 조건 대상: PK 는 정확일치(eq), 그 외 String 컬럼은 LIKE
    const condCols = dataCols.filter(c => (c.isPk || c.javaType === 'String') && !c.isAudit);

    // .where(...) 에 직접 나열할 baseAndXxx(search) varargs 목록 (null 은 .where 가 자동 무시)
    const whereCallNames = [
        ...condCols.map(c => `baseAnd${fmCap(c.javaName)}`),
        ...(hasAudit ? ['baseAndDateRange'] : []),
        ...(searchCols.length === 0 ? [] : ['baseAndSearchValue']),
    ];
    // 쿼리 .where( ... ) 안에 들어갈 문자열 (16칸 들여쓰기)
    const whereArgs = whereCallNames
        .map(name => `                        ${name}(search)`)
        .join(',\n');

    // 개별 baseAndXxx() BooleanExpression 메서드 (PK=eq, 그 외=LIKE)
    const condMethods = condCols.map(c => {
        const path = isComposite && c.isPk ? `${varName}.id.${c.javaName}` : `${varName}.${c.javaName}`;
        const getter = `s.get${fmCap(c.javaName)}()`;
        const expr = c.isPk ? `${path}.eq(${getter})` : `${path}.containsIgnoreCase(${getter})`;
        const note = c.isPk ? '정확 일치' : 'LIKE';
        return `    /* ${c.javaName} ${note} */
    private BooleanExpression baseAnd${fmCap(c.javaName)}(${className}Dto.Request s) {
        return s != null && StringUtils.hasText(${getter})
                ? ${expr} : null;
    }`;
    }).join('\n\n');

    // 기간검색: dateType + dateStart + dateEnd (yyyy-MM-dd, 끝일 포함) — Audit 컬럼 있을 때만
    const dateRangeMethod = !hasAudit ? '' : `

    /* 기간 — dateType + dateStart + dateEnd (yyyy-MM-dd, 끝일 포함) */
    private BooleanExpression baseAndDateRange(${className}Dto.Request s) {
        if (s == null
                || !StringUtils.hasText(s.getDateType())
                || !StringUtils.hasText(s.getDateStart())
                || !StringUtils.hasText(s.getDateEnd())) return null;
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        LocalDateTime start   = LocalDate.parse(s.getDateStart(), fmt).atStartOfDay();
        LocalDateTime endExcl = LocalDate.parse(s.getDateEnd(),   fmt).plusDays(1).atStartOfDay();
        switch (s.getDateType()) {
            case "reg_date": return ${varName}.regDt.goe(start).and(${varName}.regDt.lt(endExcl));
            case "upd_date": return ${varName}.updDt.goe(start).and(${varName}.updDt.lt(endExcl));
            default: return null;
        }
    }`;

    // searchValue LIKE OR — searchType csv 분기 (없으면 전체 String 필드)
    const orLikeLines = searchCols.map(c => {
        const path = isComposite && c.isPk ? `${varName}.id.${c.javaName}` : `${varName}.${c.javaName}`;
        return `        or = orLike(or, all, types, ",${c.javaName},", ${path}, pattern);`;
    }).join('\n');
    const searchValueMethod = searchCols.length === 0 ? '' : `

    /* searchValue LIKE OR — searchType csv 분기 (없으면 전체 String 필드) */
    private BooleanExpression baseAndSearchValue(${className}Dto.Request s) {
        if (s == null || !StringUtils.hasText(s.getSearchValue())) return null;
        String pattern = "%" + s.getSearchValue() + "%";
        String typeRaw = s.getSearchType();
        boolean all = !StringUtils.hasText(typeRaw);
        String types = all ? "" : ("," + typeRaw.trim() + ",");
        BooleanExpression or = null;
${orLikeLines}
        return or;
    }

    /* 단일 필드 LIKE 조건을 누적 OR (해당 type 이 포함됐을 때만) */
    private BooleanExpression orLike(BooleanExpression acc, boolean all, String types,
                                     String token, StringPath path, String pattern) {
        if (!(all || types.contains(token))) return acc;
        BooleanExpression expr = path.likeIgnoreCase(pattern);
        return acc == null ? expr : acc.or(expr);
    }`;

    // 쿼리 .where(...) 에 직접 나열하는 개별 헬퍼 메서드 블록
    const condHelperBlock = `
    /* =============================================================
     * 검색조건 — 개별 baseAndXxx() BooleanExpression 반환 메서드 모음
     * 각 쿼리의 .where(baseAndXxx(search), ...) 에 직접 나열 — null 반환은 자동 무시
     * ============================================================= */

${condMethods}${dateRangeMethod}${searchValueMethod}`;

    // 정렬 case
    const orderCases = dataCols.map(c => {
        const path = isComposite && c.isPk ? `${varName}.id.${c.javaName}` : `${varName}.${c.javaName}`;
        return `            case "${c.javaName} asc":  return ${path}.asc();\n            case "${c.javaName} desc": return ${path}.desc();`;
    }).join('\n');

    const orderBy = isComposite
        ? pkCols.map(c => `${varName}.id.${c.javaName}.asc()`).join(', ')
        : `${varName}.${pkCols[0].javaName}.asc()`;

    // updateSelective: null 이 아닌 PK 외 데이터 컬럼만 set (updDt 는 DB CURRENT_TIMESTAMP 강제)
    const updCols = dataCols.filter(c => !c.isPk && !c.isAudit);
    const updSetLines = updCols.map(c => {
        const getter = `entity.get${fmCap(c.javaName)}()`;
        return `        if (${getter} != null) { update.set(${varName}.${c.javaName}, ${getter}); hasAny = true; }`;
    }).join('\n');
    const updIdLine = hasAudit
        ? `\n        if (entity.getUpdId() != null) { update.set(${varName}.updId, entity.getUpdId()); hasAny = true; }`
        : '';
    const updDtLine = hasAudit
        ? `\n        /* updDt 는 entity 값 무시하고 DB CURRENT_TIMESTAMP 강제 적용 */\n        update.set(${varName}.updDt, Expressions.dateTimeTemplate(LocalDateTime.class, "CURRENT_TIMESTAMP"));`
        : '';
    // PK getter: 단일은 entity.getXxx(), 복합은 entity.getId().getXxx()
    const pkGetter = c => isComposite
        ? `entity.getId().get${fmCap(c.javaName)}()`
        : `entity.get${fmCap(c.javaName)}()`;
    const updPkGuard = (isComposite ? ['entity.getId() == null', ...pkCols.map(c => `${pkGetter(c)} == null`)]
                                    : pkCols.map(c => `${pkGetter(c)} == null`)).join(' || ');
    const updWhere = pkCols.map(c => {
        const path = isComposite ? `${varName}.id.${c.javaName}` : `${varName}.${c.javaName}`;
        return `${path}.eq(${pkGetter(c)})`;
    }).join('.and(') + (isComposite ? ')'.repeat(pkCols.length - 1) : '');

    return `package ${pkg}.repository.qrydsl.impl;

import ${pkg}.domain.${className};
import ${pkg}.dto.${className}Dto;
import ${pkg}.domain.Q${className};
import ${pkg}.repository.qrydsl.Q${className}Repository;
import com.querydsl.core.types.Order;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.core.types.PathBuilder;
import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.core.types.dsl.Expressions;
import com.querydsl.core.types.dsl.StringPath;
import com.querydsl.jpa.impl.JPAQuery;
import com.querydsl.jpa.impl.JPAQueryFactory;
import com.querydsl.jpa.impl.JPAUpdateClause;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/** ${className} QueryDSL Custom 구현체 */
@RequiredArgsConstructor
public class Q${className}RepositoryImpl implements Q${className}Repository {

    private final JPAQueryFactory queryFactory;
    private static final Q${className} ${varName} = Q${className}.${varName};

    /** 단건 조회 */
    @Override
    public Optional<${className}Dto.Item> selectById(${args}) {
        ${className}Dto.Item dto = queryFactory
                .select(Projections.bean(${className}Dto.Item.class,
                        ${qFields}
                ))
                .from(${varName})
                .where(${whereSelectOne})
                .fetchOne();
        return Optional.ofNullable(dto);
    }

    /** 전체 목록 (pageNo/pageSize 가 양수면 페이징 적용) */
    @Override
    public List<${className}Dto.Item> selectList(${className}Dto.Request search) {
        List<OrderSpecifier<?>> orderList = buildOrder(search);
        var query = buildBaseQuery()
                .where(
${whereArgs}
                );
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
    public ${className}Dto.Response selectPageData(${className}Dto.Request search) {
        int pageNo   = search.getPageNo()   > 0 ? search.getPageNo()   : 1;
        int pageSize = search.getPageSize() > 0 ? search.getPageSize() : 10;
        int offset   = (pageNo - 1) * pageSize;
        int limit    = pageSize;

        List<OrderSpecifier<?>> orderList = buildOrder(search);

        // 목록/카운트 공통 검색조건 (null 요소는 .where 가 자동 무시)
        BooleanExpression[] conds = {
${whereArgs}
        };

        var query = buildBaseQuery().where(conds);
        if (!orderList.isEmpty()) {
            query = query.orderBy(orderList.toArray(OrderSpecifier[]::new));
        }
        List<${className}Dto.Item> content = query.offset(offset)
                .limit(limit)
                .fetch();

        Long total = queryFactory
                .select(${varName}.count())
                .from(${varName})
                .where(conds)
                .fetchOne();

        return ${className}Dto.Response.of(content, total == null ? 0L : total, pageNo, pageSize,
                ${className}Dto.Response.toCond(search));
    }

    /** 기본 쿼리 빌드 */
    private JPAQuery<${className}Dto.Item> buildBaseQuery() {
        return queryFactory
                .select(Projections.bean(${className}Dto.Item.class,
                        ${qFields}
                ))
                .from(${varName});
    }
${condHelperBlock}

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

    /** 동적 부분 수정 — null 이 아닌 필드만 set (updDt 는 DB CURRENT_TIMESTAMP 강제) */
    @Override
    public int updateSelective(${className} entity) {
        if (${updPkGuard}) return 0;

        JPAUpdateClause update = queryFactory.update(${varName});
        boolean hasAny = false;

${updSetLines}${updIdLine}${updDtLine}

        if (!hasAny) return 0;

        long affected = update.where(${updWhere}).execute();
        return (int) affected;
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

    // PK 를 path 값으로 (재)세팅 — 복합은 e.setId(new XxxId(...)), 단일은 e.setPk(pk)
    const pkSetterOnEntity = isComposite
        ? `        e.setId(new ${className}Id(${argsCall}));`
        : `        e.set${fmCap(pkCols[0].javaName)}(${pkCols[0].javaName});`;

    return `package ${pkg}.service;

import ${pkg}.dto.${className}Dto;
import ${pkg}.domain.${className};
${idImport}import ${pkg}.repository.${className}Repository;
import ${pkg}.util.VoUtil;
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
    public ${className}Dto.Response selectPageData(${className}Dto.Request search) {
        return repo.selectPageData(search);
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
        VoUtil.voCopy(req, e);      // 동일 이름 필드 전체 복사
${pkSetterOnEntity}      // PK 는 path 값으로 고정
        return ${className}Dto.Item.from(e);
    }

    /** 부분 수정 (PATCH - null 이 아닌 필드만 적용. 빈 문자열은 적용됨) */
    @Transactional
    public ${className}Dto.Item patch(${args}, ${className}Dto.Request req) {
        ${className} e = ${findById}
                .orElseThrow(() -> new NoSuchElementException("${className} not found"));
        VoUtil.voCopyIgnoreNull(req, e);    // null 아닌 필드만 복사
${pkSetterOnEntity}      // PK 는 path 값으로 고정
        return ${className}Dto.Item.from(e);
    }

    /** 동적 부분 수정 (QueryDSL bulk UPDATE - null 이 아닌 필드만 반영, updDt 는 DB CURRENT_TIMESTAMP) */
    @Transactional
    public ${className}Dto.Item updateSelective(${args}, ${className}Dto.Request req) {
        ${className} patch = new ${className}();
        VoUtil.voCopy(req, patch);  // 동일 이름 필드 복사 (null 도 그대로 → repo 에서 null 은 set 제외)
${pkSetterOnEntity.replace(/\be\.set/g, 'patch.set')}      // PK 는 path 값으로 고정
        int affected = repo.updateSelective(patch);
        if (affected == 0) {
            throw new NoSuchElementException("${className} not found or nothing to update");
        }
        return selectById(${argsCall});
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
    public ResponseEntity<${className}Dto.Response> selectPageData(@ModelAttribute ${className}Dto.Request search) {
        return ResponseEntity.ok(service.selectPageData(search));
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

    /** 동적 부분 수정 (QueryDSL bulk UPDATE) */
    @Operation(summary = "동적 부분 수정 (selective)",
               description = "QueryDSL bulk UPDATE - null 이 아닌 필드만 반영, updDt 는 DB CURRENT_TIMESTAMP")
    @PatchMapping("/${pathSeg}/selective")
    public ResponseEntity<${className}Dto.Item> updateSelective(
            ${args},
            @RequestBody ${className}Dto.Request req) {
        return ResponseEntity.ok(service.updateSelective(${argsCall}, req));
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
