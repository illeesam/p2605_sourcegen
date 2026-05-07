/* ===== Source Generator : Frontend (Svelte CDN — vanilla) =====
 * gnSvelteCdnStandaloneSource — 단일 HTML, 빌드 없이 동작.
 *
 * 솔직한 표기:
 *   진짜 Svelte 는 컴파일러 의존이라 CDN-only 동작 불가.
 *   본 출력물은 "Svelte 풍 vanilla JS" — 컴파일된 컴포넌트 형태의 출력을 흉내냄.
 *   반응성: Proxy 기반 자체 구현 / 마크업: textContent / 이벤트: addEventListener.
 *
 * 의존: gnAuditFields() (sourcegen.js)
 */

function gnSvelteCdnStandaloneSource(endpoint, className, dataCols, pkCols, nonPkCols, hasAudit) {
    const allItemCols = hasAudit ? [...dataCols, ...gnAuditFields()] : dataCols;
    const stringCols = dataCols.filter(c => c.javaType === 'String' && !c.isAudit);

    const emptyForm   = '{ ' + dataCols.filter(c => !c.isAudit).map(c => `${c.javaName}: ''`).join(', ') + ' }';
    const emptySearch = '{ ' + stringCols.map(c => `${c.javaName}: ''`).join(', ') + `, pageNo: 1, pageSize: 10, sortBy: '' }`;
    const searchFieldsArr = stringCols.map(c => `  { name: '${c.javaName}', label: '${c.name}' }`).join(',\n');
    const columnsArr      = allItemCols.map(c => `  { key: '${c.javaName}', label: '${c.name}' }`).join(',\n');
    const formFieldsArr   = [
        ...pkCols.map(c => `  { name: '${c.javaName}', label: '${c.name}', required: true, pk: true }`),
        ...nonPkCols.filter(c => !c.isAudit).map(c => {
            const r = !c.nullable;
            return `  { name: '${c.javaName}', label: '${c.name}'${r ? ', required: true' : ''} }`;
        })
    ].join(',\n');

    return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>${className} CRUD (Svelte CDN — vanilla)</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f5f7fa; color: #2c3e50; }
        h1 { margin: 0 0 16px; font-size: 20px; }
        .card { background: #fff; border-radius: 6px; padding: 16px; margin-bottom: 16px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
        .field { display: inline-flex; align-items: center; gap: 6px; margin: 4px 8px 4px 0; }
        .field label { font-size: 12px; color: #7f8c8d; }
        input, select { padding: 5px 8px; border: 1px solid #d0d7de; border-radius: 4px; font-size: 13px; }
        button { padding: 5px 12px; border: 0; border-radius: 4px; cursor: pointer;
                 font-size: 12px; font-weight: 600; background: #4f7df3; color: #fff; }
        button.sec  { background: #95a5a6; }
        button.suc  { background: #27ae60; }
        button.warn { background: #f39c12; }
        button.dng  { background: #e74c3c; }
        button.sm   { padding: 3px 9px; font-size: 11px; }
        button:disabled { opacity: 0.4; cursor: not-allowed; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #ecf0f1; }
        th { background: #34495e; color: #fff; cursor: pointer; user-select: none; }
        th.sort-asc::after  { content: ' ▲'; }
        th.sort-desc::after { content: ' ▼'; }
        .actions { display: flex; gap: 4px; justify-content: flex-end; }
        .empty { text-align: center; color: #95a5a6; padding: 20px; }
        .pagination { display: flex; gap: 4px; justify-content: center; margin-top: 12px; }
        .pagination button { background: #fff; color: #2c3e50; border: 1px solid #d0d7de; min-width: 32px; }
        .pagination button.active { background: #4f7df3; color: #fff; border-color: #4f7df3; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5);
                         display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal { background: #fff; padding: 22px 24px; border-radius: 8px; min-width: 420px; max-width: 90vw; }
        .modal h3 { margin: 0 0 14px; }
        .modal .field { display: block; margin-bottom: 10px; }
        .modal .field input { width: 100%; }
        .modal-btns { display: flex; justify-content: flex-end; gap: 6px; margin-top: 14px; }
        .nm { color: #95a5a6; font-size: 11px; margin-left: 4px; }
    </style>
</head>
<body>
<div id="app"></div>

<script>
/* ============================================================
 * "Svelte 풍" mini-runtime
 *  - Proxy 로 반응성 구현 (state 변경 시 render() 자동 호출)
 *  - 마크업은 함수가 HTML 문자열을 반환 + delegated event 처리
 * ============================================================ */

/** 반응성 store — set/delete 시 자동으로 dirty 마킹 */
function reactive(obj, onChange) {
    const handler = {
        set(t, k, v) {
            const ok = Reflect.set(t, k, v);
            onChange();
            return ok;
        },
        deleteProperty(t, k) {
            const ok = Reflect.deleteProperty(t, k);
            onChange();
            return ok;
        }
    };
    return new Proxy(obj, handler);
}

/** REST API base URL */
const API = 'http://localhost:8080/api/${endpoint}';

/** PK 필드명 */
const PK = [${pkCols.map(c => `'${c.javaName}'`).join(', ')}];

const SEARCH_FIELDS = [
${searchFieldsArr}
];
const COLUMNS = [
${columnsArr}
];
const FORM_FIELDS = [
${formFieldsArr}
];
const EMPTY_FORM   = () => (${emptyForm});
const EMPTY_SEARCH = () => (${emptySearch});

/** PK 경로 (/id1/id2/...) */
function idPath(row) { return '/' + PK.map(k => row[k]).join('/'); }

/** 공통 fetch wrapper */
async function api(url, opts = {}) {
    const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' }, ...opts
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || res.statusText);
    }
    if (res.status === 204) {
        return null;
    }
    return res.json();
}

/** ============================================================
 *  컴포넌트 정의 — state + render + actions
 *  ============================================================ */
let scheduled = false;
function scheduleRender() {
    if (scheduled) {
        return;
    }
    scheduled = true;
    queueMicrotask(() => {
        scheduled = false;
        render();
    });
}

const state = {
    search: EMPTY_SEARCH(),
    list:   [],
    page:   { pageTotalCount: 0, pageNo: 1, pageSize: 10, pageTotalPages: 0 },
    modal:  { show: false, mode: 'insert', form: {} }
};
// 깊은 객체는 각 필드도 reactive 로
state.search = reactive(state.search, scheduleRender);
state.page   = reactive(state.page,   scheduleRender);
state.modal  = reactive(state.modal,  scheduleRender);

const root = document.getElementById('app');

/** 페이지 번호 5개 단위 */
function pageRange() {
    const total = state.page.pageTotalPages || 1;
    const block = Math.floor((state.page.pageNo - 1) / 5);
    const start = block * 5 + 1;
    const r = [];
    for (let i = start; i <= Math.min(start + 4, total); i++) {
        r.push(i);
    }
    return r;
}

function rowKey(row) { return PK.map(k => row[k]).join('|'); }

function sortDir(key) {
    const cur = state.search.sortBy || '';
    if (cur === key + ' asc')  return 'sort-asc';
    if (cur === key + ' desc') return 'sort-desc';
    return '';
}

/** ============================================================
 *  Actions
 *  ============================================================ */
async function searchPage(p = 1) {
    state.search.pageNo = p;
    try {
        const params = {};
        Object.entries(state.search).forEach(([k, v]) => {
            if (v !== '' && v != null) {
                params[k] = v;
            }
        });
        const qs = new URLSearchParams(params).toString();
        const data = await api(API + '/page-list?' + qs);
        state.list = data.pageList || [];
        Object.assign(state.page, {
            pageTotalCount: data.pageTotalCount, pageNo: data.pageNo,
            pageSize: data.pageSize, pageTotalPages: data.pageTotalPages
        });
        scheduleRender();
    } catch (e) { alert(e.message); }
}

function resetSearch() {
    Object.assign(state.search, EMPTY_SEARCH());
    searchPage(1);
}

function toggleSort(key) {
    const cur = state.search.sortBy || '';
    state.search.sortBy = cur === key + ' asc' ? key + ' desc'
                       : cur === key + ' desc' ? '' : key + ' asc';
    searchPage(1);
}

function openInsert() {
    Object.assign(state.modal, { show: true, mode: 'insert', form: EMPTY_FORM() });
}
function openUpdate(row) {
    Object.assign(state.modal, { show: true, mode: 'update', form: { ...row } });
}
function closeModal() {
    state.modal.show = false;
}

async function save() {
    try {
        if (state.modal.mode === 'insert') {
            await api(API, { method: 'POST', body: JSON.stringify(state.modal.form) });
        } else {
            await api(API + idPath(state.modal.form),
                { method: 'PUT', body: JSON.stringify(state.modal.form) });
        }
        state.modal.show = false;
        searchPage(state.page.pageNo);
    } catch (e) { alert(e.message); }
}

async function deleteRow(row) {
    if (!confirm('삭제?')) {
        return;
    }
    try {
        await api(API + idPath(row), { method: 'DELETE' });
        searchPage(state.page.pageNo);
    } catch (e) { alert(e.message); }
}

/** ============================================================
 *  Markup builders (Svelte 컴파일 결과물 흉내)
 *  ============================================================ */
function escapeHtml(s) {
    if (s === null || s === undefined) {
        return '';
    }
    return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function searchSection() {
    const fields = SEARCH_FIELDS.map(f =>
        '<span class="field"><label>' + f.label + '</label>' +
        '<input data-bind="search.' + f.name + '" value="' + escapeHtml(state.search[f.name]) + '" placeholder="' + f.label + '">' +
        '</span>'
    ).join('');
    return '<div class="card">' + fields +
        '<span class="field"><label>페이지크기</label>' +
        '<select data-bind="search.pageSize" data-search-after="1">' +
        [5, 10, 20, 50, 100].map(n =>
            '<option value="' + n + '"' + (state.search.pageSize === n ? ' selected' : '') + '>' + n + '</option>'
        ).join('') +
        '</select></span>' +
        '<button data-action="searchPage:1">검색</button> ' +
        '<button class="sec" data-action="resetSearch">초기화</button>' +
        '</div>';
}

function listSection() {
    const head = '<thead><tr>' +
        COLUMNS.map(c =>
            '<th class="' + sortDir(c.key) + '" data-action="toggleSort:' + c.key + '">' +
            c.label + '</th>'
        ).join('') +
        '<th style="width:130px">관리</th></tr></thead>';

    const body = state.list.length
        ? state.list.map(row =>
            '<tr data-row-key="' + escapeHtml(rowKey(row)) + '">' +
            COLUMNS.map(c => '<td>' + escapeHtml(row[c.key]) + '</td>').join('') +
            '<td class="actions">' +
                '<button class="warn sm" data-action="openUpdate:' + escapeHtml(rowKey(row)) + '">수정</button>' +
                '<button class="dng sm"  data-action="deleteRow:'  + escapeHtml(rowKey(row)) + '">삭제</button>' +
            '</td></tr>'
        ).join('')
        : '<tr><td colspan="' + (COLUMNS.length + 1) + '" class="empty">데이터 없음</td></tr>';

    const pag = state.page.pageTotalPages > 0 ? '<div class="pagination">' +
        '<button data-action="searchPage:1" '                       + (state.page.pageNo <= 1 ? 'disabled' : '') + '>«</button>' +
        '<button data-action="searchPage:' + (state.page.pageNo-1) + '" ' + (state.page.pageNo <= 1 ? 'disabled' : '') + '>‹</button>' +
        pageRange().map(p =>
            '<button class="' + (p === state.page.pageNo ? 'active' : '') +
            '" data-action="searchPage:' + p + '">' + p + '</button>'
        ).join('') +
        '<button data-action="searchPage:' + (state.page.pageNo+1) + '" ' + (state.page.pageNo >= state.page.pageTotalPages ? 'disabled' : '') + '>›</button>' +
        '<button data-action="searchPage:' + state.page.pageTotalPages + '" '          + (state.page.pageNo >= state.page.pageTotalPages ? 'disabled' : '') + '>»</button>' +
        '</div>' : '';

    return '<div class="card">' +
        '<div style="display:flex;justify-content:space-between;margin-bottom:8px;">' +
            '<span style="font-size:12px;color:#7f8c8d;">총 ' + state.page.pageTotalCount +
                '건 / ' + (state.page.pageTotalPages || 0) + '페이지</span>' +
            '<button class="suc" data-action="openInsert">+ 신규등록</button>' +
        '</div>' +
        '<table>' + head + '<tbody>' + body + '</tbody></table>' +
        pag +
        '</div>';
}

function modalSection() {
    if (!state.modal.show) {
        return '';
    }
    const inputs = FORM_FIELDS.map(f => {
        const disabled = state.modal.mode === 'update' && f.pk ? ' disabled' : '';
        return '<div class="field"><label>' + f.label + (f.required ? ' *' : '') + '</label>' +
            '<input data-bind="modal.form.' + f.name + '" value="' +
            escapeHtml(state.modal.form[f.name]) + '"' + disabled + '></div>';
    }).join('');
    return '<div class="modal-overlay" data-action="overlayClose"><div class="modal" data-stop>' +
        '<h3>' + (state.modal.mode === 'insert' ? '신규 등록' : '수정') + ' - ${className}</h3>' +
        inputs +
        '<div class="modal-btns">' +
            '<button class="sec" data-action="closeModal">취소</button>' +
            '<button data-action="save">저장</button>' +
        '</div></div></div>';
}

/** ============================================================
 *  Render — Svelte 의 update() 흉내. innerHTML 한방 갱신
 *  (주의: 단순화 위해 input focus 는 매 렌더마다 잃을 수 있음.
 *         실무용은 키 보존 가능한 가상 DOM 라이브러리 권장.)
 *  ============================================================ */
function render() {
    // 입력 중인 element 의 selectionStart 보존
    const focused = document.activeElement;
    const focusBind = focused && focused.getAttribute && focused.getAttribute('data-bind');
    const focusSel  = (focused && focused.selectionStart != null) ? focused.selectionStart : null;

    root.innerHTML =
        '<h1>${className} (Svelte CDN — vanilla)</h1>' +
        searchSection() +
        listSection() +
        modalSection();

    // 포커스 복원
    if (focusBind) {
        const next = root.querySelector('[data-bind="' + focusBind + '"]');
        if (next) {
            next.focus();
            if (focusSel != null && next.setSelectionRange) {
                try { next.setSelectionRange(focusSel, focusSel); } catch (e) {}
            }
        }
    }
}

/** ============================================================
 *  Event delegation — data-action / data-bind 자동 처리
 *  ============================================================ */
const ACTIONS = {
    searchPage: (arg) => searchPage(Number(arg)),
    resetSearch: () => resetSearch(),
    toggleSort: (k) => toggleSort(k),
    openInsert: () => openInsert(),
    openUpdate: (key) => {
        const row = state.list.find(r => rowKey(r) === key);
        if (row) openUpdate(row);
    },
    deleteRow: (key) => {
        const row = state.list.find(r => rowKey(r) === key);
        if (row) deleteRow(row);
    },
    save: () => save(),
    closeModal: () => closeModal(),
    overlayClose: (arg, e) => {
        if (e.target === e.currentTarget) closeModal();
    }
};

root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-action]');
    if (!t || (e.target.closest('[data-stop]') && !t.contains(e.target.closest('[data-stop]')) && t !== e.target)) {
        // overlay 클릭은 OK 지만 modal 내부 클릭은 무시
    }
    if (!t) {
        return;
    }
    const [name, arg] = t.getAttribute('data-action').split(':');
    if (ACTIONS[name]) {
        ACTIONS[name](arg, e);
    }
});

root.addEventListener('input', (e) => {
    const t = e.target;
    const bind = t.getAttribute('data-bind');
    if (!bind) {
        return;
    }
    // bind 예: 'search.exam1Id' / 'search.pageSize' / 'modal.form.exam1Id'
    const path = bind.split('.');
    let obj = state;
    for (let i = 0; i < path.length - 1; i++) {
        obj = obj[path[i]];
    }
    let val = t.value;
    if (t.tagName === 'SELECT' && t.getAttribute('data-bind') === 'search.pageSize') {
        val = Number(val);
    }
    obj[path[path.length - 1]] = val;
});

root.addEventListener('change', (e) => {
    const t = e.target;
    const after = t.getAttribute('data-search-after');
    if (after) {
        searchPage(Number(after));
    }
});

// 초기 1회 조회
searchPage(1);
</script>
</body>
</html>
`;
}
