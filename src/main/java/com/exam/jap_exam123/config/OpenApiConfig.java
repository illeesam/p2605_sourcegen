package com.exam.jap_exam123.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** OpenAPI 메타 정보 (Swagger UI 상단 표시) */
@Configuration
public class OpenApiConfig {

    /** API 기본 정보 */
    @Bean
    public OpenAPI apiInfo() {
        return new OpenAPI().info(new Info()
                .title("jap_exam123 API")
                .version("v1")
                .description("Spring Boot + JPA + QueryDSL + Oracle 기반 CRUD API"));
    }
}
