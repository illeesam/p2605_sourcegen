package com.exam.jap_exam123.service;

import com.exam.jap_exam123.dto.ZzExam1Dto;
import com.exam.jap_exam123.domain.ZzExam1;
import com.exam.jap_exam123.repository.ZzExam1Repository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.NoSuchElementException;

/** Exam1 서비스 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ZzExam1Service {

    private final ZzExam1Repository repo;

    /** 단건 조회 */
    public ZzExam1Dto.Item selectById(String exam1Id) {
        return repo.selectById(exam1Id)
                .orElseThrow(() -> new NoSuchElementException("ZzExam1 not found: " + exam1Id));
    }

    /** 전체 목록 */
    public java.util.List<ZzExam1Dto.Item> selectList(ZzExam1Dto.Request search) {
        return repo.selectList(search);
    }

    /** 페이지 목록 */
    public ZzExam1Dto.Response selectPageList(ZzExam1Dto.Request search) {
        return repo.selectPageList(search);
    }

    /** 등록 */
    @Transactional
    public ZzExam1Dto.Item insert(ZzExam1Dto.Request req) {
        if (repo.existsById(req.getExam1Id())) {
            throw new IllegalArgumentException("Already exists: " + req.getExam1Id());
        }
        return ZzExam1Dto.Item.from(repo.save(req.toEntity()));
    }

    /** 수정 */
    @Transactional
    public ZzExam1Dto.Item update(String exam1Id, ZzExam1Dto.Request req) {
        ZzExam1 e = repo.findById(exam1Id)
                .orElseThrow(() -> new NoSuchElementException("ZzExam1 not found: " + exam1Id));
        e.setExam1Nm(req.getExam1Nm());
        e.setCol11(req.getCol11());
        e.setCol12(req.getCol12());
        e.setCol13(req.getCol13());
        e.setCol14(req.getCol14());
        e.setCol15(req.getCol15());
        return ZzExam1Dto.Item.from(e);
    }

    /** 삭제 */
    @Transactional
    public void delete(String exam1Id) {
        ZzExam1 e = repo.findById(exam1Id)
                .orElseThrow(() -> new NoSuchElementException("ZzExam1 not found: " + exam1Id));
        repo.delete(e);
    }
}
