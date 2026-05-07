package com.exam.jap_exam123.domain;

import jakarta.persistence.*;
import lombok.*;

/** zz_exam2 엔티티 (복합 PK: exam1_id + exam2_id) */
@Entity
@Table(name = "zz_exam2")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ZzExam2 extends BaseEntity {

    @EmbeddedId
    private ZzExam2Id id;

    @Column(name = "exam2_nm", length = 20, nullable = false)
    private String exam2Nm;

    @Column(name = "col21", length = 200) private String col21;
    @Column(name = "col22", length = 200) private String col22;
    @Column(name = "col23", length = 200) private String col23;
    @Column(name = "col24", length = 200) private String col24;
    @Column(name = "col25", length = 200) private String col25;
}
