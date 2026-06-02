package com.exam.jap_exam123.service;

import com.exam.jap_exam123.dto.ZzExam1Dto;
import com.exam.jap_exam123.domain.ZzExam1;
import com.exam.jap_exam123.repository.ZzExam1Repository;
import com.exam.jap_exam123.util.VoUtil;
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
    public ZzExam1Dto.Response selectPageData(ZzExam1Dto.Request search) {
        return repo.selectPageData(search);
    }

    /** 등록 */
    @Transactional
    public ZzExam1Dto.Item insert(ZzExam1Dto.Request req) {
        if (repo.existsById(req.getExam1Id())) {
            throw new IllegalArgumentException("Already exists: " + req.getExam1Id());
        }
        return ZzExam1Dto.Item.from(repo.save(req.toEntity()));
    }

    /** 수정 (전체 교체 - 모든 필드를 req 값으로 덮어씀) */
    @Transactional
    public ZzExam1Dto.Item update(String exam1Id, ZzExam1Dto.Request req) {
        ZzExam1 e = repo.findById(exam1Id)
                .orElseThrow(() -> new NoSuchElementException("ZzExam1 not found: " + exam1Id));
        VoUtil.voCopy(req, e);      // 동일 이름 필드 전체 복사
        e.setExam1Id(exam1Id);      // PK 는 path 값으로 고정
        return ZzExam1Dto.Item.from(e);
    }

    /** 동적 부분 수정 (null 이 아닌 필드만 반영, updDt 는 DB CURRENT_TIMESTAMP) */
    @Transactional
    public ZzExam1Dto.Item updateSelective(String exam1Id, ZzExam1Dto.Request req) {
        ZzExam1 patch = new ZzExam1();
        VoUtil.voCopy(req, patch);  // 동일 이름 필드 복사 (null 도 그대로 → repo 에서 null 은 set 제외)
        patch.setExam1Id(exam1Id);  // PK 는 path 값으로 고정
        int affected = repo.updateSelective(patch);
        if (affected == 0) {
            throw new NoSuchElementException("ZzExam1 not found or nothing to update: " + exam1Id);
        }
        return selectById(exam1Id);
    }

    /** 삭제 */
    @Transactional
    public void delete(String exam1Id) {
        ZzExam1 e = repo.findById(exam1Id)
                .orElseThrow(() -> new NoSuchElementException("ZzExam1 not found: " + exam1Id));
        repo.delete(e);
    }
}
