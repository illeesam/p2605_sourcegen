package com.exam.jap_exam123.repository;

import com.exam.jap_exam123.domain.ZzExam1;
import com.exam.jap_exam123.repository.qrydsl.QZzExam1Repository;
import org.springframework.data.jpa.repository.JpaRepository;

/** Exam1 리포지토리 */
public interface ZzExam1Repository extends JpaRepository<ZzExam1, String>, QZzExam1Repository {
}
