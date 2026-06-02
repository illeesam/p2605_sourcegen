package com.exam.jap_exam123.repository.impl;

import com.exam.jap_exam123.domain.ZzExam3;
import com.exam.jap_exam123.dto.ZzExam3Dto;
import com.exam.jap_exam123.domain.QZzExam1;
import com.exam.jap_exam123.domain.QZzExam2;
import com.exam.jap_exam123.domain.QZzExam3;
import com.exam.jap_exam123.repository.ZzExam3RepositoryCustom;
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

/** zz_exam3 QueryDSL Custom 구현체 (exam1, exam2 LEFT JOIN) */
@RequiredArgsConstructor
public class ZzExam3RepositoryCustomImpl implements ZzExam3RepositoryCustom {

    private final JPAQueryFactory queryFactory;
    private static final QZzExam3 exam3 = QZzExam3.zzExam3;
    private static final QZzExam2 exam2 = QZzExam2.zzExam2;
    private static final QZzExam1 exam1 = QZzExam1.zzExam1;

    /** 단건 조회 */
    @Override
    public Optional<ZzExam3Dto.Item> selectById(String exam1Id, String exam2Id, String exam3Id) {
        ZzExam3Dto.Item dto = queryFactory
                .select(Projections.bean(ZzExam3Dto.Item.class,
                        exam3.id.exam1Id
                        , exam1.exam1Nm
                        , exam3.id.exam2Id
                        , exam2.exam2Nm
                        , exam3.id.exam3Id
                        , exam3.exam3Nm
                        , exam3.col31
                        , exam3.col32
                        , exam3.col33
                        , exam3.col34
                        , exam3.col35
                        , exam3.regId
                        , exam3.regDt
                        , exam3.updId
                        , exam3.updDt
                ))
                .from(exam3)
                .leftJoin(exam1).on(exam1.exam1Id.eq(exam3.id.exam1Id))
                .leftJoin(exam2).on(exam2.id.exam1Id.eq(exam3.id.exam1Id)
                        .and(exam2.id.exam2Id.eq(exam3.id.exam2Id)))
                .where(
                        exam3.id.exam1Id.eq(exam1Id),
                        exam3.id.exam2Id.eq(exam2Id),
                        exam3.id.exam3Id.eq(exam3Id)
                )
                .fetchOne();
        return Optional.ofNullable(dto);
    }

    /** 전체 목록 (page/size 가 양수면 페이징 적용) */
    @Override
    public List<ZzExam3Dto.Item> selectList(ZzExam3Dto.Request s) {
        List<OrderSpecifier<?>> orderList = buildOrder(s);
        var query = buildBaseQuery()
                .where(
                        baseAndExam1Id(s),
                        baseAndExam1Nm(s),
                        baseAndExam2Id(s),
                        baseAndExam2Nm(s),
                        baseAndExam3Id(s),
                        baseAndExam3Nm(s),
                        baseAndCol31(s),
                        baseAndCol32(s),
                        baseAndCol33(s),
                        baseAndCol34(s),
                        baseAndCol35(s),
                        baseAndDateRange(s),
                        baseAndSearchValue(s)
                );
        if (!orderList.isEmpty()) {
            query.orderBy(orderList.toArray(OrderSpecifier[]::new));
        }
        if (s.getPageSize() > 0 && s.getPageNo() > 0) {
            int offset = (s.getPageNo() - 1) * s.getPageSize();
            int limit  = s.getPageSize();
            query.offset(offset).limit(limit);
        }
        return query.fetch();
    }

    /** 페이지 목록 (pageNo/pageSize 미지정 시 1페이지/10건 기본) */
    @Override
    public ZzExam3Dto.Response selectPageData(ZzExam3Dto.Request s) {
        int pageNo   = s.getPageNo()   > 0 ? s.getPageNo()   : 1;
        int pageSize = s.getPageSize() > 0 ? s.getPageSize() : 10;
        int offset   = (pageNo - 1) * pageSize;
        int limit    = pageSize;

        List<OrderSpecifier<?>> orderList = buildOrder(s);

        var query = buildBaseQuery()
                .where(
                        baseAndExam1Id(s),
                        baseAndExam1Nm(s),
                        baseAndExam2Id(s),
                        baseAndExam2Nm(s),
                        baseAndExam3Id(s),
                        baseAndExam3Nm(s),
                        baseAndCol31(s),
                        baseAndCol32(s),
                        baseAndCol33(s),
                        baseAndCol34(s),
                        baseAndCol35(s),
                        baseAndDateRange(s),
                        baseAndSearchValue(s)
                );
        if (!orderList.isEmpty()) {
            query = query.orderBy(orderList.toArray(OrderSpecifier[]::new));
        }
        List<ZzExam3Dto.Item> content = query.offset(offset)
                .limit(limit)
                .fetch();

        Long total = queryFactory
                .select(exam3.count())
                .from(exam3)
                .leftJoin(exam1).on(exam1.exam1Id.eq(exam3.id.exam1Id))
                .leftJoin(exam2).on(exam2.id.exam1Id.eq(exam3.id.exam1Id)
                        .and(exam2.id.exam2Id.eq(exam3.id.exam2Id)))
                .where(
                        baseAndExam1Id(s),
                        baseAndExam1Nm(s),
                        baseAndExam2Id(s),
                        baseAndExam2Nm(s),
                        baseAndExam3Id(s),
                        baseAndExam3Nm(s),
                        baseAndCol31(s),
                        baseAndCol32(s),
                        baseAndCol33(s),
                        baseAndCol34(s),
                        baseAndCol35(s),
                        baseAndDateRange(s),
                        baseAndSearchValue(s)
                )
                .fetchOne();

        return ZzExam3Dto.Response.of(content, total == null ? 0L : total, pageNo, pageSize);
    }

    /* =============================================================
     * 검색조건 — 개별 andXxx() BooleanExpression 반환 메서드 모음
     * null 반환은 BooleanBuilder.and(...) 가 자동 무시
     * ============================================================= */

    /* exam1Id 정확 일치 (PK - 복합 id 경유) */
    private BooleanExpression baseAndExam1Id(ZzExam3Dto.Request s) {
        return s != null && StringUtils.hasText(s.getExam1Id())
                ? exam3.id.exam1Id.eq(s.getExam1Id()) : null;
    }

    /* exam1Nm LIKE (조인 조부모 테이블) */
    private BooleanExpression baseAndExam1Nm(ZzExam3Dto.Request s) {
        return s != null && StringUtils.hasText(s.getExam1Nm())
                ? exam1.exam1Nm.containsIgnoreCase(s.getExam1Nm()) : null;
    }

    /* exam2Id 정확 일치 (PK - 복합 id 경유) */
    private BooleanExpression baseAndExam2Id(ZzExam3Dto.Request s) {
        return s != null && StringUtils.hasText(s.getExam2Id())
                ? exam3.id.exam2Id.eq(s.getExam2Id()) : null;
    }

    /* exam2Nm LIKE (조인 부모 테이블) */
    private BooleanExpression baseAndExam2Nm(ZzExam3Dto.Request s) {
        return s != null && StringUtils.hasText(s.getExam2Nm())
                ? exam2.exam2Nm.containsIgnoreCase(s.getExam2Nm()) : null;
    }

    /* exam3Id 정확 일치 (PK - 복합 id 경유) */
    private BooleanExpression baseAndExam3Id(ZzExam3Dto.Request s) {
        return s != null && StringUtils.hasText(s.getExam3Id())
                ? exam3.id.exam3Id.eq(s.getExam3Id()) : null;
    }

    /* exam3Nm LIKE */
    private BooleanExpression baseAndExam3Nm(ZzExam3Dto.Request s) {
        return s != null && StringUtils.hasText(s.getExam3Nm())
                ? exam3.exam3Nm.containsIgnoreCase(s.getExam3Nm()) : null;
    }

    /* col31 LIKE */
    private BooleanExpression baseAndCol31(ZzExam3Dto.Request s) {
        return s != null && StringUtils.hasText(s.getCol31())
                ? exam3.col31.containsIgnoreCase(s.getCol31()) : null;
    }

    /* col32 LIKE */
    private BooleanExpression baseAndCol32(ZzExam3Dto.Request s) {
        return s != null && StringUtils.hasText(s.getCol32())
                ? exam3.col32.containsIgnoreCase(s.getCol32()) : null;
    }

    /* col33 LIKE */
    private BooleanExpression baseAndCol33(ZzExam3Dto.Request s) {
        return s != null && StringUtils.hasText(s.getCol33())
                ? exam3.col33.containsIgnoreCase(s.getCol33()) : null;
    }

    /* col34 LIKE */
    private BooleanExpression baseAndCol34(ZzExam3Dto.Request s) {
        return s != null && StringUtils.hasText(s.getCol34())
                ? exam3.col34.containsIgnoreCase(s.getCol34()) : null;
    }

    /* col35 LIKE */
    private BooleanExpression baseAndCol35(ZzExam3Dto.Request s) {
        return s != null && StringUtils.hasText(s.getCol35())
                ? exam3.col35.containsIgnoreCase(s.getCol35()) : null;
    }

    /* 기간 — dateType + dateStart + dateEnd (yyyy-MM-dd, 끝일 포함) */
    private BooleanExpression baseAndDateRange(ZzExam3Dto.Request s) {
        if (s == null
                || !StringUtils.hasText(s.getDateType())
                || !StringUtils.hasText(s.getDateStart())
                || !StringUtils.hasText(s.getDateEnd())) return null;
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        LocalDateTime start   = LocalDate.parse(s.getDateStart(), fmt).atStartOfDay();
        LocalDateTime endExcl = LocalDate.parse(s.getDateEnd(),   fmt).plusDays(1).atStartOfDay();
        switch (s.getDateType()) {
            case "reg_date": return exam3.regDt.goe(start).and(exam3.regDt.lt(endExcl));
            case "upd_date": return exam3.updDt.goe(start).and(exam3.updDt.lt(endExcl));
            default: return null;
        }
    }

    /* searchValue LIKE OR — searchType csv 분기 (없으면 전체 String 필드) */
    private BooleanExpression baseAndSearchValue(ZzExam3Dto.Request s) {
        if (s == null || !StringUtils.hasText(s.getSearchValue())) return null;
        String pattern = "%" + s.getSearchValue() + "%";
        String typeRaw = s.getSearchType();
        boolean all = !StringUtils.hasText(typeRaw);
        String types = all ? "" : ("," + typeRaw.trim() + ",");
        BooleanExpression or = null;
        or = orLike(or, all, types, ",exam1Id,", exam3.id.exam1Id, pattern);
        or = orLike(or, all, types, ",exam1Nm,", exam1.exam1Nm,    pattern);
        or = orLike(or, all, types, ",exam2Id,", exam3.id.exam2Id, pattern);
        or = orLike(or, all, types, ",exam2Nm,", exam2.exam2Nm,    pattern);
        or = orLike(or, all, types, ",exam3Id,", exam3.id.exam3Id, pattern);
        or = orLike(or, all, types, ",exam3Nm,", exam3.exam3Nm,    pattern);
        or = orLike(or, all, types, ",col31,",   exam3.col31,      pattern);
        or = orLike(or, all, types, ",col32,",   exam3.col32,      pattern);
        or = orLike(or, all, types, ",col33,",   exam3.col33,      pattern);
        or = orLike(or, all, types, ",col34,",   exam3.col34,      pattern);
        or = orLike(or, all, types, ",col35,",   exam3.col35,      pattern);
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
    private JPAQuery<ZzExam3Dto.Item> buildBaseQuery() {
        return queryFactory
                .select(Projections.bean(ZzExam3Dto.Item.class,
                        exam3.id.exam1Id
                        , exam1.exam1Nm
                        , exam3.id.exam2Id
                        , exam2.exam2Nm
                        , exam3.id.exam3Id
                        , exam3.exam3Nm
                        , exam3.col31
                        , exam3.col32
                        , exam3.col33
                        , exam3.col34
                        , exam3.col35
                        , exam3.regId
                        , exam3.regDt
                        , exam3.updId
                        , exam3.updDt
                ))
                .from(exam3)
                .leftJoin(exam1).on(exam1.exam1Id.eq(exam3.id.exam1Id))
                .leftJoin(exam2).on(exam2.id.exam1Id.eq(exam3.id.exam1Id)
                        .and(exam2.id.exam2Id.eq(exam3.id.exam2Id)))
                .comment("ZzExam3 기본 조회 쿼리");
    }

    /** 정렬조건 빌드
     * 예제: "exam1Id asc", "exam1Nm desc, col31 asc"
     * 형식: "필드명 방향" (asc/desc), 여러 개는 콤마로 구분
     */
    private List<OrderSpecifier<?>> buildOrder(ZzExam3Dto.Request s) {
        if (!StringUtils.hasText(s.getSortBy())) return new ArrayList<>();
        PathBuilder<ZzExam3> entityPath = new PathBuilder<>(ZzExam3.class, "zzExam3");
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
