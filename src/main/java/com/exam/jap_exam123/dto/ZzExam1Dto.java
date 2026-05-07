package com.exam.jap_exam123.dto;

import com.exam.jap_exam123.domain.ZzExam1;
import com.querydsl.core.annotations.QueryProjection;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

/** Exam1 DTO 컨테이너 (Request / Item / Response) */
public class ZzExam1Dto {

    private ZzExam1Dto() {}

    /** 요청 DTO (등록/수정/검색/페이징/정렬 통합) */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Request {
        @NotBlank(message = "exam1Id는 필수입니다")
        @Size(max = 20, message = "exam1Id는 최대 20자")
        private String exam1Id;

        @NotBlank(message = "exam1Nm은 필수입니다")
        @Size(max = 20, message = "exam1Nm은 최대 20자")
        private String exam1Nm;

        @Size(max = 200) private String col11;
        @Size(max = 200) private String col12;
        @Size(max = 200) private String col13;
        @Size(max = 200) private String col14;
        @Size(max = 200) private String col15;

        @Builder.Default
        private int pageNo = 1;
        @Builder.Default
        private int pageSize = 10;

        // 정렬 (한 컬럼). 형식: "exam1Id asc" / "exam1Id desc"
        private String sortBy;

        public int getOffset() { return (pageNo - 1) * pageSize; }

        public ZzExam1 toEntity() {
            return ZzExam1.builder()
                    .exam1Id(exam1Id).exam1Nm(exam1Nm)
                    .col11(col11).col12(col12).col13(col13).col14(col14).col15(col15)
                    .build();
        }
    }

    /** 응답 DTO (단건/목록 행) */
    @Getter
    @Setter
    @NoArgsConstructor
    @Builder
    public static class Item {
        private String exam1Id;
        private String exam1Nm;
        private String col11;
        private String col12;
        private String col13;
        private String col14;
        private String col15;
        private String regId;
        private LocalDateTime regDt;
        private String updId;
        private LocalDateTime updDt;

        @QueryProjection
        public Item(String exam1Id, String exam1Nm,
                    String col11, String col12, String col13, String col14, String col15,
                    String regId, LocalDateTime regDt, String updId, LocalDateTime updDt) {
            this.exam1Id = exam1Id;
            this.exam1Nm = exam1Nm;
            this.col11 = col11; this.col12 = col12; this.col13 = col13;
            this.col14 = col14; this.col15 = col15;
            this.regId = regId; this.regDt = regDt;
            this.updId = updId; this.updDt = updDt;
        }

        public static Item from(ZzExam1 e) {
            return Item.builder()
                    .exam1Id(e.getExam1Id())
                    .exam1Nm(e.getExam1Nm())
                    .col11(e.getCol11()).col12(e.getCol12()).col13(e.getCol13())
                    .col14(e.getCol14()).col15(e.getCol15())
                    .regId(e.getRegId()).regDt(e.getRegDt())
                    .updId(e.getUpdId()).updDt(e.getUpdDt())
                    .build();
        }
    }

    /** 페이지 응답 DTO (pageList + 페이징 메타) */
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

        /** Response 생성 (pageTotalPages 자동 계산) */
        public static Response of(List<Item> pageList, long pageTotalCount, int pageNo, int pageSize) {
            int pageTotalPages = pageSize <= 0 ? 0 : (int) Math.ceil((double) pageTotalCount / pageSize);
            return Response.builder()
                    .pageList(pageList).pageTotalCount(pageTotalCount)
                    .pageNo(pageNo).pageSize(pageSize).pageTotalPages(pageTotalPages)
                    .build();
        }
    }
}
