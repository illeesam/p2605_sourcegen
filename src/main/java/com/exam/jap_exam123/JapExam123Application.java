package com.exam.jap_exam123;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

/** Spring Boot 진입점 (CustomImpl 접미사로 QueryDSL Custom 구현체 자동 인식) */
@SpringBootApplication
@EnableJpaRepositories(
        basePackages = "com.exam.jap_exam123.repository",
        repositoryImplementationPostfix = "CustomImpl"
)
public class JapExam123Application {
    /** 애플리케이션 시작 */
    public static void main(String[] args) {
        SpringApplication.run(JapExam123Application.class, args);
    }
}
