package com.exam.jap_exam123.repository.impl;

import com.exam.jap_exam123.domain.ZzExam3;
import com.exam.jap_exam123.dto.ZzExam3Dto;
import com.exam.jap_exam123.domain.QZzExam1;
import com.exam.jap_exam123.domain.QZzExam2;
import com.exam.jap_exam123.domain.QZzExam3;
import com.exam.jap_exam123.repository.ZzExam3RepositoryCustom;
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
        BooleanBuilder where = buildCondition(s);
        List<OrderSpecifier<?>> orderList = buildOrder(s);
        var query = buildBaseQuery()
                .where(where);
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

        BooleanBuilder where = buildCondition(s);
        List<OrderSpecifier<?>> orderList = buildOrder(s);

        var query = buildBaseQuery()
                .where(where);
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
                .where(where)
                .fetchOne();

        return ZzExam3Dto.Response.of(content, total == null ? 0L : total, pageNo, pageSize);
    }

    /** 검색조건 빌드 */
    private BooleanBuilder buildCondition(ZzExam3Dto.Request s) {
        BooleanBuilder b = new BooleanBuilder();
        if (StringUtils.hasText(s.getExam1Id())) b.and(exam3.id.exam1Id.containsIgnoreCase(s.getExam1Id()));
        if (StringUtils.hasText(s.getExam1Nm())) b.and(exam1.exam1Nm.like("%" + s.getExam1Nm() + "%"));
        if (StringUtils.hasText(s.getExam2Id())) b.and(exam3.id.exam2Id.containsIgnoreCase(s.getExam2Id()));
        if (StringUtils.hasText(s.getExam2Nm())) b.and(exam2.exam2Nm.like("%" + s.getExam2Nm() + "%"));
        if (StringUtils.hasText(s.getExam3Id())) b.and(exam3.id.exam3Id.containsIgnoreCase(s.getExam3Id()));
        if (StringUtils.hasText(s.getExam3Nm())) b.and(exam3.exam3Nm.like("%" + s.getExam3Nm() + "%"));
        if (StringUtils.hasText(s.getCol31())) b.and(exam3.col31.containsIgnoreCase(s.getCol31()));
        if (StringUtils.hasText(s.getCol32())) b.and(exam3.col32.containsIgnoreCase(s.getCol32()));
        if (StringUtils.hasText(s.getCol33())) b.and(exam3.col33.containsIgnoreCase(s.getCol33()));
        if (StringUtils.hasText(s.getCol34())) b.and(exam3.col34.containsIgnoreCase(s.getCol34()));
        if (StringUtils.hasText(s.getCol35())) b.and(exam3.col35.containsIgnoreCase(s.getCol35()));
        return b;
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
