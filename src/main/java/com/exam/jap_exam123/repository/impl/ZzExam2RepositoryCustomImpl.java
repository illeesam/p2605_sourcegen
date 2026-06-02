package com.exam.jap_exam123.repository.impl;

import com.exam.jap_exam123.domain.ZzExam2;
import com.exam.jap_exam123.dto.ZzExam2Dto;
import com.exam.jap_exam123.domain.QZzExam1;
import com.exam.jap_exam123.domain.QZzExam2;
import com.exam.jap_exam123.repository.ZzExam2RepositoryCustom;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.Order;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.core.types.PathBuilder;
import com.querydsl.core.types.Projections;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;

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
    public ZzExam2Dto.Response selectPageData(ZzExam2Dto.Request search) {
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
        List<ZzExam2Dto.Item> content = query.offset(offset)
                .limit(limit)
                .fetch();

        Long total = queryFactory
                .select(exam2.count())
                .from(exam2)
                .leftJoin(exam1).on(exam1.exam1Id.eq(exam2.id.exam1Id))
                .where(where)
                .fetchOne();

        return ZzExam2Dto.Response.of(content, total == null ? 0L : total, pageNo, pageSize);
    }

    /** 검색조건 빌드 */
    private BooleanBuilder buildCondition(ZzExam2Dto.Request s) {
        BooleanBuilder b = new BooleanBuilder();
        if (StringUtils.hasText(s.getExam1Id())) b.and(exam2.id.exam1Id.containsIgnoreCase(s.getExam1Id()));
        if (StringUtils.hasText(s.getExam1Nm())) b.and(exam1.exam1Nm.like("%" + s.getExam1Nm() + "%"));
        if (StringUtils.hasText(s.getExam2Id())) b.and(exam2.id.exam2Id.containsIgnoreCase(s.getExam2Id()));
        if (StringUtils.hasText(s.getExam2Nm())) b.and(exam2.exam2Nm.like("%" + s.getExam2Nm() + "%"));
        if (StringUtils.hasText(s.getCol21())) b.and(exam2.col21.containsIgnoreCase(s.getCol21()));
        if (StringUtils.hasText(s.getCol22())) b.and(exam2.col22.containsIgnoreCase(s.getCol22()));
        if (StringUtils.hasText(s.getCol23())) b.and(exam2.col23.containsIgnoreCase(s.getCol23()));
        if (StringUtils.hasText(s.getCol24())) b.and(exam2.col24.containsIgnoreCase(s.getCol24()));
        if (StringUtils.hasText(s.getCol25())) b.and(exam2.col25.containsIgnoreCase(s.getCol25()));
        return b;
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
