package com.exam.jap_exam123.domain;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/** 감사 필드 공통 부모 (등록자/등록일/변경자/변경일) */
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
public abstract class BaseEntity {

    @CreatedBy
    @Column(name = "reg_id", length = 20, updatable = false)
    private String regId;

    @CreatedDate
    @Column(name = "reg_dt", updatable = false)
    private LocalDateTime regDt;

    @LastModifiedBy
    @Column(name = "upd_id", length = 20)
    private String updId;

    @LastModifiedDate
    @Column(name = "upd_dt")
    private LocalDateTime updDt;
}
