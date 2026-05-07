/* ===== Source Generator UI : ZIP 안의 index.html 생성기 =====
 * sourcegen_oracle.html / sourcegen_postgresql.html 공용.
 * ZIP 다운로드 시 호출:
 *  - bdIndexHtml(menuGroups, dbType, tabs, bdZipPath, pkgPath):
 *      좌측 사이드바(미리보기 + 모든 소스) + 우측 iframe/code 의 index.html 생성
 *  - bdMenuItems(tabs):  탭 배열에서 미리보기용 메뉴 아이템 추출
 *  - fnFetchCommon():    common.css / common.js fetch
 *
 * ZIP 안 layout:
 *    /index.html              ← 사이드바 + 컨텐츠
 *    /common.css /common.js   ← with-common 화면이 참조
 *    /preview/<탭N>/<파일명>  ← 미리보기 가능한 화면들
 *    /sourcegen_xxx_yyy/...   ← 모든 소스 (각 모듈 폴더)
 */

/** 탭 배열에서 미리보기용 메뉴 아이템 추출 */
function bdMenuItems(tabs) {
    const groups = [];
    tabs.forEach((t, i) => {
        if (!t || !t.files || Object.keys(t.files).length === 0) {
            return;
        }
        const items = [];
        Object.keys(t.files).forEach(fn => {
            if (fn.startsWith('frontend_vue3cdn_with_common/') && fn.endsWith('.html')) {
                items.push({ label: fn.substring('frontend_vue3cdn_with_common/'.length), kind: 'vue3cdn (with common)', fn });
            } else if (fn.startsWith('frontend_vue3cdn_standalone/') && fn.endsWith('.html')) {
                items.push({ label: fn.substring('frontend_vue3cdn_standalone/'.length), kind: 'vue3cdn (standalone)', fn });
            } else if (fn.startsWith('frontend_react_cdn_standalone/') && fn.endsWith('.html')) {
                items.push({ label: fn.substring('frontend_react_cdn_standalone/'.length), kind: 'react cdn', fn });
            } else if (fn.startsWith('frontend_svelte_cdn_standalone/') && fn.endsWith('.html')) {
                items.push({ label: fn.substring('frontend_svelte_cdn_standalone/'.length), kind: 'svelte cdn', fn });
            } else if (fn.startsWith('frontend_pyscript_cdn_standalone/') && fn.endsWith('.html')) {
                items.push({ label: fn.substring('frontend_pyscript_cdn_standalone/'.length), kind: 'pyscript cdn', fn });
            }
        });
        if (items.length) {
            groups.push({ tabNo: i + 1, items });
        }
    });
    return groups;
}

/** common.css / common.js 를 같은 origin 에서 fetch */
async function fnFetchCommon() {
    try {
        const [css, js] = await Promise.all([
            fetch('common.css').then(r => r.ok ? r.text() : ''),
            fetch('common.js').then(r => r.ok ? r.text() : '')
        ]);
        return { css, js };
    } catch (e) {
        return { css: '', js: '' };
    }
}

/** 파일 확장자 → 코드 하이라이트 클래스 (Prism 미사용 — 단순 표시용) */
function fnLangClassByExt(path) {
    const p = path.toLowerCase();
    if (p.endsWith('.java'))    return 'language-java';
    if (p.endsWith('.kt'))      return 'language-kotlin';
    if (p.endsWith('.cs'))      return 'language-csharp';
    if (p.endsWith('.py'))      return 'language-python';
    if (p.endsWith('.ts') || p.endsWith('.tsx')) return 'language-typescript';
    if (p.endsWith('.js') || p.endsWith('.jsx')) return 'language-javascript';
    if (p.endsWith('.vue') || p.endsWith('.html') || p.endsWith('.xml')) return 'language-markup';
    if (p.endsWith('.json'))    return 'language-json';
    if (p.endsWith('.yaml') || p.endsWith('.yml')) return 'language-yaml';
    if (p.endsWith('.sql'))     return 'language-sql';
    if (p.endsWith('.dart'))    return 'language-dart';
    if (p.endsWith('.svelte'))  return 'language-markup';
    if (p.endsWith('.prisma'))  return 'language-typescript';
    return '';
}

/** index.html 본문 생성
 *  @param menuGroups 미리보기 그룹 (bdMenuItems 결과)
 *  @param dbType     'oracle' | 'postgresql'
 *  @param tabs       전체 탭 배열 (모든 소스 파일 접근용)
 *  @param bdZipPath  fn → ZIP 경로 변환 함수
 *  @param pkgPath    pkg.replace('.', '/')
 */
function bdIndexHtml(menuGroups, dbType, tabs, bdZipPath, pkgPath) {
    // === 미리보기 메뉴 ===
    const previewItems = [];
    menuGroups.forEach(g => {
        g.items.forEach(it => {
            previewItems.push({
                tabNo: g.tabNo, fn: it.fn, kind: it.kind,
                href: `preview/tab${g.tabNo}/${encodeURIComponent(it.fn)}.html`
            });
        });
    });

    // === 모든 소스 — 모듈별로 묶기 ===
    const allFilesByModule = {};
    let globalIdx = 0;
    const allFilesData = [];

    function moduleKeyOf(fn) {
        const seg = fn.split('/')[0];
        const map = {
            'backend_jpa':                  'Backend (JPA)',
            'backend_mybatis':              'Backend (MyBatis)',
            'backend_python':               'Backend (Python)',
            'backend_csharp_efcore':        'Backend (C# EF Core)',
            'backend_csharp_dapper':        'Backend (C# Dapper)',
            'backend_nestjs':               'Backend (NestJS 10)',
            'backend_expressjs':            'Backend (Express 4)',
            'frontend_vue3cdn_with_common': 'Vue3 CDN (with common)',
            'frontend_vue3cdn_standalone':  'Vue3 CDN (standalone)',
            'frontend_vue3':                'Vue3 SFC',
            'frontend_react_cdn_standalone':'React CDN (standalone)',
            'frontend_react':               'React SFC',
            'frontend_svelte_cdn_standalone':'Svelte CDN (standalone)',
            'frontend_svelte':              'Svelte SFC',
            'frontend_pyscript_cdn_standalone':'PyScript CDN (standalone)',
            'frontend_flutter':             'Flutter (Mobile)',
            'frontend_react_native':        'React Native (Mobile)',
            'frontend_android':             'Android (Compose)',
            'frontend_ios':                 'iOS (SwiftUI)',
            'fullstack_nuxt':               'Nuxt 4 + Prisma (Fullstack)',
            'fullstack_nextjs':             'Next.js 15 + Prisma (Fullstack)',
            'ddl':                          'DDL'
        };
        return map[seg] || seg;
    }

    tabs.forEach((t, ti) => {
        if (!t || !t.files) {
            return;
        }
        Object.entries(t.files).forEach(([fn, content]) => {
            const modKey = moduleKeyOf(fn);
            const zipPath = bdZipPath(fn, pkgPath);
            const item = { idx: globalIdx++, tabNo: ti + 1, fn, zipPath, modKey };
            if (!allFilesByModule[modKey]) {
                allFilesByModule[modKey] = [];
            }
            allFilesByModule[modKey].push(item);
            allFilesData.push({ idx: item.idx, zipPath, content });
        });
    });

    // 미리보기 navItem HTML
    const previewNavHtml = previewItems.map((it, i) => {
        const safeTitle = (`[${it.kind}] tab${it.tabNo}/${it.fn}`).replace(/"/g, '&quot;');
        return `    <a href="#" class="m-link prev-link" data-pidx="${i}" data-href="${it.href}"
        data-kind="${it.kind}" title="${safeTitle}">
        <span class="m-kind">[${it.kind}]</span> tab${it.tabNo}/${it.fn}
    </a>`;
    }).join('\n');

    // 소스 모듈 표시 순서
    const sourceModuleOrder = [
        'Backend (JPA)', 'Backend (MyBatis)', 'Backend (Python)',
        'Backend (C# EF Core)', 'Backend (C# Dapper)',
        'Backend (NestJS 10)', 'Backend (Express 4)',
        'Vue3 CDN (with common)', 'Vue3 CDN (standalone)', 'Vue3 SFC',
        'React CDN (standalone)', 'React SFC',
        'Svelte CDN (standalone)', 'Svelte SFC',
        'PyScript CDN (standalone)',
        'Flutter (Mobile)', 'React Native (Mobile)',
        'Android (Compose)', 'iOS (SwiftUI)',
        'Nuxt 4 + Prisma (Fullstack)', 'Next.js 15 + Prisma (Fullstack)',
        'DDL'
    ];
    const presentModules = sourceModuleOrder.filter(k => allFilesByModule[k]);
    Object.keys(allFilesByModule).forEach(k => {
        if (!presentModules.includes(k)) {
            presentModules.push(k);
        }
    });

    const sourceNavHtml = presentModules.map(modKey => {
        const items = allFilesByModule[modKey];
        const lis = items.map(it => {
            // 표시: ZIP 경로에서 첫 세그먼트(템플릿 모듈명, 예: sourcegen_fe_pyscript_cdn/) 만 제거
            //       → 그 이하 풀경로 표시
            const zp = it.zipPath || '';
            const slash = zp.indexOf('/');
            const display = slash >= 0 ? zp.substring(slash + 1) : zp;
            const safeTitle = (`tab${it.tabNo}/${it.zipPath}`).replace(/"/g, '&quot;');
            return `        <a href="#" class="m-link src-link" data-sidx="${it.idx}"
            title="${safeTitle}">
            <span class="m-tab">tab${it.tabNo}</span> ${display}
        </a>`;
        }).join('\n');
        return `    <div class="m-section-title">${modKey} (${items.length})</div>\n${lis}`;
    }).join('\n');

    // === 소스 inline 데이터 ===
    // HTML 안 <script type="application/json"> 에 박을 때 안전하게 처리:
    //  - </script>, <!--, --> 패턴이 본문에 절대 생기지 않도록 < > & 를 모두 \u 이스케이프.
    //  - JSON 자체는 valid (JSON.parse 가 \uXXXX 를 그대로 디코드).
    let dataJson = JSON.stringify(allFilesData);
    dataJson = dataJson.split('<').join('\\u003c');
    dataJson = dataJson.split('>').join('\\u003e');
    dataJson = dataJson.split('&').join('\\u0026');
    // U+2028 / U+2029 (line separator / paragraph separator) — JSON 내부 의 ECMA-262 호환을 위해 escape.
    dataJson = dataJson.split(String.fromCharCode(0x2028)).join('\\u2028');
    dataJson = dataJson.split(String.fromCharCode(0x2029)).join('\\u2029');

    return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>Generated Source — ${dbType}</title>
<!-- Prism.js (코드 컬러 하이라이트) -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-java.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-markup.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-jsx.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-sql.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-python.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-csharp.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-json.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-dart.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-yaml.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-typescript.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-kotlin.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-swift.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-groovy.min.js"></script>
<style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; height: 100%; font-family: 'Segoe UI', sans-serif; }
    body { display: flex; }

    /* === 좌측 사이드바 === */
    .sidebar { width: 460px; background: #2c3e50; color: #ecf0f1;
        overflow-y: auto; flex-shrink: 0; display: flex; flex-direction: column; }
    .sidebar-header { padding: 14px 16px; background: #1a252f;
        font-size: 14px; font-weight: bold; border-bottom: 1px solid #34495e; }
    .sidebar-header small { display: block; font-size: 11px; color: #95a5a6;
        margin-top: 4px; font-weight: normal; }

    .m-section-head { padding: 8px 16px; background: #1a252f; color: #f1c40f;
        font-size: 11px; font-weight: bold; letter-spacing: 1px;
        border-top: 2px solid #34495e; border-bottom: 1px solid #34495e;
        cursor: pointer; user-select: none; }
    .m-section-head:hover { background: #243140; }
    .m-section-head .arrow { float: right; }
    .m-section-body { display: block; padding: 4px 0; }
    .m-section-body.collapsed { display: none; }

    .m-section-title { padding: 8px 16px; background: #5dade2; color: #fff;
        font-size: 11px; font-weight: bold; text-transform: uppercase;
        letter-spacing: 1px;
        border-top: 1px solid #2c3e50; border-bottom: 1px solid #2980b9; }

    .m-link { display: block; padding: 6px 16px; color: #bdc3c7;
        text-decoration: none; font-size: 12px;
        border-left: 3px solid transparent;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        cursor: pointer; }
    .m-link:hover { background: #34495e; color: #ecf0f1; }
    .m-link.active { background: #34495e; color: #ecf0f1;
        border-left-color: #f1c40f; }
    .m-kind { color: #f1c40f; font-size: 10px; margin-right: 4px; font-weight: bold; }
    .m-tab  { color: #3498db; font-size: 10px; margin-right: 4px; font-weight: bold; }

    /* === 우측 컨텐츠 === */
    .content { flex: 1; display: flex; flex-direction: column; min-width: 0; }

    .screen-tabs { display: flex; background: #ecf0f1;
        border-bottom: 1px solid #d0d7de; overflow-x: auto;
        min-height: 36px; }
    .screen-tab { display: inline-flex; align-items: center; gap: 6px;
        padding: 8px 8px 8px 12px; font-size: 12px; color: #555;
        background: #ecf0f1; border-right: 1px solid #d0d7de;
        cursor: pointer; max-width: 280px;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .screen-tab:hover { background: #dde4e6; }
    .screen-tab.active { background: #fff; color: #2c3e50; font-weight: bold;
        border-bottom: 2px solid #f1c40f; margin-bottom: -1px; }
    .screen-tab .tab-close { color: #95a5a6; font-size: 14px;
        padding: 0 4px; border-radius: 3px; }
    .screen-tab .tab-close:hover { background: #e74c3c; color: #fff; }
    .screen-empty { padding: 40px; color: #95a5a6; text-align: center;
        font-size: 13px; flex: 1; }

    .panes { flex: 1; position: relative; min-height: 0; background: #fff;
        overflow: hidden; }
    .panes iframe, .panes .code-pane { position: absolute; inset: 0;
        width: 100%; height: 100%; border: 0; display: none; }
    .panes iframe.active, .panes .code-pane.active { display: block; }
    .code-pane { display: flex; flex-direction: column; background: #2d2d2d; color: #f8f8f2; }
    .code-pane-header { padding: 8px 12px; background: #1e1e1e;
        font-size: 11px; font-family: monospace; color: #aaa;
        border-bottom: 1px solid #444;
        display: flex; gap: 10px; align-items: center; }
    .code-pane-header .zip-path { color: #f1c40f; }
    .code-pane-header .copy-btn { margin-left: auto; padding: 3px 10px;
        background: #4f7df3; color: #fff; border: 0; border-radius: 3px;
        cursor: pointer; font-size: 11px; }
    .code-pane-header .copy-btn:hover { opacity: 0.85; }
    .code-pane pre { flex: 1; margin: 0 !important; padding: 14px !important;
        overflow: auto !important;
        font-family: Consolas, Monaco, monospace; font-size: 12px;
        line-height: 1.5; white-space: pre; tab-size: 4;
        background: #2d2d2d !important; border-radius: 0 !important; }
    .code-pane pre code { font-family: inherit; font-size: inherit;
        background: transparent !important; }
    /* Prism 의 token 컬러는 prism-tomorrow 테마 그대로 */

    /* === 화면탭 우클릭 컨텍스트 메뉴 === */
    .ctx-menu { position: fixed; z-index: 9999; min-width: 160px;
        background: #fff; border: 1px solid #d0d7de; border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        padding: 4px 0; font-size: 13px; user-select: none; }
    .ctx-menu .ctx-item { padding: 8px 14px; cursor: pointer; color: #2c3e50; }
    .ctx-menu .ctx-item:hover { background: #4f7df3; color: #fff; }
    .ctx-menu .ctx-sep { height: 1px; background: #ecf0f1; margin: 4px 0; }
</style>
</head>
<body>
<aside class="sidebar">
    <div class="sidebar-header">
        Generated Source — ${dbType.toUpperCase()}
        <small>미리보기 ${previewItems.length}개 / 소스 ${allFilesData.length}개</small>
    </div>

    <div class="m-section-head" data-section="preview">
        📺 미리보기 (Preview)
        <span class="arrow">▼</span>
    </div>
    <div class="m-section-body" id="sec-preview">
${previewNavHtml}
    </div>

    <div class="m-section-head" data-section="source">
        📄 모든 소스 (Source)
        <span class="arrow">▼</span>
    </div>
    <div class="m-section-body" id="sec-source">
${sourceNavHtml}
    </div>
</aside>

<section class="content">
    <div class="screen-tabs" id="screen-tabs">
        <span class="screen-empty" id="screen-empty">메뉴를 클릭하면 탭으로 열립니다</span>
    </div>
    <div class="panes" id="panes"></div>
</section>

<script id="src-data" type="application/json">${dataJson}</script>
<script>
(function () {
    var tabsBox   = document.getElementById('screen-tabs');
    var emptyMsg  = document.getElementById('screen-empty');
    var panesBox  = document.getElementById('panes');

    // 소스 데이터 로드 (JSON.parse 가 \\u003c 같은 escape 자동 디코드)
    var srcData = JSON.parse(document.getElementById('src-data').textContent);
    var srcByIdx = {};
    srcData.forEach(function (d) { srcByIdx[d.idx] = d; });

    var openTabs = {};
    var activeKey = null;

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    /** 파일 확장자 → Prism language-xxx 클래스 */
    function langClassByPath(path) {
        var p = (path || '').toLowerCase();
        if (p.endsWith('.java'))                              return 'language-java';
        if (p.endsWith('.kt') || p.endsWith('.kts'))          return 'language-kotlin';
        if (p.endsWith('.cs'))                                return 'language-csharp';
        if (p.endsWith('.csproj'))                            return 'language-markup';
        if (p.endsWith('.py'))                                return 'language-python';
        if (p.endsWith('.tsx') || p.endsWith('.ts'))          return 'language-typescript';
        if (p.endsWith('.js') || p.endsWith('.jsx') || p.endsWith('.mjs')) return 'language-javascript';
        if (p.endsWith('.swift'))                             return 'language-swift';
        if (p.endsWith('.dart'))                              return 'language-dart';
        if (p.endsWith('.json'))                              return 'language-json';
        if (p.endsWith('.yaml') || p.endsWith('.yml'))        return 'language-yaml';
        if (p.endsWith('.sql'))                               return 'language-sql';
        if (p.endsWith('.gradle'))                            return 'language-groovy';
        if (p.endsWith('.svelte') || p.endsWith('.vue'))      return 'language-markup';
        if (p.endsWith('.html') || p.endsWith('.xml'))        return 'language-markup';
        if (p.endsWith('.prisma'))                            return 'language-typescript';
        return '';
    }

    function activateTab(key) {
        Object.keys(openTabs).forEach(function (k) {
            openTabs[k].tab.classList.remove('active');
            openTabs[k].pane.classList.remove('active');
        });
        document.querySelectorAll('.m-link').forEach(function (a) { a.classList.remove('active'); });
        if (openTabs[key]) {
            openTabs[key].tab.classList.add('active');
            openTabs[key].pane.classList.add('active');
            activeKey = key;
            var sel = openTabs[key].type === 'preview'
                ? '.prev-link[data-pidx="' + openTabs[key].refId + '"]'
                : '.src-link[data-sidx="'  + openTabs[key].refId + '"]';
            var link = document.querySelector(sel);
            if (link) link.classList.add('active');
        } else {
            activeKey = null;
        }
    }

    function closeTab(key) {
        if (!openTabs[key]) return;
        openTabs[key].tab.remove();
        openTabs[key].pane.remove();
        delete openTabs[key];
        if (activeKey === key) {
            var remain = Object.keys(openTabs);
            if (remain.length) {
                activateTab(remain[remain.length - 1]);
            } else {
                activeKey = null;
                if (emptyMsg && !emptyMsg.parentNode) {
                    tabsBox.appendChild(emptyMsg);
                }
            }
        }
    }

    function ensureTabUI(key, label, title) {
        if (emptyMsg && emptyMsg.parentNode) {
            emptyMsg.remove();
        }
        var tab = document.createElement('div');
        tab.className = 'screen-tab';
        tab.title = title;
        tab.innerHTML = '<span class="tab-label">' + escapeHtml(label) + '</span>' +
                        '<span class="tab-close" title="닫기">&times;</span>';
        tab.addEventListener('click', function (e) {
            if (e.target.classList.contains('tab-close')) {
                e.stopPropagation();
                closeTab(key);
            } else {
                activateTab(key);
            }
        });
        // 우클릭 컨텍스트 메뉴
        tab.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            showCtxMenu(e.pageX, e.pageY, key);
        });
        tabsBox.appendChild(tab);
        return tab;
    }

    /** 다른 탭 모두 닫기 */
    function closeOthers(keepKey) {
        Object.keys(openTabs).slice().forEach(function (k) {
            if (k !== keepKey) closeTab(k);
        });
    }
    /** 모든 탭 닫기 */
    function closeAll() {
        Object.keys(openTabs).slice().forEach(function (k) { closeTab(k); });
    }
    /** 새 창으로 열기 — 미리보기 탭만 의미 있음 (preview/<탭>/<fn>.html) */
    function openInNewWindow(key) {
        var t = openTabs[key];
        if (!t) return;
        if (t.type === 'preview') {
            window.open(t.pane.src, '_blank');
        } else if (t.type === 'source') {
            // 소스 — Blob URL 로 새 창에 텍스트 표시
            var data = srcByIdx[t.refId];
            if (!data) return;
            var blob = new Blob([data.content || ''], { type: 'text/plain;charset=utf-8' });
            var url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
        }
    }
    /** 새로고침 — iframe 은 src 재할당, 소스는 content 재렌더링 */
    function refreshTab(key) {
        var t = openTabs[key];
        if (!t) return;
        if (t.type === 'preview') {
            // iframe reload
            try { t.pane.contentWindow.location.reload(); }
            catch (e) {
                var s = t.pane.src; t.pane.src = ''; t.pane.src = s;
            }
        } else if (t.type === 'source') {
            // 소스는 데이터가 ZIP 생성 시점에 박혀 있어 변경 없음 — 시각 효과만
            var pre = t.pane.querySelector('pre');
            var code = pre ? pre.querySelector('code') : null;
            if (code && window.Prism) {
                try { Prism.highlightElement(code); } catch (e) {}
            }
        }
    }

    /** 컨텍스트 메뉴 표시 */
    var _ctxMenu = null;
    function hideCtxMenu() {
        if (_ctxMenu && _ctxMenu.parentNode) {
            _ctxMenu.parentNode.removeChild(_ctxMenu);
        }
        _ctxMenu = null;
    }
    function showCtxMenu(x, y, key) {
        hideCtxMenu();
        var menu = document.createElement('div');
        menu.className = 'ctx-menu';
        menu.innerHTML =
            '<div class="ctx-item" data-act="other">기타 닫기</div>' +
            '<div class="ctx-item" data-act="all">전체 닫기</div>' +
            '<div class="ctx-sep"></div>' +
            '<div class="ctx-item" data-act="newwin">새 창으로 열기</div>' +
            '<div class="ctx-item" data-act="refresh">새로고침</div>';
        menu.addEventListener('click', function (e) {
            var act = e.target.getAttribute('data-act');
            if (!act) return;
            if (act === 'other')   closeOthers(key);
            if (act === 'all')     closeAll();
            if (act === 'newwin')  openInNewWindow(key);
            if (act === 'refresh') refreshTab(key);
            hideCtxMenu();
        });
        document.body.appendChild(menu);
        // 화면 밖 잘림 방지
        var rect = menu.getBoundingClientRect();
        var maxX = window.innerWidth  - rect.width  - 4;
        var maxY = window.innerHeight - rect.height - 4;
        menu.style.left = Math.min(x, maxX) + 'px';
        menu.style.top  = Math.min(y, maxY) + 'px';
        _ctxMenu = menu;
    }
    // 다른 곳 클릭 / Esc / 스크롤 시 메뉴 닫기
    document.addEventListener('click',     hideCtxMenu);
    document.addEventListener('contextmenu', function (e) {
        // 탭이 아닌 곳에서 우클릭 시 메뉴 닫기 (브라우저 기본 메뉴는 표시)
        if (!e.target.closest || !e.target.closest('.screen-tab')) hideCtxMenu();
    });
    document.addEventListener('keydown',   function (e) { if (e.key === 'Escape') hideCtxMenu(); });
    window.addEventListener('blur',         hideCtxMenu);

    document.querySelectorAll('.prev-link').forEach(function (a) {
        a.addEventListener('click', function (e) {
            e.preventDefault();
            var pidx = a.getAttribute('data-pidx');
            var key = 'p:' + pidx;
            if (openTabs[key]) {
                activateTab(key);
                return;
            }
            var href = a.getAttribute('data-href');
            var kind = a.getAttribute('data-kind');
            var label = a.textContent.trim();
            var tab = ensureTabUI(key, label, '[' + kind + '] ' + label);
            var frame = document.createElement('iframe');
            frame.src = href;
            panesBox.appendChild(frame);
            openTabs[key] = { tab: tab, pane: frame, type: 'preview', refId: pidx };
            activateTab(key);
        });
    });

    document.querySelectorAll('.src-link').forEach(function (a) {
        a.addEventListener('click', function (e) {
            e.preventDefault();
            var sidx = a.getAttribute('data-sidx');
            var key = 's:' + sidx;
            if (openTabs[key]) {
                activateTab(key);
                return;
            }
            var data = srcByIdx[sidx];
            if (!data) return;
            var label = (data.zipPath || '').split('/').pop();
            var tab = ensureTabUI(key, label, data.zipPath);
            var pane = document.createElement('div');
            pane.className = 'code-pane';
            var header = document.createElement('div');
            header.className = 'code-pane-header';
            header.innerHTML =
                '<span>📄 <span class="zip-path">' + escapeHtml(data.zipPath) + '</span></span>' +
                '<button class="copy-btn">복사</button>';
            // Prism 하이라이트 적용 — 확장자에 따라 language-xxx 클래스 부여
            var langClass = langClassByPath(data.zipPath);
            var pre = document.createElement('pre');
            pre.className = langClass;
            var code = document.createElement('code');
            code.className = langClass;
            code.textContent = data.content || '';
            pre.appendChild(code);
            pane.appendChild(header);
            pane.appendChild(pre);
            panesBox.appendChild(pane);
            // Prism 호출 (highlightElement 는 비동기적으로 안전)
            if (window.Prism && langClass) {
                try { Prism.highlightElement(code); } catch (e) {}
            }
            header.querySelector('.copy-btn').addEventListener('click', function () {
                navigator.clipboard.writeText(data.content || '').then(function () {
                    var btn = header.querySelector('.copy-btn');
                    var orig = btn.textContent;
                    btn.textContent = '✓ 복사됨';
                    setTimeout(function () { btn.textContent = orig; }, 1500);
                });
            });
            openTabs[key] = { tab: tab, pane: pane, type: 'source', refId: sidx };
            activateTab(key);
        });
    });

    document.querySelectorAll('.m-section-head').forEach(function (h) {
        h.addEventListener('click', function () {
            var sec = h.getAttribute('data-section');
            var body = document.getElementById('sec-' + sec);
            var arrow = h.querySelector('.arrow');
            body.classList.toggle('collapsed');
            arrow.textContent = body.classList.contains('collapsed') ? '▶' : '▼';
        });
    });

    var firstPrev = document.querySelector('.prev-link');
    if (firstPrev) firstPrev.click();
})();
</script>
</body>
</html>
`;
}
