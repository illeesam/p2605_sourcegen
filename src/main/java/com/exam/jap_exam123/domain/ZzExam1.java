package com.exam.jap_exam123.domain;

import jakarta.persistence.*;
import lombok.*;

/** zz_exam1 엔티티 (단일 PK: exam1_id) */
@Entity
@Table(name = "zz_exam1")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ZzExam1 extends BaseEntity {

    @Id
    @Column(name = "exam1_id", length = 20, nullable = false)
    private String exam1Id;

    @Column(name = "exam1_nm", length = 20, nullable = false)
    private String exam1Nm;

    @Column(name = "col11", length = 200) private String col11;
    @Column(name = "col12", length = 200) private String col12;
    @Column(name = "col13", length = 200) private String col13;
    @Column(name = "col14", length = 200) private String col14;
    @Column(name = "col15", length = 200) private String col15;
}
