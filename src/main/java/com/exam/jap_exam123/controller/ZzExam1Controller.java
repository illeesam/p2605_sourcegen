package com.exam.jap_exam123.controller;

import com.exam.jap_exam123.dto.ZzExam1Dto;
import com.exam.jap_exam123.service.ZzExam1Service;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Exam1 컨트롤러 (단일 PK) */
@Tag(name = "Exam1", description = "zz_exam1 (단일 PK: exam1_id)")
@RestController
@RequestMapping("/api/exam1")
@RequiredArgsConstructor
public class ZzExam1Controller {

    private final ZzExam1Service service;

    /** 단건 조회 */
    @Operation(summary = "단건 조회", description = "exam1_id 로 단건 조회")
    @ApiResponse(responseCode = "200", description = "성공")
    @ApiResponse(responseCode = "404", description = "데이터 없음")
    @GetMapping("/{exam1Id}")
    public ResponseEntity<ZzExam1Dto.Item> selectById(
            @Parameter(description = "exam1 PK", example = "A001") @PathVariable String exam1Id) {
        return ResponseEntity.ok(service.selectById(exam1Id));
    }

    /** 페이지 목록 */
    @Operation(summary = "페이지 목록", description = "검색조건 + 페이징 + 정렬")
    @GetMapping("/page-list")
    public ResponseEntity<ZzExam1Dto.Response> selectPageList(
            @Parameter(description = "검색조건 / page / size / sortBy(예: exam1Id desc)")
            @ModelAttribute ZzExam1Dto.Request search) {
        return ResponseEntity.ok(service.selectPageList(search));
    }

    /** 전체 목록 */
    @Operation(summary = "전체 목록", description = "검색조건 적용 (페이징 X)")
    @GetMapping("/list")
    public ResponseEntity<List<ZzExam1Dto.Item>> selectList(
            @ModelAttribute ZzExam1Dto.Request search) {
        return ResponseEntity.ok(service.selectList(search));
    }

    /** 등록 */
    @Operation(summary = "등록", description = "신규 row 등록 (PK 중복 시 400)")
    @ApiResponse(responseCode = "200", description = "성공")
    @ApiResponse(responseCode = "400", description = "PK 중복")
    @PostMapping
    public ResponseEntity<ZzExam1Dto.Item> insert(@Valid @RequestBody ZzExam1Dto.Request req) {
        return ResponseEntity.ok(service.insert(req));
    }

    /** 수정 */
    @Operation(summary = "수정", description = "exam1_id 로 단건 수정")
    @ApiResponse(responseCode = "200", description = "성공")
    @ApiResponse(responseCode = "404", description = "데이터 없음")
    @PutMapping("/{exam1Id}")
    public ResponseEntity<ZzExam1Dto.Item> update(
            @Parameter(description = "exam1 PK", example = "A001") @PathVariable String exam1Id,
            @Valid @RequestBody ZzExam1Dto.Request req) {
        return ResponseEntity.ok(service.update(exam1Id, req));
    }

    /** 삭제 */
    @Operation(summary = "삭제", description = "exam1_id 로 단건 삭제")
    @ApiResponse(responseCode = "204", description = "성공 (No Content)")
    @ApiResponse(responseCode = "404", description = "데이터 없음")
    @DeleteMapping("/{exam1Id}")
    public ResponseEntity<Void> delete(
            @Parameter(description = "exam1 PK", example = "A001") @PathVariable String exam1Id) {
        service.delete(exam1Id);
        return ResponseEntity.noContent().build();
    }
}
