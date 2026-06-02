package com.exam.jap_exam123.repository;

import com.exam.jap_exam123.dto.ZzExam2Dto;

import java.util.List;
import java.util.Optional;

/** Exam2 QueryDSL Custom */
public interface ZzExam2RepositoryCustom {
    /** 단건 조회 */
    Optional<ZzExam2Dto.Item> selectById(String exam1Id, String exam2Id);
    /** 전체 목록 */
    List<ZzExam2Dto.Item> selectList(ZzExam2Dto.Request search);
    /** 페이지 목록 */
    ZzExam2Dto.Response selectPageData(ZzExam2Dto.Request search);
}
