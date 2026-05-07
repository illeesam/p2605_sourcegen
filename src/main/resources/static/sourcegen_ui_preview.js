/* ===== Source Generator UI : 미리보기 =====
 * sourcegen_oracle.html / sourcegen_postgresql.html 공용.
 * 생성된 파일 중 vue3cdn 2종 + react cdn 1종 HTML 만 새 탭으로 미리보기.
 * with_common 변형은 같은 origin 의 common.css / common.js 를 fetch 해서 inline 치환.
 *
 * 노출 함수:
 *  - chCanPreview(fn)         : 미리보기 가능 여부 판정 (check)
 *  - fnPreviewFile(fn, files) : 실제 새 탭 오픈 (Vue setup 의 handlePreviewFile 가 wrapping)
 *  - files: 생성기의 파일맵 객체 (fn -> source string).
 *           Vue 의 reactive 객체를 그대로 넘겨도 동작.
 */

/** 미리보기 가능 여부: vue3cdn 2종 + react cdn + svelte cdn + pyscript cdn HTML (SFC 빌드본은 불가) */
function chCanPreview(fn) {
    if (!fn) {
        return false;
    }
    return fn.startsWith('frontend_vue3cdn_standalone/')      && fn.endsWith('.html')
        || fn.startsWith('frontend_vue3cdn_with_common/')      && fn.endsWith('.html')
        || fn.startsWith('frontend_react_cdn_standalone/')     && fn.endsWith('.html')
        || fn.startsWith('frontend_svelte_cdn_standalone/')    && fn.endsWith('.html')
        || fn.startsWith('frontend_pyscript_cdn_standalone/')  && fn.endsWith('.html');
}

/** 새 탭에 HTML 미리보기 (with_common 은 common.css/js 를 inline 으로 끼워넣음) */
async function fnPreviewFile(fn, files) {
    if (!chCanPreview(fn)) {
        return;
    }
    let html = (files && files[fn]) || '';
    if (fn.startsWith('frontend_vue3cdn_with_common/')) {
        try {
            const [css, js] = await Promise.all([
                fetch('common.css').then(r => r.ok ? r.text() : ''),
                fetch('common.js').then(r => r.ok ? r.text() : '')
            ]);
            html = html
                .replace(/<link\s+rel="stylesheet"\s+href="common\.css"\s*\/?>/i,
                         `<style>\n${css}\n</style>`)
                .replace(/<script\s+src="common\.js"\s*><\/script>/i,
                         `<script>\n${js}\n<\/script>`);
        } catch (e) {
            alert('common.css / common.js 를 불러오지 못했습니다: ' + e.message);
            return;
        }
    }
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    // 30초 후 revoke (탭이 이미 로드한 후라 안전)
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    if (!w) {
        alert('팝업 차단을 해제해주세요.');
    }
}
