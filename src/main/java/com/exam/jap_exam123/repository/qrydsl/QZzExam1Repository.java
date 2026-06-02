package com.exam.jap_exam123.repository.qrydsl;

import com.exam.jap_exam123.domain.ZzExam1;
import com.exam.jap_exam123.dto.ZzExam1Dto;

import java.util.List;
import java.util.Optional;

/** Exam1 QueryDSL Custom */
public interface QZzExam1Repository {
    /** 단건 조회 */
    Optional<ZzExam1Dto.Item> selectById(String exam1Id);
    /** 전체 목록 */
    List<ZzExam1Dto.Item> selectList(ZzExam1Dto.Request search);
    /** 페이지 목록 */
    ZzExam1Dto.Response selectPageData(ZzExam1Dto.Request search);
    /** 동적 부분 수정 (null 이 아닌 필드만 set, updDt 는 DB CURRENT_TIMESTAMP 강제) */
    int updateSelective(ZzExam1 entity);
}
