package com.exam.jap_exam123.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;

/** zz_exam2 복합 PK 클래스 */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class ZzExam2Id implements Serializable {

    @Column(name = "exam1_id", length = 20, nullable = false)
    private String exam1Id;

    @Column(name = "exam2_id", length = 20, nullable = false)
    private String exam2Id;
}
