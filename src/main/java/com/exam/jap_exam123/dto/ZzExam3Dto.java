package com.exam.jap_exam123.dto;

import com.exam.jap_exam123.domain.ZzExam3;
import com.exam.jap_exam123.domain.ZzExam3Id;
import com.querydsl.core.annotations.QueryProjection;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

/** Exam3 DTO 컨테이너 (Request / Item / Response) */
public class ZzExam3Dto {

    private ZzExam3Dto() {}

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

        // 검색조건 전용 - 등록/수정 시 무시되므로 필수 X
        @Size(max = 20)
        private String exam1Nm;

        @NotBlank(message = "exam2Id는 필수입니다")
        @Size(max = 20, message = "exam2Id는 최대 20자")
        private String exam2Id;

        // 검색조건 전용
        @Size(max = 20)
        private String exam2Nm;

        @NotBlank(message = "exam3Id는 필수입니다")
        @Size(max = 20, message = "exam3Id는 최대 20자")
        private String exam3Id;

        @NotBlank(message = "exam3Nm은 필수입니다")
        @Size(max = 20, message = "exam3Nm은 최대 20자")
        private String exam3Nm;

        @Size(max = 200) private String col31;
        @Size(max = 200) private String col32;
        @Size(max = 200) private String col33;
        @Size(max = 200) private String col34;
        @Size(max = 200) private String col35;

        @Builder.Default
        private int pageNo = 1;
        @Builder.Default
        private int pageSize = 10;

        // 정렬 (한 컬럼). 형식: "exam3Id asc" / "exam3Id desc"
        private String sortBy;

        public int getOffset() { return (pageNo - 1) * pageSize; }

        public ZzExam3 toEntity() {
            return ZzExam3.builder()
                    .id(new ZzExam3Id(exam1Id, exam2Id, exam3Id))
                    .exam3Nm(exam3Nm)
                    .col31(col31).col32(col32).col33(col33).col34(col34).col35(col35)
                    .build();
        }
    }

    /** 응답 DTO (단건/목록 행, 부모/조부모 이름 포함) */
    @Getter
    @Setter
    @NoArgsConstructor
    @Builder
    public static class Item {
        private String exam1Id;
        private String exam1Nm;
        private String exam2Id;
        private String exam2Nm;
        private String exam3Id;
        private String exam3Nm;
        private String col31;
        private String col32;
        private String col33;
        private String col34;
        private String col35;
        private String regId;
        private LocalDateTime regDt;
        private String updId;
        private LocalDateTime updDt;

        @QueryProjection
        public Item(String exam1Id, String exam1Nm,
                    String exam2Id, String exam2Nm,
                    String exam3Id, String exam3Nm,
                    String col31, String col32, String col33, String col34, String col35,
                    String regId, LocalDateTime regDt, String updId, LocalDateTime updDt) {
            this.exam1Id = exam1Id;
            this.exam1Nm = exam1Nm;
            this.exam2Id = exam2Id;
            this.exam2Nm = exam2Nm;
            this.exam3Id = exam3Id;
            this.exam3Nm = exam3Nm;
            this.col31 = col31; this.col32 = col32; this.col33 = col33;
            this.col34 = col34; this.col35 = col35;
            this.regId = regId; this.regDt = regDt;
            this.updId = updId; this.updDt = updDt;
        }

        public static Item from(ZzExam3 e) {
            return Item.builder()
                    .exam1Id(e.getId().getExam1Id())
                    .exam2Id(e.getId().getExam2Id())
                    .exam3Id(e.getId().getExam3Id())
                    .exam3Nm(e.getExam3Nm())
                    .col31(e.getCol31()).col32(e.getCol32()).col33(e.getCol33())
                    .col34(e.getCol34()).col35(e.getCol35())
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
