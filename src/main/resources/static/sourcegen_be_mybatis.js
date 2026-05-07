/* ===== Source Generator : Backend (MyBatis) =====
 * Dto / Mapper(.java) / Mapper(.xml) / Service / Controller
 * 의존: fmCap(), gnAuditFields() (sourcegen.js)
 */

// jpa DTO 와 거의 동일하지만 toEntity / @QueryProjection 제거.
function gnMybatisDtoSource(pkg, className, dataCols, pkCols, nonPkCols, hasAudit, usesLocalDate) {
    const allItemCols = hasAudit ? [...dataCols, ...gnAuditFields()] : dataCols;
    const importLocalDt = (usesLocalDate || hasAudit)
        ? 'import java.time.LocalDateTime;\n' : '';

    const reqFields = dataCols.map(c => {
        const required = !c.nullable && !c.isAudit;
        const annot = required ? `        @NotBlank(message = "${c.javaName}는 필수입니다")\n` : '';
        const sizeAnn = c.size ? `        @Size(max = ${c.size})\n` : '';
        return `${annot}${sizeAnn}        private ${c.javaType} ${c.javaName};`;
    }).join('\n\n');

    const itemFields = allItemCols.map(c => `        private ${c.javaType} ${c.javaName};`).join('\n');

    const condCols = dataCols.filter(c => !c.isAudit);
    const condPutters = condCols.map(c => {
        const getter = 'get' + fmCap(c.javaName) + '()';
        const cond = c.javaType === 'String'
            ? `s.${getter} != null && !s.${getter}.isEmpty()`
            : `s.${getter} != null`;
        return `            if (${cond}) m.put("${c.javaName}", s.${getter});`;
    }).join('\n');

    return `package ${pkg}.mybatis.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

${importLocalDt}import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;

/** ${className} MyBatis DTO (Request / Item / Response) */
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

        public int getOffset() { return (pageNo - 1) * pageSize; }
    }

    /** 응답 DTO (단건/목록 행) — MyBatis 가 setter 로 매핑 */
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public static class Item {
${itemFields}
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

// ----- MyBatis Mapper interface -----
function gnMybatisMapperSource(pkg, className, pkCols) {
    const args = pkCols.map(c => `@Param("${c.javaName}") ${c.javaType} ${c.javaName}`).join(', ');
    // PK 가 여러개면 @Param 로 PK 구분, 그게 아니면 단일 파라미터(필드 직접 접근) 형태로 충분.
    const argsForSearch = `${className}Dto.Request search`;
    return `package ${pkg}.mybatis.mapper;

import ${pkg}.mybatis.dto.${className}Dto;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/** ${className} MyBatis Mapper */
@Mapper
public interface ${className}Mapper {

    /** 단건 조회 */
    ${className}Dto.Item selectById(${args});

    /** 전체 목록 (페이징 미적용 또는 적용 — XML 내부에서 분기) */
    List<${className}Dto.Item> selectList(${argsForSearch});

    /** 페이지 목록 */
    List<${className}Dto.Item> selectPageList(${argsForSearch});

    /** 전체 건수 (검색조건 적용) */
    long selectTotalCount(${argsForSearch});

    /** 등록 */
    int insert(${className}Dto.Request req);

    /** 수정 (전체 교체) */
    int update(${className}Dto.Request req);

    /** 부분 수정 (PATCH - null 아닌 필드만) */
    int patch(${className}Dto.Request req);

    /** 삭제 */
    int delete(${args});
}
`;
}

// ----- MyBatis Mapper XML -----
function gnMybatisMapperXmlSource(pkg, className, table, dataCols, pkCols, nonPkCols, hasAudit) {
    // SELECT 문 테이블 alias (default 'a')
    const TA = 'a';

    const allItemCols = hasAudit ? [...dataCols, ...gnAuditFields()] : dataCols;
    // SELECT 컬럼 목록 - alias prefix 적용
    const colList = allItemCols.map(c => `${TA}.${c.name}`).join(', ');
    const resultMaps = allItemCols.map(c => {
        const isPk = c.isPk ? ' isPk="true"' : '';
        const tag = c.isPk ? 'id' : 'result';
        return `        <${tag} property="${c.javaName}" column="${c.name}"/>`;
    }).join('\n');

    // 검색조건 - SELECT 문 안에서만 쓰이므로 alias prefix 적용
    const stringDataCols = dataCols.filter(c => c.javaType === 'String' && !c.isAudit);
    const condIfs = stringDataCols.map(c =>
        `        <if test="${c.javaName} != null and ${c.javaName} != ''">\n` +
        `            AND UPPER(${TA}.${c.name}) LIKE '%' || UPPER(#{${c.javaName}}) || '%'\n` +
        `        </if>`
    ).join('\n');

    // 정렬 - SELECT 문 안에서만 쓰이므로 alias prefix 적용
    const sortChoose = dataCols.filter(c => !c.isAudit).map(c =>
        `            <when test="sortBy == '${c.javaName} asc'">${TA}.${c.name} ASC</when>\n` +
        `            <when test="sortBy == '${c.javaName} desc'">${TA}.${c.name} DESC</when>`
    ).join('\n');
    const defaultOrderBy = pkCols.map(c => `${TA}.${c.name}`).join(', ');

    // INSERT/UPDATE/DELETE 는 alias 미사용 (DB 호환성)
    const insertCols = dataCols.filter(c => !c.isAudit).map(c => c.name).join(', ');
    const insertVals = dataCols.filter(c => !c.isAudit).map(c => `#{${c.javaName}}`).join(', ');

    const updateSets = nonPkCols.filter(c => !c.isAudit)
        .map(c => `            ${c.name} = #{${c.javaName}}`).join(',\n');
    const patchSets = nonPkCols.filter(c => !c.isAudit).map(c =>
        `            <if test="${c.javaName} != null">${c.name} = #{${c.javaName}},</if>`
    ).join('\n');

    // PK WHERE — SELECT 용은 alias prefix, UPDATE/DELETE 용은 alias 없음
    const pkWhereSel = pkCols.map(c => `${TA}.${c.name} = #{${c.javaName}}`).join(' AND ');
    const pkWhere    = pkCols.map(c => `${c.name} = #{${c.javaName}}`).join(' AND ');
    const pkWhereReq = pkCols.map(c => `${c.name} = #{${c.javaName}}`).join(' AND ');

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
        "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="${pkg}.mybatis.mapper.${className}Mapper">

    <!-- ResultMap: 컬럼 → DTO.Item 필드 매핑 -->
    <resultMap id="${className}ItemMap" type="${pkg}.mybatis.dto.${className}Dto$Item">
${resultMaps}
    </resultMap>

    <!-- 검색조건 sql 조각 (LIKE - 대소문자 무시) — SELECT 전용, alias '${TA}' 사용 -->
    <sql id="conditions">
${condIfs}
    </sql>

    <!-- 정렬 sql 조각 — SELECT 전용, alias '${TA}' 사용 -->
    <sql id="orderBy">
        <choose>
${sortChoose}
            <otherwise>${defaultOrderBy}</otherwise>
        </choose>
    </sql>

    <!-- 단건 조회 -->
    <select id="selectById" resultMap="${className}ItemMap">
        /* ${className}Mapper :: selectById */
        SELECT ${colList}
          FROM ${table} ${TA}
         WHERE ${pkWhereSel}
    </select>

    <!-- 전체 목록 (pageSize 가 양수이면 페이징 적용 - DB 별 분기 필요시 수정) -->
    <select id="selectList" resultMap="${className}ItemMap">
        /* ${className}Mapper :: selectList */
        SELECT ${colList}
          FROM ${table} ${TA}
         <where><include refid="conditions"/></where>
         ORDER BY <include refid="orderBy"/>
        <if test="pageSize gt 0 and pageNo gt 0">
            OFFSET #{offset} ROWS FETCH NEXT #{pageSize} ROWS ONLY
        </if>
    </select>

    <!-- 페이지 목록 -->
    <select id="selectPageList" resultMap="${className}ItemMap">
        /* ${className}Mapper :: selectPageList */
        SELECT ${colList}
          FROM ${table} ${TA}
         <where><include refid="conditions"/></where>
         ORDER BY <include refid="orderBy"/>
        OFFSET #{offset} ROWS FETCH NEXT #{pageSize} ROWS ONLY
    </select>

    <!-- 전체 건수 -->
    <select id="selectTotalCount" resultType="long">
        /* ${className}Mapper :: selectTotalCount */
        SELECT COUNT(*) FROM ${table} ${TA}
        <where><include refid="conditions"/></where>
    </select>

    <!-- 등록 -->
    <insert id="insert">
        /* ${className}Mapper :: insert */
        INSERT INTO ${table} (${insertCols})
        VALUES (${insertVals})
    </insert>

    <!-- 수정 (전체 교체) -->
    <update id="update">
        /* ${className}Mapper :: update */
        UPDATE ${table} SET
${updateSets}
        WHERE ${pkWhereReq}
    </update>

    <!-- 부분 수정 (PATCH - null 아닌 필드만) -->
    <update id="patch">
        /* ${className}Mapper :: patch */
        UPDATE ${table}
        <set>
${patchSets}
        </set>
        WHERE ${pkWhereReq}
    </update>

    <!-- 삭제 -->
    <delete id="delete">
        /* ${className}Mapper :: delete */
        DELETE FROM ${table} WHERE ${pkWhere}
    </delete>

</mapper>
`;
}

// ----- MyBatis Service -----
function gnMybatisServiceSource(pkg, className, pkCols, nonPkCols) {
    const args = pkCols.map(c => `${c.javaType} ${c.javaName}`).join(', ');
    const argsCall = pkCols.map(c => c.javaName).join(', ');
    const pkGettersFromReq = pkCols.map(c => 'req.get' + fmCap(c.javaName) + '()').join(', ');

    return `package ${pkg}.mybatis.service;

import ${pkg}.mybatis.dto.${className}Dto;
import ${pkg}.mybatis.mapper.${className}Mapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

/** ${className} MyBatis 서비스 */
@Service("mybatis${className}Service")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ${className}Service {

    private final ${className}Mapper mapper;

    /** 단건 조회 */
    public ${className}Dto.Item selectById(${args}) {
        ${className}Dto.Item it = mapper.selectById(${argsCall});
        if (it == null) {
            throw new NoSuchElementException("${className} not found");
        }
        return it;
    }

    /** 전체 목록 */
    public List<${className}Dto.Item> selectList(${className}Dto.Request search) {
        return mapper.selectList(search);
    }

    /** 페이지 목록 */
    public ${className}Dto.Response selectPageList(${className}Dto.Request search) {
        int pageNo   = search.getPageNo()   > 0 ? search.getPageNo()   : 1;
        int pageSize = search.getPageSize() > 0 ? search.getPageSize() : 10;
        search.setPageNo(pageNo);
        search.setPageSize(pageSize);
        List<${className}Dto.Item> rows = mapper.selectPageList(search);
        long total = mapper.selectTotalCount(search);
        return ${className}Dto.Response.of(rows, total, pageNo, pageSize,
                ${className}Dto.Response.toCond(search));
    }

    /** 등록 */
    @Transactional
    public ${className}Dto.Item insert(${className}Dto.Request req) {
        mapper.insert(req);
        return selectById(${pkGettersFromReq});
    }

    /** 수정 (전체 교체) */
    @Transactional
    public ${className}Dto.Item update(${args}, ${className}Dto.Request req) {
${pkCols.map(c => `        req.set${fmCap(c.javaName)}(${c.javaName});`).join('\n')}
        if (mapper.update(req) == 0) throw new NoSuchElementException("${className} not found");
        return selectById(${argsCall});
    }

    /** 부분 수정 (PATCH) */
    @Transactional
    public ${className}Dto.Item patch(${args}, ${className}Dto.Request req) {
${pkCols.map(c => `        req.set${fmCap(c.javaName)}(${c.javaName});`).join('\n')}
        if (mapper.patch(req) == 0) throw new NoSuchElementException("${className} not found");
        return selectById(${argsCall});
    }

    /** 삭제 */
    @Transactional
    public void delete(${args}) {
        if (mapper.delete(${argsCall}) == 0) throw new NoSuchElementException("${className} not found");
    }

    /** 단건 일괄 저장 (rowStatus = I/U/D) */
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

    /** 목록 일괄 저장 (D → U → I) */
    @Transactional
    public void saveList(List<${className}Dto.Request> reqList) {
        if (reqList == null || reqList.isEmpty()) {
            return;
        }
        for (${className}Dto.Request r : reqList) {
            if ("D".equalsIgnoreCase(safe(r.getRowStatus()))) {
                saveOne(r);
            }
        }
        for (${className}Dto.Request r : reqList) {
            if ("U".equalsIgnoreCase(safe(r.getRowStatus()))) {
                saveOne(r);
            }
        }
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

// ----- MyBatis Controller -----
// 경로: /api/mybatis/${endpoint} (jpa 와 충돌 방지)
function gnMybatisControllerSource(pkg, className, endpoint, pkCols) {
    const args = pkCols.map(c => `@PathVariable("${c.javaName}") ${c.javaType} ${c.javaName}`).join(',\n            ');
    const argsCall = pkCols.map(c => c.javaName).join(', ');
    const pathSeg = pkCols.map(c => `{${c.javaName}}`).join('/');

    return `package ${pkg}.mybatis.controller;

import ${pkg}.mybatis.dto.${className}Dto;
import ${pkg}.mybatis.service.${className}Service;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** ${className} MyBatis 컨트롤러 (jpa 와 동시 운영을 위해 /api/mybatis prefix) */
@Tag(name = "${className} (MyBatis)", description = "${className} MyBatis CRUD")
@RestController("mybatis${className}Controller")
@RequestMapping("/api/mybatis/${endpoint}")
@RequiredArgsConstructor
public class ${className}Controller {

    private final ${className}Service service;

    @Operation(summary = "단건 조회")
    @GetMapping("/${pathSeg}")
    public ResponseEntity<${className}Dto.Item> selectById(
            ${args}) {
        return ResponseEntity.ok(service.selectById(${argsCall}));
    }

    @Operation(summary = "페이지 목록")
    @GetMapping("/page-list")
    public ResponseEntity<${className}Dto.Response> selectPageList(@ModelAttribute ${className}Dto.Request search) {
        return ResponseEntity.ok(service.selectPageList(search));
    }

    @Operation(summary = "전체 목록")
    @GetMapping("/list")
    public ResponseEntity<List<${className}Dto.Item>> selectList(@ModelAttribute ${className}Dto.Request search) {
        return ResponseEntity.ok(service.selectList(search));
    }

    @Operation(summary = "등록")
    @PostMapping
    public ResponseEntity<${className}Dto.Item> insert(@Valid @RequestBody ${className}Dto.Request req) {
        return ResponseEntity.ok(service.insert(req));
    }

    @Operation(summary = "수정 (전체 교체)")
    @PutMapping("/${pathSeg}")
    public ResponseEntity<${className}Dto.Item> update(
            ${args},
            @Valid @RequestBody ${className}Dto.Request req) {
        return ResponseEntity.ok(service.update(${argsCall}, req));
    }

    @Operation(summary = "부분 수정 (PATCH)")
    @PatchMapping("/${pathSeg}")
    public ResponseEntity<${className}Dto.Item> patch(
            ${args},
            @RequestBody ${className}Dto.Request req) {
        return ResponseEntity.ok(service.patch(${argsCall}, req));
    }

    @Operation(summary = "삭제")
    @DeleteMapping("/${pathSeg}")
    public ResponseEntity<Void> delete(
            ${args}) {
        service.delete(${argsCall});
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "단건 일괄 저장 (rowStatus=I/U/D)")
    @PostMapping("/save-one")
    public ResponseEntity<${className}Dto.Item> saveOne(@Valid @RequestBody ${className}Dto.Request req) {
        return ResponseEntity.ok(service.saveOne(req));
    }

    @Operation(summary = "목록 일괄 저장 (D → U → I)")
    @PostMapping("/save-list")
    public ResponseEntity<Void> saveList(@RequestBody List<${className}Dto.Request> reqList) {
        service.saveList(reqList);
        return ResponseEntity.noContent().build();
    }
}
`;
}
