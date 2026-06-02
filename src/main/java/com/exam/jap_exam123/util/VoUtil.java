package com.exam.jap_exam123.util;

import org.springframework.beans.BeanUtils;
import org.springframework.beans.BeanWrapper;
import org.springframework.beans.BeanWrapperImpl;

import java.beans.PropertyDescriptor;
import java.util.ArrayList;
import java.util.List;

/**
 * VO/DTO/Entity 간 동일 이름 필드 복사 유틸 (Spring BeanUtils 기반)
 *  - voCopy(src, dst)           : 모든 필드 복사 (src 의 null 도 그대로 덮어씀)
 *  - voCopyIgnoreNull(src, dst) : src 의 null 필드는 건너뛰고 복사 (부분 수정용)
 */
public final class VoUtil {

    private VoUtil() {}

    /** 동일 이름 프로퍼티를 src → dst 로 전체 복사 */
    public static void voCopy(Object src, Object dst) {
        BeanUtils.copyProperties(src, dst);
    }

    /** 동일 이름 프로퍼티를 src → dst 로 복사하되, src 값이 null 인 필드는 건너뜀 */
    public static void voCopyIgnoreNull(Object src, Object dst) {
        BeanUtils.copyProperties(src, dst, nullPropertyNames(src));
    }

    /** src 에서 값이 null 인 프로퍼티 이름 목록 (ignore 대상) */
    private static String[] nullPropertyNames(Object src) {
        BeanWrapper bw = new BeanWrapperImpl(src);
        List<String> nulls = new ArrayList<>();
        for (PropertyDescriptor pd : bw.getPropertyDescriptors()) {
            if (bw.getPropertyValue(pd.getName()) == null) {
                nulls.add(pd.getName());
            }
        }
        return nulls.toArray(new String[0]);
    }
}
