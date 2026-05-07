package com.exam.jap_exam123.repository;

import com.exam.jap_exam123.dto.ZzExam3Dto;

import java.util.List;
import java.util.Optional;

/** Exam3 QueryDSL Custom */
public interface ZzExam3RepositoryCustom {
    /** 단건 조회 */
    Optional<ZzExam3Dto.Item> selectById(String exam1Id, String exam2Id, String exam3Id);
    /** 전체 목록 */
    List<ZzExam3Dto.Item> selectList(ZzExam3Dto.Request search);
    /** 페이지 목록 */
    ZzExam3Dto.Response selectPageList(ZzExam3Dto.Request search);
}
