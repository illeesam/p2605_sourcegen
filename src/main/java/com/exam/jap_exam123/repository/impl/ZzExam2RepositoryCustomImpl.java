package com.exam.jap_exam123.repository.impl;

import com.exam.jap_exam123.dto.ZzExam2Dto;
import com.exam.jap_exam123.domain.QZzExam1;
import com.exam.jap_exam123.domain.QZzExam2;
import com.exam.jap_exam123.repository.ZzExam2RepositoryCustom;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.core.types.Projections;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;

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
                        exam2.id.exam1Id, exam1.exam1Nm,
                        exam2.id.exam2Id, exam2.exam2Nm,
                        exam2.col21, exam2.col22, exam2.col23, exam2.col24, exam2.col25,
                        exam2.regId, exam2.regDt, exam2.updId, exam2.updDt
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
        var query = queryFactory
                .select(Projections.bean(ZzExam2Dto.Item.class,
                        exam2.id.exam1Id, exam1.exam1Nm,
                        exam2.id.exam2Id, exam2.exam2Nm,
                        exam2.col21, exam2.col22, exam2.col23, exam2.col24, exam2.col25,
                        exam2.regId, exam2.regDt, exam2.updId, exam2.updDt
                ))
                .from(exam2)
                .leftJoin(exam1).on(exam1.exam1Id.eq(exam2.id.exam1Id))
                .where(where)
                .orderBy(buildOrder(search));
        if (search.getPageSize() > 0 && search.getPageNo() > 0) {
            int offset = (search.getPageNo() - 1) * search.getPageSize();
            int limit  = search.getPageSize();
            query.offset(offset).limit(limit);
        }
        return query.fetch();
    }

    /** 페이지 목록 (pageNo/pageSize 미지정 시 1페이지/10건 기본) */
    @Override
    public ZzExam2Dto.Response selectPageList(ZzExam2Dto.Request search) {
        int pageNo   = search.getPageNo()   > 0 ? search.getPageNo()   : 1;
        int pageSize = search.getPageSize() > 0 ? search.getPageSize() : 10;
        int offset   = (pageNo - 1) * pageSize;
        int limit    = pageSize;

        BooleanBuilder where = buildCondition(search);

        List<ZzExam2Dto.Item> content = queryFactory
                .select(Projections.bean(ZzExam2Dto.Item.class,
                        exam2.id.exam1Id, exam1.exam1Nm,
                        exam2.id.exam2Id, exam2.exam2Nm,
                        exam2.col21, exam2.col22, exam2.col23, exam2.col24, exam2.col25,
                        exam2.regId, exam2.regDt, exam2.updId, exam2.updDt
                ))
                .from(exam2)
                .leftJoin(exam1).on(exam1.exam1Id.eq(exam2.id.exam1Id))
                .where(where)
                .orderBy(buildOrder(search))
                .offset(offset)
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

    /** 정렬조건 빌드 */
    private OrderSpecifier<?> buildOrder(ZzExam2Dto.Request s) {
        if (!StringUtils.hasText(s.getSortBy())) return null;
        switch (s.getSortBy().trim()) {
            case "exam1Id asc":  return exam2.id.exam1Id.asc();
            case "exam1Id desc": return exam2.id.exam1Id.desc();
            case "exam1Nm asc":  return exam1.exam1Nm.asc();
            case "exam1Nm desc": return exam1.exam1Nm.desc();
            case "exam2Id asc":  return exam2.id.exam2Id.asc();
            case "exam2Id desc": return exam2.id.exam2Id.desc();
            case "exam2Nm asc":  return exam2.exam2Nm.asc();
            case "exam2Nm desc": return exam2.exam2Nm.desc();
            case "col21 asc":    return exam2.col21.asc();
            case "col21 desc":   return exam2.col21.desc();
            case "col22 asc":    return exam2.col22.asc();
            case "col22 desc":   return exam2.col22.desc();
            case "col23 asc":    return exam2.col23.asc();
            case "col23 desc":   return exam2.col23.desc();
            case "col24 asc":    return exam2.col24.asc();
            case "col24 desc":   return exam2.col24.desc();
            case "col25 asc":    return exam2.col25.asc();
            case "col25 desc":   return exam2.col25.desc();
            default:             return null;
        }
    }
}
