package com.exam.jap_exam123.repository.impl;

import com.exam.jap_exam123.dto.ZzExam3Dto;
import com.exam.jap_exam123.domain.QZzExam1;
import com.exam.jap_exam123.domain.QZzExam2;
import com.exam.jap_exam123.domain.QZzExam3;
import com.exam.jap_exam123.repository.ZzExam3RepositoryCustom;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.core.types.Projections;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;

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
                        exam3.id.exam1Id, exam1.exam1Nm,
                        exam3.id.exam2Id, exam2.exam2Nm,
                        exam3.id.exam3Id, exam3.exam3Nm,
                        exam3.col31, exam3.col32, exam3.col33, exam3.col34, exam3.col35,
                        exam3.regId, exam3.regDt, exam3.updId, exam3.updDt
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
        var query = queryFactory
                .select(Projections.bean(ZzExam3Dto.Item.class,
                        exam3.id.exam1Id, exam1.exam1Nm,
                        exam3.id.exam2Id, exam2.exam2Nm,
                        exam3.id.exam3Id, exam3.exam3Nm,
                        exam3.col31, exam3.col32, exam3.col33, exam3.col34, exam3.col35,
                        exam3.regId, exam3.regDt, exam3.updId, exam3.updDt
                ))
                .from(exam3)
                .leftJoin(exam1).on(exam1.exam1Id.eq(exam3.id.exam1Id))
                .leftJoin(exam2).on(exam2.id.exam1Id.eq(exam3.id.exam1Id)
                        .and(exam2.id.exam2Id.eq(exam3.id.exam2Id)))
                .where(
                        StringUtils.hasText(s.getExam1Id()) ? exam3.id.exam1Id.containsIgnoreCase(s.getExam1Id()) : null,
                        StringUtils.hasText(s.getExam1Nm()) ? exam1.exam1Nm.like("%" + s.getExam1Nm() + "%") : null,
                        StringUtils.hasText(s.getExam2Id()) ? exam3.id.exam2Id.containsIgnoreCase(s.getExam2Id()) : null,
                        StringUtils.hasText(s.getExam2Nm()) ? exam2.exam2Nm.like("%" + s.getExam2Nm() + "%") : null,
                        StringUtils.hasText(s.getExam3Id()) ? exam3.id.exam3Id.containsIgnoreCase(s.getExam3Id()) : null,
                        StringUtils.hasText(s.getExam3Nm()) ? exam3.exam3Nm.like("%" + s.getExam3Nm() + "%") : null,
                        StringUtils.hasText(s.getCol31()) ? exam3.col31.containsIgnoreCase(s.getCol31()) : null,
                        StringUtils.hasText(s.getCol32()) ? exam3.col32.containsIgnoreCase(s.getCol32()) : null,
                        StringUtils.hasText(s.getCol33()) ? exam3.col33.containsIgnoreCase(s.getCol33()) : null,
                        StringUtils.hasText(s.getCol34()) ? exam3.col34.containsIgnoreCase(s.getCol34()) : null,
                        StringUtils.hasText(s.getCol35()) ? exam3.col35.containsIgnoreCase(s.getCol35()) : null
                )
                .orderBy(buildOrder(s));
        if (s.getPageSize() > 0 && s.getPageNo() > 0) {
            int offset = (s.getPageNo() - 1) * s.getPageSize();
            int limit  = s.getPageSize();
            query.offset(offset).limit(limit);
        }
        return query.fetch();
    }

    /** 페이지 목록 (pageNo/pageSize 미지정 시 1페이지/10건 기본) */
    @Override
    public ZzExam3Dto.Response selectPageList(ZzExam3Dto.Request s) {
        int pageNo   = s.getPageNo()   > 0 ? s.getPageNo()   : 1;
        int pageSize = s.getPageSize() > 0 ? s.getPageSize() : 10;
        int offset   = (pageNo - 1) * pageSize;
        int limit    = pageSize;

        List<ZzExam3Dto.Item> content = queryFactory
                .select(Projections.bean(ZzExam3Dto.Item.class,
                        exam3.id.exam1Id, exam1.exam1Nm,
                        exam3.id.exam2Id, exam2.exam2Nm,
                        exam3.id.exam3Id, exam3.exam3Nm,
                        exam3.col31, exam3.col32, exam3.col33, exam3.col34, exam3.col35,
                        exam3.regId, exam3.regDt, exam3.updId, exam3.updDt
                ))
                .from(exam3)
                .leftJoin(exam1).on(exam1.exam1Id.eq(exam3.id.exam1Id))
                .leftJoin(exam2).on(exam2.id.exam1Id.eq(exam3.id.exam1Id)
                        .and(exam2.id.exam2Id.eq(exam3.id.exam2Id)))
                .where(
                        StringUtils.hasText(s.getExam1Id()) ? exam3.id.exam1Id.containsIgnoreCase(s.getExam1Id()) : null,
                        StringUtils.hasText(s.getExam1Nm()) ? exam1.exam1Nm.like("%" + s.getExam1Nm() + "%") : null,
                        StringUtils.hasText(s.getExam2Id()) ? exam3.id.exam2Id.containsIgnoreCase(s.getExam2Id()) : null,
                        StringUtils.hasText(s.getExam2Nm()) ? exam2.exam2Nm.like("%" + s.getExam2Nm() + "%") : null,
                        StringUtils.hasText(s.getExam3Id()) ? exam3.id.exam3Id.containsIgnoreCase(s.getExam3Id()) : null,
                        StringUtils.hasText(s.getExam3Nm()) ? exam3.exam3Nm.like("%" + s.getExam3Nm() + "%") : null,
                        StringUtils.hasText(s.getCol31()) ? exam3.col31.containsIgnoreCase(s.getCol31()) : null,
                        StringUtils.hasText(s.getCol32()) ? exam3.col32.containsIgnoreCase(s.getCol32()) : null,
                        StringUtils.hasText(s.getCol33()) ? exam3.col33.containsIgnoreCase(s.getCol33()) : null,
                        StringUtils.hasText(s.getCol34()) ? exam3.col34.containsIgnoreCase(s.getCol34()) : null,
                        StringUtils.hasText(s.getCol35()) ? exam3.col35.containsIgnoreCase(s.getCol35()) : null
                )
                .orderBy(buildOrder(s))
                .offset(offset)
                .limit(limit)
                .fetch();

        Long total = queryFactory
                .select(exam3.count())
                .from(exam3)
                .leftJoin(exam1).on(exam1.exam1Id.eq(exam3.id.exam1Id))
                .leftJoin(exam2).on(exam2.id.exam1Id.eq(exam3.id.exam1Id)
                        .and(exam2.id.exam2Id.eq(exam3.id.exam2Id)))
                .where(
                        StringUtils.hasText(s.getExam1Id()) ? exam3.id.exam1Id.containsIgnoreCase(s.getExam1Id()) : null,
                        StringUtils.hasText(s.getExam1Nm()) ? exam1.exam1Nm.like("%" + s.getExam1Nm() + "%") : null,
                        StringUtils.hasText(s.getExam2Id()) ? exam3.id.exam2Id.containsIgnoreCase(s.getExam2Id()) : null,
                        StringUtils.hasText(s.getExam2Nm()) ? exam2.exam2Nm.like("%" + s.getExam2Nm() + "%") : null,
                        StringUtils.hasText(s.getExam3Id()) ? exam3.id.exam3Id.containsIgnoreCase(s.getExam3Id()) : null,
                        StringUtils.hasText(s.getExam3Nm()) ? exam3.exam3Nm.like("%" + s.getExam3Nm() + "%") : null,
                        StringUtils.hasText(s.getCol31()) ? exam3.col31.containsIgnoreCase(s.getCol31()) : null,
                        StringUtils.hasText(s.getCol32()) ? exam3.col32.containsIgnoreCase(s.getCol32()) : null,
                        StringUtils.hasText(s.getCol33()) ? exam3.col33.containsIgnoreCase(s.getCol33()) : null,
                        StringUtils.hasText(s.getCol34()) ? exam3.col34.containsIgnoreCase(s.getCol34()) : null,
                        StringUtils.hasText(s.getCol35()) ? exam3.col35.containsIgnoreCase(s.getCol35()) : null
                )
                .fetchOne();

        return ZzExam3Dto.Response.of(content, total == null ? 0L : total, pageNo, pageSize);
    }

    /** 정렬조건 빌드 */
    private OrderSpecifier<?> buildOrder(ZzExam3Dto.Request s) {
        if (!StringUtils.hasText(s.getSortBy())) return null;
        switch (s.getSortBy().trim()) {
            case "exam1Id asc":  return exam3.id.exam1Id.asc();
            case "exam1Id desc": return exam3.id.exam1Id.desc();
            case "exam1Nm asc":  return exam1.exam1Nm.asc();
            case "exam1Nm desc": return exam1.exam1Nm.desc();
            case "exam2Id asc":  return exam3.id.exam2Id.asc();
            case "exam2Id desc": return exam3.id.exam2Id.desc();
            case "exam2Nm asc":  return exam2.exam2Nm.asc();
            case "exam2Nm desc": return exam2.exam2Nm.desc();
            case "exam3Id asc":  return exam3.id.exam3Id.asc();
            case "exam3Id desc": return exam3.id.exam3Id.desc();
            case "exam3Nm asc":  return exam3.exam3Nm.asc();
            case "exam3Nm desc": return exam3.exam3Nm.desc();
            case "col31 asc":    return exam3.col31.asc();
            case "col31 desc":   return exam3.col31.desc();
            case "col32 asc":    return exam3.col32.asc();
            case "col32 desc":   return exam3.col32.desc();
            case "col33 asc":    return exam3.col33.asc();
            case "col33 desc":   return exam3.col33.desc();
            case "col34 asc":    return exam3.col34.asc();
            case "col34 desc":   return exam3.col34.desc();
            case "col35 asc":    return exam3.col35.asc();
            case "col35 desc":   return exam3.col35.desc();
            default:             return null;
        }
    }
}
