package com.exam.jap_exam123.repository.impl;

import com.exam.jap_exam123.dto.QZzExam1Dto_Item;
import com.exam.jap_exam123.dto.ZzExam1Dto;
import com.exam.jap_exam123.domain.QZzExam1;
import com.exam.jap_exam123.repository.ZzExam1RepositoryCustom;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Optional;

/** zz_exam1 QueryDSL Custom 구현체 */
@RequiredArgsConstructor
public class ZzExam1RepositoryCustomImpl implements ZzExam1RepositoryCustom {

    private final JPAQueryFactory queryFactory;
    private static final QZzExam1 exam1 = QZzExam1.zzExam1;

    /** 단건 조회 */
    @Override
    public Optional<ZzExam1Dto.Item> selectById(String exam1Id) {
        ZzExam1Dto.Item dto = queryFactory
                .select(new QZzExam1Dto_Item(
                        exam1.exam1Id, exam1.exam1Nm,
                        exam1.col11, exam1.col12, exam1.col13, exam1.col14, exam1.col15,
                        exam1.regId, exam1.regDt, exam1.updId, exam1.updDt
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
        var query = queryFactory
                .select(new QZzExam1Dto_Item(
                        exam1.exam1Id, exam1.exam1Nm,
                        exam1.col11, exam1.col12, exam1.col13, exam1.col14, exam1.col15,
                        exam1.regId, exam1.regDt, exam1.updId, exam1.updDt
                ))
                .from(exam1)
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
    public ZzExam1Dto.Response selectPageList(ZzExam1Dto.Request search) {
        int pageNo   = search.getPageNo()   > 0 ? search.getPageNo()   : 1;
        int pageSize = search.getPageSize() > 0 ? search.getPageSize() : 10;
        int offset   = (pageNo - 1) * pageSize;
        int limit    = pageSize;

        BooleanBuilder where = buildCondition(search);

        List<ZzExam1Dto.Item> content = queryFactory
                .select(new QZzExam1Dto_Item(
                        exam1.exam1Id, exam1.exam1Nm,
                        exam1.col11, exam1.col12, exam1.col13, exam1.col14, exam1.col15,
                        exam1.regId, exam1.regDt, exam1.updId, exam1.updDt
                ))
                .from(exam1)
                .where(where)
                .orderBy(buildOrder(search))
                .offset(offset)
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

    /** 정렬조건 빌드 */
    private OrderSpecifier<?> buildOrder(ZzExam1Dto.Request s) {
        if (!StringUtils.hasText(s.getSortBy())) return null;
        switch (s.getSortBy().trim()) {
            case "exam1Id asc":  return exam1.exam1Id.asc();
            case "exam1Id desc": return exam1.exam1Id.desc();
            case "exam1Nm asc":  return exam1.exam1Nm.asc();
            case "exam1Nm desc": return exam1.exam1Nm.desc();
            case "col11 asc":    return exam1.col11.asc();
            case "col11 desc":   return exam1.col11.desc();
            case "col12 asc":    return exam1.col12.asc();
            case "col12 desc":   return exam1.col12.desc();
            case "col13 asc":    return exam1.col13.asc();
            case "col13 desc":   return exam1.col13.desc();
            case "col14 asc":    return exam1.col14.asc();
            case "col14 desc":   return exam1.col14.desc();
            case "col15 asc":    return exam1.col15.asc();
            case "col15 desc":   return exam1.col15.desc();
            default:             return null;
        }
    }
}
