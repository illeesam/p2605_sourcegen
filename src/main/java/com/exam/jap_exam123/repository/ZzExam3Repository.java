package com.exam.jap_exam123.repository;

import com.exam.jap_exam123.domain.ZzExam3;
import com.exam.jap_exam123.domain.ZzExam3Id;
import org.springframework.data.jpa.repository.JpaRepository;

/** Exam3 리포지토리 */
public interface ZzExam3Repository extends JpaRepository<ZzExam3, ZzExam3Id>, ZzExam3RepositoryCustom {
}
