package com.exam.jap_exam123.controller;

import com.exam.jap_exam123.dto.ZzExam2Dto;
import com.exam.jap_exam123.service.ZzExam2Service;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Exam2 컨트롤러 (복합 PK) */
@Tag(name = "Exam2", description = "zz_exam2 (복합 PK: exam1_id + exam2_id) - exam1 LEFT JOIN")
@RestController
@RequestMapping("/api/exam2")
@RequiredArgsConstructor
public class ZzExam2Controller {

    private final ZzExam2Service service;

    /** 단건 조회 */
    @Operation(summary = "단건 조회", description = "복합 PK 로 단건 조회 (부모 이름 포함)")
    @ApiResponse(responseCode = "200", description = "성공")
    @ApiResponse(responseCode = "404", description = "데이터 없음")
    @GetMapping("/{exam1Id}/{exam2Id}")
    public ResponseEntity<ZzExam2Dto.Item> selectById(
            @Parameter(description = "exam1 PK", example = "A001") @PathVariable String exam1Id,
            @Parameter(description = "exam2 PK", example = "A001-01") @PathVariable String exam2Id) {
        return ResponseEntity.ok(service.selectById(exam1Id, exam2Id));
    }

    /** 페이지 목록 */
    @Operation(summary = "페이지 목록", description = "검색조건 + 페이징 + 정렬, 부모(exam1Nm) 검색 가능")
    @GetMapping("/page-list")
    public ResponseEntity<ZzExam2Dto.Response> selectPageData(
            @Parameter(description = "검색조건 / page / size / sortBy(예: exam2Id desc)")
            @ModelAttribute ZzExam2Dto.Request search) {
        return ResponseEntity.ok(service.selectPageData(search));
    }

    /** 전체 목록 */
    @Operation(summary = "전체 목록", description = "검색조건 적용 (페이징 X)")
    @GetMapping("/list")
    public ResponseEntity<List<ZzExam2Dto.Item>> selectList(
            @ModelAttribute ZzExam2Dto.Request search) {
        return ResponseEntity.ok(service.selectList(search));
    }

    /** 등록 */
    @Operation(summary = "등록", description = "복합 PK 신규 등록 (부모 exam1 존재 필수)")
    @ApiResponse(responseCode = "200", description = "성공")
    @ApiResponse(responseCode = "400", description = "PK 중복")
    @ApiResponse(responseCode = "404", description = "부모 exam1 없음")
    @PostMapping
    public ResponseEntity<ZzExam2Dto.Item> insert(@Valid @RequestBody ZzExam2Dto.Request req) {
        return ResponseEntity.ok(service.insert(req));
    }

    /** 수정 */
    @Operation(summary = "수정", description = "복합 PK 단건 수정")
    @PutMapping("/{exam1Id}/{exam2Id}")
    public ResponseEntity<ZzExam2Dto.Item> update(
            @Parameter(description = "exam1 PK", example = "A001") @PathVariable String exam1Id,
            @Parameter(description = "exam2 PK", example = "A001-01") @PathVariable String exam2Id,
            @Valid @RequestBody ZzExam2Dto.Request req) {
        return ResponseEntity.ok(service.update(exam1Id, exam2Id, req));
    }

    /** 삭제 */
    @Operation(summary = "삭제", description = "복합 PK 단건 삭제")
    @ApiResponse(responseCode = "204", description = "성공 (No Content)")
    @DeleteMapping("/{exam1Id}/{exam2Id}")
    public ResponseEntity<Void> delete(
            @Parameter(description = "exam1 PK", example = "A001") @PathVariable String exam1Id,
            @Parameter(description = "exam2 PK", example = "A001-01") @PathVariable String exam2Id) {
        service.delete(exam1Id, exam2Id);
        return ResponseEntity.noContent().build();
    }
}
