package com.exam.jap_exam123.aop;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.core.annotation.AnnotationUtils;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.lang.annotation.Annotation;
import java.lang.reflect.Method;
import java.util.Arrays;

/** Controller / Service 호출 로깅 (요청/응답 + 소요시간) */
@Aspect
@Component
@Slf4j
@RequiredArgsConstructor
public class LoggingAspect {

    private final ObjectMapper objectMapper;

    /** Controller (REST) */
    @Pointcut("within(com.exam.jap_exam123.controller..*)")
    public void controllerLayer() {}

    /** Service */
    @Pointcut("within(com.exam.jap_exam123.service..*)")
    public void serviceLayer() {}

    /** Repository (인터페이스/구현체 모두 - 패키지 + impl 하위 포함) */
    @Pointcut("execution(* com.exam.jap_exam123.repository..*(..))")
    public void repositoryLayer() {}

    /** ====== Controller 로깅 ====== */
    @Around("controllerLayer()")
    public Object logController(ProceedingJoinPoint pjp) throws Throwable {
        MethodSignature sig = (MethodSignature) pjp.getSignature();
        String cls = pjp.getTarget().getClass().getSimpleName();
        String method = sig.getName();

        // HTTP 정보
        String httpMethod = "-";
        String url = "-";
        ServletRequestAttributes attrs =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs != null) {
            HttpServletRequest req = attrs.getRequest();
            httpMethod = req.getMethod();
            url = req.getRequestURI();
            String qs = req.getQueryString();
            if (qs != null && !qs.isEmpty()) url = url + "?" + qs;
        }

        // 매핑 어노테이션에서 path 추출 (HTTP 컨텍스트 없을 때 보완)
        String mapping = extractMapping(sig.getMethod());

        Object[] args = pjp.getArgs();
        log.info("▶ {}.{} - {} {} {} - params={}",
                cls, method, httpMethod, url, mapping, fmt(args));

        long start = System.currentTimeMillis();
        try {
            Object result = pjp.proceed();
            long elapsed = System.currentTimeMillis() - start;
            log.info("◀ {}.{} ({}ms) - response={}",
                    cls, method, elapsed, fmt(result));
            return result;
        } catch (Throwable t) {
            long elapsed = System.currentTimeMillis() - start;
            log.warn("◀ {}.{} ({}ms) - ERROR {}: {}",
                    cls, method, elapsed, t.getClass().getSimpleName(), t.getMessage());
            throw t;
        }
    }

    /** ====== Repository 로깅 ====== */
    @Around("repositoryLayer()")
    public Object logRepository(ProceedingJoinPoint pjp) throws Throwable {
        MethodSignature sig = (MethodSignature) pjp.getSignature();
        String cls = pjp.getTarget().getClass().getSimpleName();
        String method = sig.getName();
        Object[] args = pjp.getArgs();

        log.info("▶▶▶ {}.{} - args={}", cls, method, fmt(args));

        long start = System.currentTimeMillis();
        try {
            Object result = pjp.proceed();
            long elapsed = System.currentTimeMillis() - start;
            log.info("◀◀◀ {}.{} ({}ms) - return={}",
                    cls, method, elapsed, fmt(result));
            return result;
        } catch (Throwable t) {
            long elapsed = System.currentTimeMillis() - start;
            log.warn("◀◀◀ {}.{} ({}ms) - ERROR {}: {}",
                    cls, method, elapsed, t.getClass().getSimpleName(), t.getMessage());
            throw t;
        }
    }

    /** ====== Service 로깅 ====== */
    @Around("serviceLayer()")
    public Object logService(ProceedingJoinPoint pjp) throws Throwable {
        MethodSignature sig = (MethodSignature) pjp.getSignature();
        String cls = pjp.getTarget().getClass().getSimpleName();
        String method = sig.getName();
        Object[] args = pjp.getArgs();

        log.info("▶▶ {}.{} - args={}", cls, method, fmt(args));

        long start = System.currentTimeMillis();
        try {
            Object result = pjp.proceed();
            long elapsed = System.currentTimeMillis() - start;
            log.info("◀◀ {}.{} ({}ms) - return={}",
                    cls, method, elapsed, fmt(result));
            return result;
        } catch (Throwable t) {
            long elapsed = System.currentTimeMillis() - start;
            log.warn("◀◀ {}.{} ({}ms) - ERROR {}: {}",
                    cls, method, elapsed, t.getClass().getSimpleName(), t.getMessage());
            throw t;
        }
    }

    /** Spring MVC 매핑 어노테이션 -> "GET /api/exam1/{id}" 같은 문자열 추출 */
    private String extractMapping(Method method) {
        // 클래스 레벨 RequestMapping
        String basePath = "";
        RequestMapping classRm = AnnotationUtils.findAnnotation(method.getDeclaringClass(), RequestMapping.class);
        if (classRm != null && classRm.value().length > 0) basePath = classRm.value()[0];

        // 메서드 레벨
        for (Annotation ann : method.getAnnotations()) {
            if (ann instanceof GetMapping g)    return "GET "    + basePath + firstOrEmpty(g.value());
            if (ann instanceof PostMapping p)   return "POST "   + basePath + firstOrEmpty(p.value());
            if (ann instanceof PutMapping p)    return "PUT "    + basePath + firstOrEmpty(p.value());
            if (ann instanceof DeleteMapping d) return "DELETE " + basePath + firstOrEmpty(d.value());
            if (ann instanceof PatchMapping p)  return "PATCH "  + basePath + firstOrEmpty(p.value());
            if (ann instanceof RequestMapping r) {
                String m = r.method().length > 0 ? r.method()[0].name() : "?";
                return m + " " + basePath + firstOrEmpty(r.value());
            }
        }
        return "";
    }

    private String firstOrEmpty(String[] arr) { return arr.length > 0 ? arr[0] : ""; }

    /** 인자/응답 포맷 (JSON 직렬화, 길면 자르기) */
    private String fmt(Object o) {
        if (o == null) return "null";
        try {
            String s;
            if (o instanceof Object[] arr) {
                // Controller 메서드 args 배열은 element 별로 직렬화
                s = Arrays.toString(Arrays.stream(arr).map(this::safeJson).toArray());
            } else {
                s = safeJson(o);
            }
            return s.length() > 1000 ? s.substring(0, 1000) + "...(truncated)" : s;
        } catch (Exception e) {
            return String.valueOf(o);
        }
    }

    private String safeJson(Object o) {
        if (o == null) return "null";
        // 직렬화 안 되는 타입 (HttpServletRequest 등)은 String 으로 fallback
        try {
            return objectMapper.writeValueAsString(o);
        } catch (Exception e) {
            return o.getClass().getSimpleName() + "@" + Integer.toHexString(o.hashCode());
        }
    }
}
