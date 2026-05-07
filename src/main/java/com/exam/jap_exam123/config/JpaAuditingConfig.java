package com.exam.jap_exam123.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

import java.util.Optional;

/** JPA Auditing 설정 (등록자/변경자 자동 채우기) */
@Configuration
@EnableJpaAuditing
public class JpaAuditingConfig {

    /** 현재 사용자 조회 (인증 미적용 → "system" 고정) */
    @Bean
    public AuditorAware<String> auditorAware() {
        return () -> Optional.of("system");
    }
}
