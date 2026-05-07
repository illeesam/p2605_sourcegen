package com.exam.jap_exam123.domain;

import jakarta.persistence.*;
import lombok.*;

/** zz_exam3 엔티티 (3중 복합 PK: exam1_id + exam2_id + exam3_id) */
@Entity
@Table(name = "zz_exam3")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ZzExam3 extends BaseEntity {

    @EmbeddedId
    private ZzExam3Id id;

    @Column(name = "exam3_nm", length = 20, nullable = false)
    private String exam3Nm;

    @Column(name = "col31", length = 200) private String col31;
    @Column(name = "col32", length = 200) private String col32;
    @Column(name = "col33", length = 200) private String col33;
    @Column(name = "col34", length = 200) private String col34;
    @Column(name = "col35", length = 200) private String col35;
}
