package com.exam.jap_exam123.dto;

import com.exam.jap_exam123.domain.ZzExam2;
import com.exam.jap_exam123.domain.ZzExam2Id;
import com.querydsl.core.annotations.QueryProjection;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

/** Exam2 DTO 컨테이너 (Request / Item / Response) */
public class ZzExam2Dto {

    private ZzExam2Dto() {}

    /** 요청 DTO */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Request {
        @NotBlank(message = "exam1Id는 필수입니다")
        @Size(max = 20, message = "exam1Id는 최대 20자")
        private String exam1Id;

        // 검색조건 전용 (부모 이름 LIKE) - 등록/수정 시 무시되므로 검증 X
        @Size(max = 20)
        private String exam1Nm;

        @NotBlank(message = "exam2Id는 필수입니다")
        @Size(max = 20, message = "exam2Id는 최대 20자")
        private String exam2Id;

        @NotBlank(message = "exam2Nm은 필수입니다")
        @Size(max = 20, message = "exam2Nm은 최대 20자")
        private String exam2Nm;

        @Size(max = 200) private String col21;
        @Size(max = 200) private String col22;
        @Size(max = 200) private String col23;
        @Size(max = 200) private String col24;
        @Size(max = 200) private String col25;

        @Builder.Default
        private int pageNo = 1;
        @Builder.Default
        private int pageSize = 10;

        // 정렬 (한 컬럼). 형식: "exam2Id asc" / "exam2Id desc"
        private String sortBy;

        // 기간검색: dateType(reg_date|upd_date) + dateStart + dateEnd (yyyy-MM-dd, 끝일 포함)
        private String dateType;
        private String dateStart;
        private String dateEnd;

        // 통합 검색: searchValue LIKE OR, searchType csv 로 대상 필드 한정 (없으면 전체 String 필드)
        private String searchValue;
        private String searchType;

        public int getOffset() { return (pageNo - 1) * pageSize; }

        public ZzExam2 toEntity() {
            return ZzExam2.builder()
                    .id(new ZzExam2Id(exam1Id, exam2Id))
                    .exam2Nm(exam2Nm)
                    .col21(col21).col22(col22).col23(col23).col24(col24).col25(col25)
                    .build();
        }
    }

    /** 응답 DTO (단건/목록 행, 부모 이름 포함) */
    @Getter
    @Setter
    @NoArgsConstructor
    @Builder
    public static class Item {
        private String exam1Id;
        private String exam1Nm;
        private String exam2Id;
        private String exam2Nm;
        private String col21;
        private String col22;
        private String col23;
        private String col24;
        private String col25;
        private String regId;
        private LocalDateTime regDt;
        private String updId;
        private LocalDateTime updDt;

        @QueryProjection
        public Item(String exam1Id, String exam1Nm,
                    String exam2Id, String exam2Nm,
                    String col21, String col22, String col23, String col24, String col25,
                    String regId, LocalDateTime regDt, String updId, LocalDateTime updDt) {
            this.exam1Id = exam1Id;
            this.exam1Nm = exam1Nm;
            this.exam2Id = exam2Id;
            this.exam2Nm = exam2Nm;
            this.col21 = col21; this.col22 = col22; this.col23 = col23;
            this.col24 = col24; this.col25 = col25;
            this.regId = regId; this.regDt = regDt;
            this.updId = updId; this.updDt = updDt;
        }

        public static Item from(ZzExam2 e) {
            return Item.builder()
                    .exam1Id(e.getId().getExam1Id())
                    .exam2Id(e.getId().getExam2Id())
                    .exam2Nm(e.getExam2Nm())
                    .col21(e.getCol21()).col22(e.getCol22()).col23(e.getCol23())
                    .col24(e.getCol24()).col25(e.getCol25())
                    .regId(e.getRegId()).regDt(e.getRegDt())
                    .updId(e.getUpdId()).updDt(e.getUpdDt())
                    .build();
        }
    }

    /** 페이지 응답 DTO */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Response {
        private List<Item> pageList;
        private long pageTotalCount;
        private int pageNo;
        private int pageSize;
        private int pageTotalPages;

        public static Response of(List<Item> pageList, long pageTotalCount, int pageNo, int pageSize) {
            int pageTotalPages = pageSize <= 0 ? 0 : (int) Math.ceil((double) pageTotalCount / pageSize);
            return Response.builder()
                    .pageList(pageList).pageTotalCount(pageTotalCount)
                    .pageNo(pageNo).pageSize(pageSize).pageTotalPages(pageTotalPages)
                    .build();
        }
    }
}
