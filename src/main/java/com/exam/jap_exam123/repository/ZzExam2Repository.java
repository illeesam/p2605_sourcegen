package com.exam.jap_exam123.repository;

import com.exam.jap_exam123.domain.ZzExam2;
import com.exam.jap_exam123.domain.ZzExam2Id;
import org.springframework.data.jpa.repository.JpaRepository;

/** Exam2 리포지토리 */
public interface ZzExam2Repository extends JpaRepository<ZzExam2, ZzExam2Id>, ZzExam2RepositoryCustom {
}
