package com.exam.jap_exam123.repository;

import com.exam.jap_exam123.dto.ZzExam1Dto;

import java.util.List;
import java.util.Optional;

/** Exam1 QueryDSL Custom */
public interface ZzExam1RepositoryCustom {
    /** 단건 조회 */
    Optional<ZzExam1Dto.Item> selectById(String exam1Id);
    /** 전체 목록 */
    List<ZzExam1Dto.Item> selectList(ZzExam1Dto.Request search);
    /** 페이지 목록 */
    ZzExam1Dto.Response selectPageList(ZzExam1Dto.Request search);
}
