package com.exam.jap_exam123.repository.impl;

import com.exam.jap_exam123.domain.ZzExam2;
import com.exam.jap_exam123.dto.ZzExam2Dto;
import com.exam.jap_exam123.domain.QZzExam1;
import com.exam.jap_exam123.domain.QZzExam2;
import com.exam.jap_exam123.repository.ZzExam2RepositoryCustom;
import com.querydsl.core.types.Order;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.core.types.PathBuilder;
import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.core.types.dsl.StringPath;
import com.querydsl.jpa.impl.JPAQuery;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/** zz_exam2 QueryDSL Custom 구현체 (exam1 LEFT JOIN) */
@RequiredArgsConstructor
public class ZzExam2RepositoryCustomImpl implements ZzExam2RepositoryCustom {

    private final JPAQueryFactory queryFactory;
    private static final QZzExam2 exam2 = QZzExam2.zzExam2;
    private static final QZzExam1 exam1 = QZzExam1.zzExam1;

    /** 단건 조회 */
    @Override
    public Optional<ZzExam2Dto.Item> selectById(String exam1Id, String exam2Id) {
        ZzExam2Dto.Item dto = queryFactory
                .select(Projections.bean(ZzExam2Dto.Item.class,
                        exam2.id.exam1Id
                        , exam1.exam1Nm
                        , exam2.id.exam2Id
                        , exam2.exam2Nm
                        , exam2.col21
                        , exam2.col22
                        , exam2.col23
                        , exam2.col24
                        , exam2.col25
                        , exam2.regId
                        , exam2.regDt
                        , exam2.updId
                        , exam2.updDt
                ))
                .from(exam2)
                .leftJoin(exam1).on(exam1.exam1Id.eq(exam2.id.exam1Id))
                .where(exam2.id.exam1Id.eq(exam1Id), exam2.id.exam2Id.eq(exam2Id))
                .fetchOne();
        return Optional.ofNullable(dto);
    }

    /** 전체 목록 (page/size 가 양수면 페이징 적용) */
    @Override
    public List<ZzExam2Dto.Item> selectList(ZzExam2Dto.Request search) {
        List<OrderSpecifier<?>> orderList = buildOrder(search);
        var query = buildBaseQuery()
                .where(
                        baseAndExam1Id(search),
                        baseAndExam1Nm(search),
                        baseAndExam2Id(search),
                        baseAndExam2Nm(search),
                        baseAndCol21(search),
                        baseAndCol22(search),
                        baseAndCol23(search),
                        baseAndCol24(search),
                        baseAndCol25(search),
                        baseAndDateRange(search),
                        baseAndSearchValue(search)
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
    public ZzExam2Dto.Response selectPageData(ZzExam2Dto.Request search) {
        int pageNo   = search.getPageNo()   > 0 ? search.getPageNo()   : 1;
        int pageSize = search.getPageSize() > 0 ? search.getPageSize() : 10;
        int offset   = (pageNo - 1) * pageSize;
        int limit    = pageSize;

        List<OrderSpecifier<?>> orderList = buildOrder(search);

        // 목록/카운트 공통 검색조건 (null 요소는 .where 가 자동 무시)
        BooleanExpression[] conds = {
                baseAndExam1Id(search),
                baseAndExam1Nm(search),
                baseAndExam2Id(search),
                baseAndExam2Nm(search),
                baseAndCol21(search),
                baseAndCol22(search),
                baseAndCol23(search),
                baseAndCol24(search),
                baseAndCol25(search),
                baseAndDateRange(search),
                baseAndSearchValue(search)
        };

        var query = buildBaseQuery().where(conds);
        if (!orderList.isEmpty()) {
            query = query.orderBy(orderList.toArray(OrderSpecifier[]::new));
        }
        List<ZzExam2Dto.Item> content = query.offset(offset)
                .limit(limit)
                .fetch();

        Long total = queryFactory
                .select(exam2.count())
                .from(exam2)
                .leftJoin(exam1).on(exam1.exam1Id.eq(exam2.id.exam1Id))
                .where(conds)
                .fetchOne();

        return ZzExam2Dto.Response.of(content, total == null ? 0L : total, pageNo, pageSize);
    }

    /* =============================================================
     * 검색조건 — 개별 baseAndXxx() BooleanExpression 반환 메서드 모음
     * 각 쿼리의 .where(baseAndXxx(s), ...) 에 직접 나열 — null 반환은 자동 무시
     * ============================================================= */

    /* exam1Id 정확 일치 (PK - 복합 id 경유) */
    private BooleanExpression baseAndExam1Id(ZzExam2Dto.Request s) {
        return s != null && StringUtils.hasText(s.getExam1Id())
                ? exam2.id.exam1Id.eq(s.getExam1Id()) : null;
    }

    /* exam1Nm LIKE (조인 부모 테이블) */
    private BooleanExpression baseAndExam1Nm(ZzExam2Dto.Request s) {
        return s != null && StringUtils.hasText(s.getExam1Nm())
                ? exam1.exam1Nm.containsIgnoreCase(s.getExam1Nm()) : null;
    }

    /* exam2Id 정확 일치 (PK - 복합 id 경유) */
    private BooleanExpression baseAndExam2Id(ZzExam2Dto.Request s) {
        return s != null && StringUtils.hasText(s.getExam2Id())
                ? exam2.id.exam2Id.eq(s.getExam2Id()) : null;
    }

    /* exam2Nm LIKE */
    private BooleanExpression baseAndExam2Nm(ZzExam2Dto.Request s) {
        return s != null && StringUtils.hasText(s.getExam2Nm())
                ? exam2.exam2Nm.containsIgnoreCase(s.getExam2Nm()) : null;
    }

    /* col21 LIKE */
    private BooleanExpression baseAndCol21(ZzExam2Dto.Request s) {
        return s != null && StringUtils.hasText(s.getCol21())
                ? exam2.col21.containsIgnoreCase(s.getCol21()) : null;
    }

    /* col22 LIKE */
    private BooleanExpression baseAndCol22(ZzExam2Dto.Request s) {
        return s != null && StringUtils.hasText(s.getCol22())
                ? exam2.col22.containsIgnoreCase(s.getCol22()) : null;
    }

    /* col23 LIKE */
    private BooleanExpression baseAndCol23(ZzExam2Dto.Request s) {
        return s != null && StringUtils.hasText(s.getCol23())
                ? exam2.col23.containsIgnoreCase(s.getCol23()) : null;
    }

    /* col24 LIKE */
    private BooleanExpression baseAndCol24(ZzExam2Dto.Request s) {
        return s != null && StringUtils.hasText(s.getCol24())
                ? exam2.col24.containsIgnoreCase(s.getCol24()) : null;
    }

    /* col25 LIKE */
    private BooleanExpression baseAndCol25(ZzExam2Dto.Request s) {
        return s != null && StringUtils.hasText(s.getCol25())
                ? exam2.col25.containsIgnoreCase(s.getCol25()) : null;
    }

    /* 기간 — dateType + dateStart + dateEnd (yyyy-MM-dd, 끝일 포함) */
    private BooleanExpression baseAndDateRange(ZzExam2Dto.Request s) {
        if (s == null
                || !StringUtils.hasText(s.getDateType())
                || !StringUtils.hasText(s.getDateStart())
                || !StringUtils.hasText(s.getDateEnd())) return null;
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        LocalDateTime start   = LocalDate.parse(s.getDateStart(), fmt).atStartOfDay();
        LocalDateTime endExcl = LocalDate.parse(s.getDateEnd(),   fmt).plusDays(1).atStartOfDay();
        switch (s.getDateType()) {
            case "reg_date": return exam2.regDt.goe(start).and(exam2.regDt.lt(endExcl));
            case "upd_date": return exam2.updDt.goe(start).and(exam2.updDt.lt(endExcl));
            default: return null;
        }
    }

    /* searchValue LIKE OR — searchType csv 분기 (없으면 전체 String 필드) */
    private BooleanExpression baseAndSearchValue(ZzExam2Dto.Request s) {
        if (s == null || !StringUtils.hasText(s.getSearchValue())) return null;
        String pattern = "%" + s.getSearchValue() + "%";
        String typeRaw = s.getSearchType();
        boolean all = !StringUtils.hasText(typeRaw);
        String types = all ? "" : ("," + typeRaw.trim() + ",");
        BooleanExpression or = null;
        or = orLike(or, all, types, ",exam1Id,", exam2.id.exam1Id, pattern);
        or = orLike(or, all, types, ",exam1Nm,", exam1.exam1Nm,    pattern);
        or = orLike(or, all, types, ",exam2Id,", exam2.id.exam2Id, pattern);
        or = orLike(or, all, types, ",exam2Nm,", exam2.exam2Nm,    pattern);
        or = orLike(or, all, types, ",col21,",   exam2.col21,      pattern);
        or = orLike(or, all, types, ",col22,",   exam2.col22,      pattern);
        or = orLike(or, all, types, ",col23,",   exam2.col23,      pattern);
        or = orLike(or, all, types, ",col24,",   exam2.col24,      pattern);
        or = orLike(or, all, types, ",col25,",   exam2.col25,      pattern);
        return or;
    }

    /* 단일 필드 LIKE 조건을 누적 OR (해당 type 이 포함됐을 때만) */
    private BooleanExpression orLike(BooleanExpression acc, boolean all, String types,
                                     String token, StringPath path, String pattern) {
        if (!(all || types.contains(token))) return acc;
        BooleanExpression expr = path.likeIgnoreCase(pattern);
        return acc == null ? expr : acc.or(expr);
    }

    /** 기본 쿼리 빌드 */
    private JPAQuery<ZzExam2Dto.Item> buildBaseQuery() {
        return queryFactory
                .select(Projections.bean(ZzExam2Dto.Item.class,
                        exam2.id.exam1Id
                        , exam1.exam1Nm
                        , exam2.id.exam2Id
                        , exam2.exam2Nm
                        , exam2.col21
                        , exam2.col22
                        , exam2.col23
                        , exam2.col24
                        , exam2.col25
                        , exam2.regId
                        , exam2.regDt
                        , exam2.updId
                        , exam2.updDt
                ))
                .from(exam2)
                .leftJoin(exam1).on(exam1.exam1Id.eq(exam2.id.exam1Id))
                .comment("ZzExam2 기본 조회 쿼리");
    }

    /** 정렬조건 빌드
     * 예제: "exam1Id asc", "exam1Nm desc, col21 asc"
     * 형식: "필드명 방향" (asc/desc), 여러 개는 콤마로 구분
     */
    private List<OrderSpecifier<?>> buildOrder(ZzExam2Dto.Request s) {
        if (!StringUtils.hasText(s.getSortBy())) return new ArrayList<>();
        PathBuilder<ZzExam2> entityPath = new PathBuilder<>(ZzExam2.class, "zzExam2");
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
