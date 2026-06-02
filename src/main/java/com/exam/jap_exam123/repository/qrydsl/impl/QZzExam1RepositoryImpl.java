package com.exam.jap_exam123.repository.qrydsl.impl;

import com.exam.jap_exam123.domain.ZzExam1;
import com.exam.jap_exam123.dto.ZzExam1Dto;
import com.exam.jap_exam123.domain.QZzExam1;
import com.exam.jap_exam123.repository.qrydsl.QZzExam1Repository;
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

/** zz_exam1 QueryDSL Custom 구현체 */
@RequiredArgsConstructor
public class QZzExam1RepositoryImpl implements QZzExam1Repository {

    private final JPAQueryFactory queryFactory;
    private static final QZzExam1 exam1 = QZzExam1.zzExam1;

    /** 기본 쿼리 빌드 */
    private JPAQuery<ZzExam1Dto.Item> buildBaseQuery() {
        return queryFactory
                .select(Projections.bean(ZzExam1Dto.Item.class,
                        exam1.exam1Id
                        , exam1.exam1Nm
                        , exam1.col11
                        , exam1.col12
                        , exam1.col13
                        , exam1.col14
                        , exam1.col15
                        , exam1.regId
                        , exam1.regDt
                        , exam1.updId
                        , exam1.updDt
                ))
                .from(exam1);
    }

    /** 단건 조회 */
    @Override
    public Optional<ZzExam1Dto.Item> selectById(String exam1Id) {
        ZzExam1Dto.Item dto = queryFactory
                .select(Projections.bean(ZzExam1Dto.Item.class,
                        exam1.exam1Id
                        , exam1.exam1Nm
                        , exam1.col11
                        , exam1.col12
                        , exam1.col13
                        , exam1.col14
                        , exam1.col15
                        , exam1.regId
                        , exam1.regDt
                        , exam1.updId
                        , exam1.updDt
                ))
                .from(exam1)
                .where(exam1.exam1Id.eq(exam1Id))
                .fetchOne();
        return Optional.ofNullable(dto);
    }

    /** 전체 목록 (page/size 가 양수면 페이징 적용) */
    @Override
    public List<ZzExam1Dto.Item> selectList(ZzExam1Dto.Request search) {
        List<OrderSpecifier<?>> orderList = buildOrder(search);
        var query = buildBaseQuery()
                .where(
                        baseAndExam1Id(search),
                        baseAndExam1Nm(search),
                        baseAndCol11(search),
                        baseAndCol12(search),
                        baseAndCol13(search),
                        baseAndCol14(search),
                        baseAndCol15(search),
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
    public ZzExam1Dto.Response selectPageData(ZzExam1Dto.Request search) {
        int pageNo   = search.getPageNo()   > 0 ? search.getPageNo()   : 1;
        int pageSize = search.getPageSize() > 0 ? search.getPageSize() : 10;
        int offset   = (pageNo - 1) * pageSize;
        int limit    = pageSize;

        List<OrderSpecifier<?>> orderList = buildOrder(search);

        var query = buildBaseQuery()
                .where(
                        baseAndExam1Id(search),
                        baseAndExam1Nm(search),
                        baseAndCol11(search),
                        baseAndCol12(search),
                        baseAndCol13(search),
                        baseAndCol14(search),
                        baseAndCol15(search),
                        baseAndDateRange(search),
                        baseAndSearchValue(search)
                );
        if (!orderList.isEmpty()) {
            query = query.orderBy(orderList.toArray(OrderSpecifier[]::new));
        }
        List<ZzExam1Dto.Item> content = query.offset(offset)
                .limit(limit)
                .fetch();

        Long total = queryFactory
                .select(exam1.count())
                .from(exam1)
                .where(
                        baseAndExam1Id(search),
                        baseAndExam1Nm(search),
                        baseAndCol11(search),
                        baseAndCol12(search),
                        baseAndCol13(search),
                        baseAndCol14(search),
                        baseAndCol15(search),
                        baseAndDateRange(search),
                        baseAndSearchValue(search)
                )
                .fetchOne();

        return ZzExam1Dto.Response.of(content, total == null ? 0L : total, pageNo, pageSize);
    }

    /* =============================================================
     * 검색조건 — 개별 andXxx() BooleanExpression 반환 메서드 모음
     * null 반환은 BooleanBuilder.and(...) 가 자동 무시
     * ============================================================= */

    /* exam1Id 정확 일치 */
    private BooleanExpression baseAndExam1Id(ZzExam1Dto.Request s) {
        return s != null && StringUtils.hasText(s.getExam1Id())
                ? exam1.exam1Id.eq(s.getExam1Id()) : null;
    }

    /* exam1Nm LIKE */
    private BooleanExpression baseAndExam1Nm(ZzExam1Dto.Request s) {
        return s != null && StringUtils.hasText(s.getExam1Nm())
                ? exam1.exam1Nm.containsIgnoreCase(s.getExam1Nm()) : null;
    }

    /* col11 LIKE */
    private BooleanExpression baseAndCol11(ZzExam1Dto.Request s) {
        return s != null && StringUtils.hasText(s.getCol11())
                ? exam1.col11.containsIgnoreCase(s.getCol11()) : null;
    }

    /* col12 LIKE */
    private BooleanExpression baseAndCol12(ZzExam1Dto.Request s) {
        return s != null && StringUtils.hasText(s.getCol12())
                ? exam1.col12.containsIgnoreCase(s.getCol12()) : null;
    }

    /* col13 LIKE */
    private BooleanExpression baseAndCol13(ZzExam1Dto.Request s) {
        return s != null && StringUtils.hasText(s.getCol13())
                ? exam1.col13.containsIgnoreCase(s.getCol13()) : null;
    }

    /* col14 LIKE */
    private BooleanExpression baseAndCol14(ZzExam1Dto.Request s) {
        return s != null && StringUtils.hasText(s.getCol14())
                ? exam1.col14.containsIgnoreCase(s.getCol14()) : null;
    }

    /* col15 LIKE */
    private BooleanExpression baseAndCol15(ZzExam1Dto.Request s) {
        return s != null && StringUtils.hasText(s.getCol15())
                ? exam1.col15.containsIgnoreCase(s.getCol15()) : null;
    }

    /* 기간 — dateType + dateStart + dateEnd (yyyy-MM-dd, 끝일 포함) */
    private BooleanExpression baseAndDateRange(ZzExam1Dto.Request s) {
        if (s == null
                || !StringUtils.hasText(s.getDateType())
                || !StringUtils.hasText(s.getDateStart())
                || !StringUtils.hasText(s.getDateEnd())) return null;
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        LocalDateTime start   = LocalDate.parse(s.getDateStart(), fmt).atStartOfDay();
        LocalDateTime endExcl = LocalDate.parse(s.getDateEnd(),   fmt).plusDays(1).atStartOfDay();
        switch (s.getDateType()) {
            case "reg_date": return exam1.regDt.goe(start).and(exam1.regDt.lt(endExcl));
            case "upd_date": return exam1.updDt.goe(start).and(exam1.updDt.lt(endExcl));
            default: return null;
        }
    }

    /* searchValue LIKE OR — searchType csv 분기 (없으면 전체 String 필드) */
    private BooleanExpression baseAndSearchValue(ZzExam1Dto.Request s) {
        if (s == null || !StringUtils.hasText(s.getSearchValue())) return null;
        String pattern = "%" + s.getSearchValue() + "%";
        String typeRaw = s.getSearchType();
        boolean all = !StringUtils.hasText(typeRaw);
        String types = all ? "" : ("," + typeRaw.trim() + ",");
        BooleanExpression or = null;
        or = orLike(or, all, types, ",exam1Id,", exam1.exam1Id, pattern);
        or = orLike(or, all, types, ",exam1Nm,", exam1.exam1Nm, pattern);
        or = orLike(or, all, types, ",col11,",   exam1.col11,   pattern);
        or = orLike(or, all, types, ",col12,",   exam1.col12,   pattern);
        or = orLike(or, all, types, ",col13,",   exam1.col13,   pattern);
        or = orLike(or, all, types, ",col14,",   exam1.col14,   pattern);
        or = orLike(or, all, types, ",col15,",   exam1.col15,   pattern);
        return or;
    }

    /* 단일 필드 LIKE 조건을 누적 OR (해당 type 이 포함됐을 때만) */
    private BooleanExpression orLike(BooleanExpression acc, boolean all, String types,
                                     String token, StringPath path, String pattern) {
        if (!(all || types.contains(token))) return acc;
        BooleanExpression expr = path.likeIgnoreCase(pattern);
        return acc == null ? expr : acc.or(expr);
    }

    /** 정렬조건 빌드
     * 예제: "exam1Id asc", "exam1Nm desc, col11 asc"
     * 형식: "필드명 방향" (asc/desc), 여러 개는 콤마로 구분
     */
    private List<OrderSpecifier<?>> buildOrder(ZzExam1Dto.Request s) {
        if (!StringUtils.hasText(s.getSortBy())) return new ArrayList<>();
        PathBuilder<ZzExam1> entityPath = new PathBuilder<>(ZzExam1.class, "zzExam1");
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
    public int updateSelective(ZzExam1 entity) {
        if (entity.getExam1Id() == null) return 0;

        JPAUpdateClause update = queryFactory.update(exam1);
        boolean hasAny = false;

        if (entity.getExam1Nm() != null) { update.set(exam1.exam1Nm, entity.getExam1Nm()); hasAny = true; }
        if (entity.getCol11()   != null) { update.set(exam1.col11,   entity.getCol11());   hasAny = true; }
        if (entity.getCol12()   != null) { update.set(exam1.col12,   entity.getCol12());   hasAny = true; }
        if (entity.getCol13()   != null) { update.set(exam1.col13,   entity.getCol13());   hasAny = true; }
        if (entity.getCol14()   != null) { update.set(exam1.col14,   entity.getCol14());   hasAny = true; }
        if (entity.getCol15()   != null) { update.set(exam1.col15,   entity.getCol15());   hasAny = true; }
        if (entity.getUpdId()   != null) { update.set(exam1.updId,   entity.getUpdId());   hasAny = true; }
        /* updDt 는 entity 값 무시하고 DB CURRENT_TIMESTAMP 강제 적용 */
        update.set(exam1.updDt, Expressions.dateTimeTemplate(LocalDateTime.class, "CURRENT_TIMESTAMP"));

        if (!hasAny) return 0;

        long affected = update.where(exam1.exam1Id.eq(entity.getExam1Id())).execute();
        return (int) affected;
    }
}
