package com.exam.jap_exam123.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.Arrays;

/** 애플리케이션 시작 시 환경 정보 출력 (비밀번호 제외) */
@Component
@RequiredArgsConstructor
@Slf4j
public class StartupInfoLogger {

    private final Environment env;

    @EventListener(ApplicationReadyEvent.class)
    public void logStartupInfo() {
        String host = "localhost";
        try { host = InetAddress.getLocalHost().getHostAddress(); } catch (UnknownHostException ignore) {}

        String port = nz(env.getProperty("server.port"), "8080");
        String contextPath = nz(env.getProperty("server.servlet.context-path"), "");
        String[] activeProfiles = env.getActiveProfiles();
        String[] defaultProfiles = env.getDefaultProfiles();

        // DB
        String dsUrl       = env.getProperty("spring.datasource.url");
        String dsUser      = env.getProperty("spring.datasource.username");
        String dsDriver    = env.getProperty("spring.datasource.driver-class-name");
        String dialect     = env.getProperty("spring.jpa.database-platform");
        String defSchema   = env.getProperty("spring.jpa.properties.hibernate.default_schema");
        String ddl         = env.getProperty("spring.jpa.hibernate.ddl-auto");
        String openInView  = env.getProperty("spring.jpa.open-in-view");
        String showSql     = env.getProperty("spring.jpa.show-sql");
        String formatSql   = env.getProperty("spring.jpa.properties.hibernate.format_sql");

        // Swagger
        String docsPath    = env.getProperty("springdoc.api-docs.path");
        String uiPath      = env.getProperty("springdoc.swagger-ui.path");

        // 환경변수 (DB_HOST 등은 env.getProperty 로 안 잡힐 수 있어 System.getenv/getProperty 사용)
        String dbHost     = sysProp("DB_HOST");
        String dbPort     = sysProp("DB_PORT");
        String dbName     = sysProp("DB_NAME");
        String dbSchema   = sysProp("DB_SCHEMA");
        String dbUserEnv  = sysProp("DB_USERNAME");

        StringBuilder sb = new StringBuilder();
        // Runtime
        Runtime rt = Runtime.getRuntime();
        long maxMb = rt.maxMemory() / 1024 / 1024;
        long totalMb = rt.totalMemory() / 1024 / 1024;
        long freeMb = rt.freeMemory() / 1024 / 1024;
        long usedMb = totalMb - freeMb;

        sb.append("\n");
        sb.append("============================================================\n");
        sb.append("  Application Started\n");
        sb.append("============================================================\n");
        sb.append(String.format("  Local        : http://localhost:%s%s%n", port, contextPath));
        sb.append(String.format("  External     : http://%s:%s%s%n", host, port, contextPath));
        sb.append(String.format("  Profiles     : active=%s, default=%s%n",
                Arrays.toString(activeProfiles), Arrays.toString(defaultProfiles)));
        sb.append("------------------------------------------------------------\n");
        sb.append("  System\n");
        sb.append(String.format("    OS         : %s %s (%s)%n",
                System.getProperty("os.name"),
                System.getProperty("os.version"),
                System.getProperty("os.arch")));
        sb.append(String.format("    User       : %s%n", System.getProperty("user.name")));
        sb.append(String.format("    Timezone   : %s%n", System.getProperty("user.timezone")));
        sb.append(String.format("    Encoding   : %s%n", System.getProperty("file.encoding")));
        sb.append("  Java\n");
        sb.append(String.format("    Version    : %s (%s)%n",
                System.getProperty("java.version"),
                System.getProperty("java.vendor")));
        sb.append(String.format("    Home       : %s%n", System.getProperty("java.home")));
        sb.append(String.format("    VM         : %s %s%n",
                System.getProperty("java.vm.name"),
                System.getProperty("java.vm.version")));
        sb.append("  Memory (MB)\n");
        sb.append(String.format("    Used       : %d / Total: %d / Free: %d / Max: %d%n",
                usedMb, totalMb, freeMb, maxMb));
        sb.append("    Available  : ").append(rt.availableProcessors()).append(" CPU cores\n");
        sb.append("------------------------------------------------------------\n");
        sb.append("  DataSource\n");
        sb.append(String.format("    URL        : %s%n", dsUrl));
        sb.append(String.format("    Username   : %s%n", dsUser));
        sb.append(String.format("    Password   : %s%n", mask(env.getProperty("spring.datasource.password"))));
        sb.append(String.format("    Driver     : %s%n", dsDriver));
        sb.append("  JPA / Hibernate\n");
        sb.append(String.format("    Dialect    : %s%n", dialect));
        sb.append(String.format("    Schema     : %s%n", defSchema));
        sb.append(String.format("    ddl-auto   : %s%n", ddl));
        sb.append(String.format("    open-in-view : %s%n", openInView));
        sb.append(String.format("    show-sql   : %s%n", showSql));
        sb.append(String.format("    format_sql : %s%n", formatSql));
        sb.append("  Env Vars (System Properties)\n");
        sb.append(String.format("    DB_HOST    : %s%n", dbHost));
        sb.append(String.format("    DB_PORT    : %s%n", dbPort));
        sb.append(String.format("    DB_NAME    : %s%n", dbName));
        sb.append(String.format("    DB_SCHEMA  : %s%n", dbSchema));
        sb.append(String.format("    DB_USERNAME: %s%n", dbUserEnv));
        sb.append(String.format("    DB_PASSWORD: %s%n", mask(sysProp("DB_PASSWORD"))));
        sb.append("------------------------------------------------------------\n");
        sb.append("  Swagger UI   : http://localhost:").append(port).append(contextPath).append(uiPath).append("\n");
        sb.append("  OpenAPI Docs : http://localhost:").append(port).append(contextPath).append(docsPath).append("\n");
        sb.append("  Static Pages\n");
        sb.append("    /index.html  /exam1.html  /exam2.html  /exam3.html\n");
        sb.append("============================================================\n");

        log.info(sb.toString());
    }

    private String sysProp(String key) {
        String v = System.getProperty(key);
        if (v == null) v = System.getenv(key);
        return v;
    }

    private String mask(String v) {
        if (v == null || v.isEmpty()) return "(empty)";
        if (v.length() <= 2) return "***";
        return v.charAt(0) + "***" + v.charAt(v.length() - 1) + " (len=" + v.length() + ")";
    }

    private String nz(String v, String def) { return v == null ? def : v; }
}
