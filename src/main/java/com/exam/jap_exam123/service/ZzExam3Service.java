package com.exam.jap_exam123.service;

import com.exam.jap_exam123.dto.ZzExam3Dto;
import com.exam.jap_exam123.domain.ZzExam2Id;
import com.exam.jap_exam123.domain.ZzExam3;
import com.exam.jap_exam123.domain.ZzExam3Id;
import com.exam.jap_exam123.repository.ZzExam2Repository;
import com.exam.jap_exam123.repository.ZzExam3Repository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.NoSuchElementException;

/** Exam3 서비스 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ZzExam3Service {

    private final ZzExam3Repository repo;
    private final ZzExam2Repository exam2Repo;

    /** 단건 조회 */
    public ZzExam3Dto.Item selectById(String exam1Id, String exam2Id, String exam3Id) {
        return repo.selectById(exam1Id, exam2Id, exam3Id)
                .orElseThrow(() -> new NoSuchElementException(
                        "ZzExam3 not found: " + exam1Id + "/" + exam2Id + "/" + exam3Id));
    }

    /** 전체 목록 */
    public java.util.List<ZzExam3Dto.Item> selectList(ZzExam3Dto.Request search) {
        return repo.selectList(search);
    }

    /** 페이지 목록 */
    public ZzExam3Dto.Response selectPageData(ZzExam3Dto.Request search) {
        return repo.selectPageData(search);
    }

    /** 등록 */
    @Transactional
    public ZzExam3Dto.Item insert(ZzExam3Dto.Request req) {
        ZzExam3Id id = new ZzExam3Id(req.getExam1Id(), req.getExam2Id(), req.getExam3Id());
        if (repo.existsById(id)) {
            throw new IllegalArgumentException(
                    "Already exists: " + req.getExam1Id() + "/" + req.getExam2Id() + "/" + req.getExam3Id());
        }
        if (!exam2Repo.existsById(new ZzExam2Id(req.getExam1Id(), req.getExam2Id()))) {
            throw new NoSuchElementException(
                    "Parent ZzExam2 not found: " + req.getExam1Id() + "/" + req.getExam2Id());
        }
        return ZzExam3Dto.Item.from(repo.save(req.toEntity()));
    }

    /** 수정 */
    @Transactional
    public ZzExam3Dto.Item update(String exam1Id, String exam2Id, String exam3Id, ZzExam3Dto.Request req) {
        ZzExam3 e = repo.findById(new ZzExam3Id(exam1Id, exam2Id, exam3Id))
                .orElseThrow(() -> new NoSuchElementException(
                        "ZzExam3 not found: " + exam1Id + "/" + exam2Id + "/" + exam3Id));
        e.setExam3Nm(req.getExam3Nm());
        e.setCol31(req.getCol31());
        e.setCol32(req.getCol32());
        e.setCol33(req.getCol33());
        e.setCol34(req.getCol34());
        e.setCol35(req.getCol35());
        return ZzExam3Dto.Item.from(e);
    }

    /** 삭제 */
    @Transactional
    public void delete(String exam1Id, String exam2Id, String exam3Id) {
        ZzExam3 e = repo.findById(new ZzExam3Id(exam1Id, exam2Id, exam3Id))
                .orElseThrow(() -> new NoSuchElementException(
                        "ZzExam3 not found: " + exam1Id + "/" + exam2Id + "/" + exam3Id));
        repo.delete(e);
    }
}
