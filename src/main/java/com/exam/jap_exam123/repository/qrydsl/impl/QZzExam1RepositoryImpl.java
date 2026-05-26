package com.exam.jap_exam123.repository.qrydsl.impl;

import com.exam.jap_exam123.domain.ZzExam1;
import com.exam.jap_exam123.dto.ZzExam1Dto;
import com.exam.jap_exam123.domain.QZzExam1;
import com.exam.jap_exam123.repository.qrydsl.QZzExam1Repository;
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
    public ZzExam1Dto.Response selectPageList(ZzExam1Dto.Request search) {
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
        List<ZzExam1Dto.Item> content = query.offset(offset)
                .limit(limit)
                .fetch();

        Long total = queryFactory
                .select(exam1.count())
                .from(exam1)
                .where(where)
                .fetchOne();

        return ZzExam1Dto.Response.of(content, total == null ? 0L : total, pageNo, pageSize);
    }

    /** 검색조건 빌드 */
    private BooleanBuilder buildCondition(ZzExam1Dto.Request s) {
        BooleanBuilder b = new BooleanBuilder();
        if (StringUtils.hasText(s.getExam1Id())) b.and(exam1.exam1Id.containsIgnoreCase(s.getExam1Id()));
        if (StringUtils.hasText(s.getExam1Nm())) b.and(exam1.exam1Nm.like("%" + s.getExam1Nm() + "%"));
        if (StringUtils.hasText(s.getCol11())) b.and(exam1.col11.containsIgnoreCase(s.getCol11()));
        if (StringUtils.hasText(s.getCol12())) b.and(exam1.col12.containsIgnoreCase(s.getCol12()));
        if (StringUtils.hasText(s.getCol13())) b.and(exam1.col13.containsIgnoreCase(s.getCol13()));
        if (StringUtils.hasText(s.getCol14())) b.and(exam1.col14.containsIgnoreCase(s.getCol14()));
        if (StringUtils.hasText(s.getCol15())) b.and(exam1.col15.containsIgnoreCase(s.getCol15()));
        return b;
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
}
