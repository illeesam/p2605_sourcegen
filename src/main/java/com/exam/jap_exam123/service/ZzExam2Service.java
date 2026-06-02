package com.exam.jap_exam123.service;

import com.exam.jap_exam123.dto.ZzExam2Dto;
import com.exam.jap_exam123.domain.ZzExam2;
import com.exam.jap_exam123.domain.ZzExam2Id;
import com.exam.jap_exam123.repository.ZzExam1Repository;
import com.exam.jap_exam123.repository.ZzExam2Repository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.NoSuchElementException;

/** Exam2 서비스 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ZzExam2Service {

    private final ZzExam2Repository repo;
    private final ZzExam1Repository exam1Repo;

    /** 단건 조회 */
    public ZzExam2Dto.Item selectById(String exam1Id, String exam2Id) {
        return repo.selectById(exam1Id, exam2Id)
                .orElseThrow(() -> new NoSuchElementException("ZzExam2 not found: " + exam1Id + "/" + exam2Id));
    }

    /** 전체 목록 */
    public java.util.List<ZzExam2Dto.Item> selectList(ZzExam2Dto.Request search) {
        return repo.selectList(search);
    }

    /** 페이지 목록 */
    public ZzExam2Dto.Response selectPageData(ZzExam2Dto.Request search) {
        return repo.selectPageData(search);
    }

    /** 등록 */
    @Transactional
    public ZzExam2Dto.Item insert(ZzExam2Dto.Request req) {
        ZzExam2Id id = new ZzExam2Id(req.getExam1Id(), req.getExam2Id());
        if (repo.existsById(id)) {
            throw new IllegalArgumentException("Already exists: " + req.getExam1Id() + "/" + req.getExam2Id());
        }
        if (!exam1Repo.existsById(req.getExam1Id())) {
            throw new NoSuchElementException("Parent ZzExam1 not found: " + req.getExam1Id());
        }
        return ZzExam2Dto.Item.from(repo.save(req.toEntity()));
    }

    /** 수정 */
    @Transactional
    public ZzExam2Dto.Item update(String exam1Id, String exam2Id, ZzExam2Dto.Request req) {
        ZzExam2 e = repo.findById(new ZzExam2Id(exam1Id, exam2Id))
                .orElseThrow(() -> new NoSuchElementException("ZzExam2 not found: " + exam1Id + "/" + exam2Id));
        e.setExam2Nm(req.getExam2Nm());
        e.setCol21(req.getCol21());
        e.setCol22(req.getCol22());
        e.setCol23(req.getCol23());
        e.setCol24(req.getCol24());
        e.setCol25(req.getCol25());
        return ZzExam2Dto.Item.from(e);
    }

    /** 삭제 */
    @Transactional
    public void delete(String exam1Id, String exam2Id) {
        ZzExam2 e = repo.findById(new ZzExam2Id(exam1Id, exam2Id))
                .orElseThrow(() -> new NoSuchElementException("ZzExam2 not found: " + exam1Id + "/" + exam2Id));
        repo.delete(e);
    }
}
