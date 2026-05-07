package com.exam.jap_exam123.controller;

import com.exam.jap_exam123.dto.ZzExam3Dto;
import com.exam.jap_exam123.service.ZzExam3Service;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Exam3 컨트롤러 (3중 복합 PK) */
@Tag(name = "Exam3", description = "zz_exam3 (3중 복합 PK: exam1_id + exam2_id + exam3_id) - exam1, exam2 LEFT JOIN")
@RestController
@RequestMapping("/api/exam3")
@RequiredArgsConstructor
public class ZzExam3Controller {

    private final ZzExam3Service service;

    /** 단건 조회 */
    @Operation(summary = "단건 조회", description = "3중 복합 PK 단건 조회 (조부모/부모 이름 포함)")
    @ApiResponse(responseCode = "200", description = "성공")
    @ApiResponse(responseCode = "404", description = "데이터 없음")
    @GetMapping("/{exam1Id}/{exam2Id}/{exam3Id}")
    public ResponseEntity<ZzExam3Dto.Item> selectById(
            @Parameter(description = "exam1 PK", example = "A001") @PathVariable String exam1Id,
            @Parameter(description = "exam2 PK", example = "A001-01") @PathVariable String exam2Id,
            @Parameter(description = "exam3 PK", example = "A001-01-01") @PathVariable String exam3Id) {
        return ResponseEntity.ok(service.selectById(exam1Id, exam2Id, exam3Id));
    }

    /** 페이지 목록 */
    @Operation(summary = "페이지 목록",
            description = "검색조건 + 페이징 + 정렬, 조부모(exam1Nm)/부모(exam2Nm) 검색 가능")
    @GetMapping("/page-list")
    public ResponseEntity<ZzExam3Dto.Response> selectPageList(
            @Parameter(description = "검색조건 / page / size / sortBy(예: exam3Nm asc)")
            @ModelAttribute ZzExam3Dto.Request search) {
        return ResponseEntity.ok(service.selectPageList(search));
    }

    /** 전체 목록 */
    @Operation(summary = "전체 목록", description = "검색조건 적용 (페이징 X)")
    @GetMapping("/list")
    public ResponseEntity<List<ZzExam3Dto.Item>> selectList(
            @ModelAttribute ZzExam3Dto.Request search) {
        return ResponseEntity.ok(service.selectList(search));
    }

    /** 등록 */
    @Operation(summary = "등록", description = "3중 복합 PK 신규 등록 (부모 exam2 존재 필수)")
    @ApiResponse(responseCode = "200", description = "성공")
    @ApiResponse(responseCode = "400", description = "PK 중복")
    @ApiResponse(responseCode = "404", description = "부모 exam2 없음")
    @PostMapping
    public ResponseEntity<ZzExam3Dto.Item> insert(@RequestBody ZzExam3Dto.Request req) {
        return ResponseEntity.ok(service.insert(req));
    }

    /** 수정 */
    @Operation(summary = "수정", description = "3중 복합 PK 단건 수정")
    @PutMapping("/{exam1Id}/{exam2Id}/{exam3Id}")
    public ResponseEntity<ZzExam3Dto.Item> update(
            @Parameter(description = "exam1 PK", example = "A001") @PathVariable String exam1Id,
            @Parameter(description = "exam2 PK", example = "A001-01") @PathVariable String exam2Id,
            @Parameter(description = "exam3 PK", example = "A001-01-01") @PathVariable String exam3Id,
            @RequestBody ZzExam3Dto.Request req) {
        return ResponseEntity.ok(service.update(exam1Id, exam2Id, exam3Id, req));
    }

    /** 삭제 */
    @Operation(summary = "삭제", description = "3중 복합 PK 단건 삭제")
    @ApiResponse(responseCode = "204", description = "성공 (No Content)")
    @DeleteMapping("/{exam1Id}/{exam2Id}/{exam3Id}")
    public ResponseEntity<Void> delete(
            @Parameter(description = "exam1 PK", example = "A001") @PathVariable String exam1Id,
            @Parameter(description = "exam2 PK", example = "A001-01") @PathVariable String exam2Id,
            @Parameter(description = "exam3 PK", example = "A001-01-01") @PathVariable String exam3Id) {
        service.delete(exam1Id, exam2Id, exam3Id);
        return ResponseEntity.noContent().build();
    }
}
