package com.exam.jap_exam123.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** 전역 CORS 설정 (모든 URL 모든 오리진/메서드/헤더 허용) */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOriginPatterns("*")     // 모든 오리진 (credentials 와 호환)
                .allowedMethods("*")            // GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD
                .allowedHeaders("*")
                .exposedHeaders("*")
                .allowCredentials(true)         // 쿠키/Authorization 헤더 허용
                .maxAge(3600);
    }
}
