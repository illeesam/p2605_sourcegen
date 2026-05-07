/* ===== Source Generator : Frontend (Vue3 CDN) =====
 * gnHtmlSource — vue3cdn (with-common: common.css/js 의존)
 * gnHtmlStandaloneSource — vue3cdn (단일 HTML, CSS/JS 인라인)
 * 의존: gnAuditFields() (sourcegen.js)
 */

function gnHtmlSource(endpoint, className, dataCols, pkCols, nonPkCols, hasAudit) {
    const allItemCols = hasAudit ? [...dataCols, ...gnAuditFields()] : dataCols;
    const stringCols = dataCols.filter(c => c.javaType === 'String' && !c.isAudit);
    const idPath = pkCols.map(c => `\${row.${c.javaName}}`).join('/');

    const searchFields = stringCols.map(c => `        { name: '${c.javaName}', label: '${c.name}' }`).join(',\n');
    const columns = allItemCols.map(c => `        { key: '${c.javaName}', label: '${c.name}' }`).join(',\n');
    const formFields = nonPkCols.filter(c => !c.isAudit).map(c => {
        const required = !c.nullable;
        return `        { name: '${c.javaName}', label: '${c.name}'${required ? ', required: true' : ''} }`;
    }).join(',\n');
    const pkForm = pkCols.map(c =>
        `        { name: '${c.javaName}', label: '${c.name}', required: true, pk: true }`
    ).join(',\n');

    const emptyForm = '{ ' + dataCols.filter(c => !c.isAudit).map(c => `${c.javaName}:''`).join(', ') + ' }';
    const emptySearch = '{ ' + stringCols.map(c => `${c.javaName}:''`).join(', ') + `, pageNo:1, pageSize:10, sortBy:'' }`;

    return `<!-- Vue3 CDN (common.css / common.js 의존) -->
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>${className} CRUD</title>
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <link rel="stylesheet" href="common.css">
</head>
<body>
<div id="app">
    <div class="container">
        <h1>${className}</h1>

        <!-- ========== 검색 영역 ========== -->
        <div class="card">
            <h2>검색 조건</h2>
            <div class="grid">
                <!-- 검색 입력 필드 (META.searchFields 기반) -->
                <div class="field" v-for="f in meta.searchFields" :key="f.name">
                    <label>{{f.label}}</label>
                    <input v-model="search[f.name]">
                </div>
                <!-- 페이지 크기 (변경 시 즉시 1페이지 재조회) -->
                <div class="field">
                    <label>페이지크기</label>
                    <select v-model.number="search.pageSize" @change="searchPage(1)">
                        <option :value="5">5</option>
                        <option :value="10">10</option>
                        <option :value="20">20</option>
                        <option :value="50">50</option>
                        <option :value="100">100</option>
                    </select>
                </div>
            </div>
            <!-- 검색/초기화 버튼 -->
            <div style="text-align:right;margin-top:12px;">
                <button class="btn btn-primary" @click="searchPage(1)">검색</button>
                <button class="btn btn-secondary" @click="resetSearch">초기화</button>
            </div>
        </div>

        <!-- ========== 목록(그리드) 영역 ========== -->
        <div class="card">
            <h2>목록</h2>
            <!-- 툴바: 건수 + 신규등록 -->
            <div class="toolbar">
                <span class="toolbar-left">총 {{page.pageTotalCount}}건 / {{page.pageTotalPages || 0}}페이지</span>
                <button class="btn btn-success" @click="openInsert">+ 신규등록</button>
            </div>

            <!-- 그리드 (헤더 클릭 정렬: asc → desc → 해제) -->
            <table>
                <thead><tr>
                    <th v-for="col in meta.columns" :key="col.key"
                        :class="['sortable', sortDir(col.key) ? 'sort-' + sortDir(col.key) : '']"
                        @click="toggleSort(col.key)">
                        {{col.label}}<span class="sort-arrow"></span>
                    </th>
                    <th>관리</th>
                </tr></thead>
                <tbody>
                    <tr v-if="!list.length"><td :colspan="meta.columns.length + 1" class="empty">데이터 없음</td></tr>
                    <tr v-for="row in list" :key="rowKey(row)">
                        <td v-for="col in meta.columns" :key="col.key">{{row[col.key]}}</td>
                        <td class="actions">
                            <button class="btn btn-warning btn-sm" @click="openUpdate(row)">수정</button>
                            <button class="btn btn-danger btn-sm" @click="deleteRow(row)">삭제</button>
                        </td>
                    </tr>
                </tbody>
            </table>

            <!-- 페이징 컨트롤 -->
            <div class="pagination" v-if="page.pageTotalPages > 0">
                <button class="page-btn" :disabled="page.pageNo<=1" @click="searchPage(1)">«</button>
                <button class="page-btn" :disabled="page.pageNo<=1" @click="searchPage(page.pageNo-1)">‹</button>
                <button class="page-btn" v-for="p in pageRange" :key="p"
                        :class="{active: p===page.pageNo}" @click="searchPage(p)">{{p}}</button>
                <button class="page-btn" :disabled="page.pageNo>=page.pageTotalPages" @click="searchPage(page.pageNo+1)">›</button>
                <button class="page-btn" :disabled="page.pageNo>=page.pageTotalPages" @click="searchPage(page.pageTotalPages)">»</button>
            </div>
        </div>

        <!-- ========== 등록/수정 모달 ========== -->
        <div class="modal-overlay" v-if="modal.show" @click.self="modal.show=false">
            <div class="modal">
                <h3>{{modal.mode==='insert' ? '신규 등록' : '수정'}}</h3>
                <!-- 입력 필드 (META.formFields 기반, PK는 수정 시 disabled) -->
                <div class="field" v-for="f in meta.formFields" :key="f.name">
                    <label>{{f.label}}{{f.required ? ' *' : ''}}</label>
                    <input v-model="modal.form[f.name]" :disabled="modal.mode==='update' && f.pk">
                </div>
                <div class="modal-btns">
                    <button class="btn btn-secondary" @click="modal.show=false">취소</button>
                    <button class="btn btn-primary" @click="saveModal">저장</button>
                </div>
            </div>
        </div>
    </div>
</div>

<script src="common.js"></script>
<script>
/**
 * ${className} 화면 메타정보
 *  - endpoint: REST API 엔드포인트 (/api/{endpoint})
 *  - pk: PK 필드명 배열 (행 식별 / URL 경로 조립용)
 *  - searchFields: 검색 영역 입력 필드
 *  - columns: 그리드 컬럼 (감사 필드 포함)
 *  - formFields: 등록/수정 모달 입력 필드
 *  - emptyForm: 모달 초기값 팩토리
 *  - emptySearch: 검색조건 초기값 팩토리 (page/size/sortBy 포함)
 *  - idPath: row -> "/{pk1}/{pk2}/..." URL 경로 빌더
 */
const META = {
    /** REST 엔드포인트 */
    endpoint: '${endpoint}',
    /** PK 필드명 (URL 경로 + rowKey 생성에 사용) */
    pk: [${pkCols.map(c => `'${c.javaName}'`).join(', ')}],
    /** 검색 영역 입력 필드 정의 */
    searchFields: [
${searchFields}
    ],
    /** 그리드 컬럼 정의 (감사 필드 포함) */
    columns: [
${columns}
    ],
    /** 등록/수정 모달 입력 필드 (pk:true 는 수정 시 disabled) */
    formFields: [
${pkForm}${nonPkCols.filter(c => !c.isAudit).length > 0 ? ',\n' + formFields : ''}
    ],
    /** 모달 폼 초기값 */
    emptyForm: () => (${emptyForm}),
    /** 검색조건 초기값 (페이징/정렬 포함) */
    emptySearch: () => (${emptySearch}),
    /** PK 조합으로 URL 경로 빌드 */
    idPath: row => \`/${idPath}\`
};

// Vue 앱 마운트
createExamApp(META).mount('#app');
</script>
</body>
</html>
`;
}

// ----- HTML Standalone (CSS/JS 인라인) -----
function gnHtmlStandaloneSource(endpoint, className, dataCols, pkCols, nonPkCols, hasAudit) {
    const allItemCols = hasAudit ? [...dataCols, ...gnAuditFields()] : dataCols;
    const stringCols = dataCols.filter(c => c.javaType === 'String' && !c.isAudit);
    const idPath = pkCols.map(c => `\${row.${c.javaName}}`).join('/');

    const searchFields = stringCols.map(c => `        { name: '${c.javaName}', label: '${c.name}' }`).join(',\n');
    const columns = allItemCols.map(c => `        { key: '${c.javaName}', label: '${c.name}' }`).join(',\n');
    const formFields = nonPkCols.filter(c => !c.isAudit).map(c => {
        const required = !c.nullable;
        return `        { name: '${c.javaName}', label: '${c.name}'${required ? ', required: true' : ''} }`;
    }).join(',\n');
    const pkForm = pkCols.map(c =>
        `        { name: '${c.javaName}', label: '${c.name}', required: true, pk: true }`
    ).join(',\n');

    const emptyForm = '{ ' + dataCols.filter(c => !c.isAudit).map(c => `${c.javaName}:''`).join(', ') + ' }';
    const emptySearch = '{ ' + stringCols.map(c => `${c.javaName}:''`).join(', ') + `, pageNo:1, pageSize:10, sortBy:'' }`;

    return `<!-- Vue3 CDN (단일 파일 - CSS/JS 인라인, 외부 의존 없음) -->
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>${className} CRUD</title>
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', 'Malgun Gothic', sans-serif; background: #f5f6fa; color: #333; }
        .container { padding: 20px; }
        h1 { margin-bottom: 16px; color: #2c3e50; font-size: 20px; }
        .card { background: #fff; border-radius: 8px; padding: 18px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06); margin-bottom: 16px; }
        .card h2 { font-size: 14px; color: #555; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #ecf0f1; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px 12px; }
        .field { display: flex; align-items: center; gap: 6px; }
        .field label { font-size: 12px; color: #7f8c8d; min-width: 64px; }
        .field input, .field select { flex: 1; padding: 6px 9px; border: 1px solid #d0d7de;
            border-radius: 4px; font-size: 13px; background: #fff; }
        .toolbar { display: flex; justify-content: space-between; align-items: center; margin: 12px 0 10px; }
        .btn { padding: 6px 14px; border: none; border-radius: 4px; cursor: pointer;
            font-size: 12px; font-weight: 600; }
        .btn-primary { background: #4f7df3; color: #fff; }
        .btn-success { background: #27ae60; color: #fff; }
        .btn-warning { background: #f39c12; color: #fff; }
        .btn-danger { background: #e74c3c; color: #fff; }
        .btn-secondary { background: #95a5a6; color: #fff; }
        .btn-sm { padding: 4px 10px; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #34495e; color: #fff; padding: 9px 8px; text-align: left; cursor: pointer; user-select: none; }
        th.sort-asc::after { content: ' ▲'; }
        th.sort-desc::after { content: ' ▼'; }
        td { padding: 7px 8px; border-bottom: 1px solid #ecf0f1; }
        .empty { text-align: center; color: #bdc3c7; padding: 28px; }
        .actions { display: flex; gap: 4px; }
        /* 행 상태별 색상 (rowStatus: I/U/D) */
        tr.rs-I td { background: #fff7d6 !important; }   /* 노랑 - 신규 */
        tr.rs-U td { background: #d6e7ff !important; }   /* 파랑 - 수정 */
        tr.rs-D td { background: #ffd6d6 !important; text-decoration: line-through; color: #999; }
        .row-status { font-weight: bold; text-align: center; }
        .rs-I { color: #d68910; }
        .rs-U { color: #2471a3; }
        .rs-D { color: #c0392b; }
        .pagination { display: flex; justify-content: center; gap: 4px; margin-top: 12px; }
        .page-btn { padding: 4px 10px; border: 1px solid #d0d7de; border-radius: 3px;
            background: #fff; cursor: pointer; font-size: 12px; min-width: 32px; }
        .page-btn.active { background: #4f7df3; color: #fff; border-color: #4f7df3; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5);
            display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal { background: #fff; border-radius: 8px; padding: 24px; width: 480px; max-height: 90vh; overflow-y: auto; }
        .modal-btns { display: flex; justify-content: flex-end; gap: 6px; margin-top: 18px;
            padding-top: 14px; border-top: 1px solid #ecf0f1; }
    </style>
</head>
<body>
<div id="app">
    <div class="container">
        <h1>${className}</h1>

        <!-- ========== 검색 영역 ========== -->
        <div class="card">
            <h2>검색</h2>
            <div class="grid">
                <!-- 검색 입력 필드 -->
                <div class="field" v-for="f in searchFields" :key="f.name">
                    <label>{{f.label}}</label>
                    <input v-model="search[f.name]">
                </div>
                <!-- 페이지 크기 (변경 시 즉시 1페이지 재조회) -->
                <div class="field">
                    <label>크기</label>
                    <select v-model.number="search.pageSize" @change="searchPage(1)">
                        <option :value="5">5</option>
                        <option :value="10">10</option>
                        <option :value="20">20</option>
                        <option :value="50">50</option>
                        <option :value="100">100</option>
                    </select>
                </div>
            </div>
            <!-- 검색/초기화 버튼 -->
            <div style="text-align:right;margin-top:12px;">
                <button class="btn btn-primary" @click="searchPage(1)">검색</button>
                <button class="btn btn-secondary" @click="resetSearch">초기화</button>
            </div>
        </div>

        <!-- ========== 목록(그리드) 영역 ========== -->
        <div class="card">
            <h2>목록</h2>
            <!-- 툴바: 건수 + 행추가/행삭제/행취소/저장 -->
            <div class="toolbar">
                <span>총 {{page.pageTotalCount}}건 / {{page.pageTotalPages || 0}}페이지</span>
                <div style="display:flex;gap:6px;">
                    <button class="btn btn-success btn-sm" @click="addRow">+ 행추가</button>
                    <button class="btn btn-danger btn-sm" @click="deleteCheckedRows">- 행삭제</button>
                    <button class="btn btn-secondary btn-sm" @click="cancelCheckedRows">행취소</button>
                    <button class="btn btn-primary btn-sm" @click="saveAll">저장</button>
                </div>
            </div>
            <!-- 그리드 (헤더 클릭 정렬, 행번호/상태/체크박스 + 데이터) -->
            <table>
                <thead><tr>
                    <th style="width:40px;">No.</th>
                    <th style="width:40px;">상태</th>
                    <th style="width:36px;"><input type="checkbox" :checked="allChecked" @change="toggleAllCheck"></th>
                    <th v-for="col in columns" :key="col.key"
                        :class="sortDir(col.key) ? 'sort-' + sortDir(col.key) : ''"
                        @click="toggleSort(col.key)">
                        {{col.label}}
                    </th>
                    <th>관리</th>
                </tr></thead>
                <tbody>
                    <tr v-if="!list.length"><td :colspan="columns.length + 4" class="empty">데이터 없음</td></tr>
                    <tr v-for="(row, idx) in list" :key="rowKey(row) + '#' + idx" :class="row._rowStatus ? 'rs-' + row._rowStatus : ''">
                        <td style="text-align:center;">{{idx + 1}}</td>
                        <td class="row-status" :class="row._rowStatus ? 'rs-' + row._rowStatus : ''">{{row._rowStatus || ''}}</td>
                        <td style="text-align:center;"><input type="checkbox" v-model="row._checked"></td>
                        <td v-for="col in columns" :key="col.key">{{row[col.key]}}</td>
                        <td class="actions">
                            <button class="btn btn-warning btn-sm" @click="openUpdate(row)">수정</button>
                            <button class="btn btn-danger btn-sm" @click="markRowDelete(row)">삭제</button>
                            <button class="btn btn-secondary btn-sm" v-if="row._rowStatus" @click="cancelRow(row)">취소</button>
                        </td>
                    </tr>
                </tbody>
            </table>
            <!-- 페이징 컨트롤 -->
            <div class="pagination" v-if="page.pageTotalPages > 0">
                <button class="page-btn" :disabled="page.pageNo<=1" @click="searchPage(1)">«</button>
                <button class="page-btn" :disabled="page.pageNo<=1" @click="searchPage(page.pageNo-1)">‹</button>
                <button class="page-btn" v-for="p in pageRange" :key="p"
                        :class="{active: p===page.pageNo}" @click="searchPage(p)">{{p}}</button>
                <button class="page-btn" :disabled="page.pageNo>=page.pageTotalPages" @click="searchPage(page.pageNo+1)">›</button>
                <button class="page-btn" :disabled="page.pageNo>=page.pageTotalPages" @click="searchPage(page.pageTotalPages)">»</button>
            </div>
        </div>

        <div class="modal-overlay" v-if="modal.show" @click.self="modal.show=false">
            <div class="modal">
                <h3>{{modal.mode==='insert' ? '신규' : '수정'}} - ${className}</h3>
                <div class="field" v-for="f in formFields" :key="f.name" style="margin-bottom:8px;">
                    <label>{{f.label}}{{f.required ? ' *' : ''}}</label>
                    <input v-model="modal.form[f.name]" :disabled="modal.mode==='update' && f.pk">
                </div>
                <div class="modal-btns">
                    <button class="btn btn-secondary" @click="modal.show=false">취소</button>
                    <button class="btn btn-primary" @click="save">저장</button>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
const { createApp, ref, reactive, computed, onMounted } = Vue;

/** REST API base URL */
const API = 'http://localhost:8080/api/${endpoint}';
/** PK 필드명 (URL 경로 + rowKey 생성) */
const PK = [${pkCols.map(c => `'${c.javaName}'`).join(', ')}];
/** PK 조합으로 URL 경로 빌드 (/pk1/pk2/...) */
const idPath = row => \`/${idPath}\`;

createApp({
    setup() {
        /** 검색 영역 입력 필드 정의 */
        const searchFields = [
${searchFields}
        ];
        /** 그리드 컬럼 정의 (감사 필드 포함) */
        const columns = [
${columns}
        ];
        /** 등록/수정 모달 입력 필드 (pk:true 는 수정 시 disabled) */
        const formFields = [
${pkForm}${nonPkCols.filter(c => !c.isAudit).length > 0 ? ',\n' + formFields : ''}
        ];

        /** 검색조건 (페이징/정렬 포함) */
        const search = reactive(${emptySearch});
        /** 그리드 행 데이터 */
        const list = reactive([]);
        /** 페이징 메타 (서버 응답) */
        const page = reactive({ pageTotalCount: 0, pageNo: 1, pageSize: 10, pageTotalPages: 0 });
        /** 등록/수정 모달 상태 */
        const modal = reactive({ show: false, mode: 'insert', form: {} });

        /** reactive 객체 통째 교체 */
        function setObj(t, s) { Object.keys(t).forEach(k => delete t[k]); if (s) Object.assign(t, s); }
        /** reactive 배열 통째 교체 */
        function setArr(t, s) { t.length = 0; if (s && s.length) t.push(...s); }

        /** 페이지 번호 5개 단위 */
        const pageRange = computed(() => {
            const total = page.pageTotalPages || 1;
            const block = Math.floor((page.pageNo - 1) / 5);
            const start = block * 5 + 1;
            const r = [];
            for (let i = start; i <= Math.min(start + 4, total); i++) r.push(i);
            return r;
        });

        /** API 호출 */
        async function api(url, opts) {
            const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || res.statusText);
            }
            return res.status === 204 ? null : res.json();
        }

        /** 행 고유키 (PK 조합) */
        function rowKey(row) { return PK.map(k => row[k]).join('|'); }

        /** 페이지 목록 조회 */
        async function searchPage(p = 1) {
            search.pageNo = p;
            const params = {};
            Object.entries(search).forEach(([k, v]) => {
                if (v !== '' && v != null) {
                    params[k] = v;
                }
            });
            const data = await api(\`\${API}/page-list?\${new URLSearchParams(params)}\`);
            // 응답 행에 _rowStatus, _checked 메타 추가 + 원본 백업
            const rows = (data.pageList || []).map(r => ({ ...r, _rowStatus: '', _checked: false, _orig: { ...r } }));
            setArr(list, rows);
            setObj(page, { pageTotalCount: data.pageTotalCount, pageNo: data.pageNo,
                pageSize: data.pageSize, pageTotalPages: data.pageTotalPages });
        }

        /** 검색조건 초기화 */
        function resetSearch() {
            setObj(search, ${emptySearch});
            searchPage(1);
        }

        // ========== 행 편집 (행추가/행삭제/행취소/저장) ==========

        /** 헤더 체크박스: 모두 체크된 상태인지 */
        const allChecked = computed(() =>
            list.length > 0 && list.every(r => r._checked));

        /** 헤더 체크박스 토글 */
        function toggleAllCheck(e) {
            const v = e.target.checked;
            list.forEach(r => r._checked = v);
        }

        /** 행 추가 (rowStatus = 'I', 노란 배경) */
        function addRow() {
            list.unshift({ ...${emptyForm}, _rowStatus: 'I', _checked: false, _orig: null });
        }

        /** 체크된 행을 삭제 표시 (rowStatus = 'D'). I 였던 신규행은 즉시 제거 */
        function deleteCheckedRows() {
            for (let i = list.length - 1; i >= 0; i--) {
                if (!list[i]._checked) {
                    continue;
                }
                if (list[i]._rowStatus === 'I') {
                    // 신규는 즉시 제거
                    list.splice(i, 1);
                } else {
                    list[i]._rowStatus = 'D';
                }
            }
        }

        /** 한 행을 삭제 표시 */
        function markRowDelete(row) {
            if (row._rowStatus === 'I') {
                const i = list.indexOf(row);
                if (i >= 0) {
                    list.splice(i, 1);
                }
                return;
            }
            row._rowStatus = 'D';
        }

        /** 체크된 행들의 변경사항을 취소 */
        function cancelCheckedRows() {
            for (let i = list.length - 1; i >= 0; i--) {
                if (!list[i]._checked) {
                    continue;
                }
                if (list[i]._rowStatus === 'I') {
                    list.splice(i, 1);
                    continue;
                }
                cancelRow(list[i]);
            }
        }

        /** 한 행의 변경사항을 취소 (원본 복원, status 해제) */
        function cancelRow(row) {
            if (row._rowStatus === 'I') {
                const i = list.indexOf(row);
                if (i >= 0) {
                    list.splice(i, 1);
                }
                return;
            }
            if (row._orig) {
                Object.assign(row, row._orig);
            }
            row._rowStatus = '';
            row._checked = false;
        }

        /** 일괄 저장 (백엔드 /save-list 한 번 호출, D → U → I 순은 서버가 보장) */
        async function saveAll() {
            const changed = list.filter(r => r._rowStatus === 'I' || r._rowStatus === 'U' || r._rowStatus === 'D');
            if (!changed.length) { alert('변경된 행이 없습니다.'); return; }
            const dCnt = changed.filter(r => r._rowStatus === 'D').length;
            const uCnt = changed.filter(r => r._rowStatus === 'U').length;
            const iCnt = changed.filter(r => r._rowStatus === 'I').length;
            if (!confirm(\`저장하시겠습니까?\\n삭제 \${dCnt} / 수정 \${uCnt} / 신규 \${iCnt}\`)) return;
            try {
                const payload = changed.map(r => toServerRow(r));
                await api(API + '/save-list', { method: 'POST', body: JSON.stringify(payload) });
                await searchPage(page.pageNo);
                alert('저장 완료');
            } catch (e) { alert('저장 실패: ' + e.message); }
        }

        /** 메타 필드(_checked, _orig) 제거 + _rowStatus → rowStatus 로 변환하여 서버 전송용 객체 반환 */
        function toServerRow(row) {
            const o = {};
            Object.entries(row).forEach(([k, v]) => {
                if (!k.startsWith('_')) {
                    o[k] = v;
                }
            });
            if (row._rowStatus) {
                o.rowStatus = row._rowStatus;
            }
            return o;
        }
        /** (모달 전용) 메타 필드 제거 — rowStatus 도 제외 */
        function stripMeta(row) {
            const o = {};
            Object.entries(row).forEach(([k, v]) => {
                if (!k.startsWith('_') && k !== 'rowStatus') {
                    o[k] = v;
                }
            });
            return o;
        }

        /** 헤더 클릭 - 정렬 토글 (asc → desc → 해제) */
        function toggleSort(key) {
            const cur = search.sortBy || '';
            search.sortBy = cur === key + ' asc' ? key + ' desc'
                : cur === key + ' desc' ? '' : key + ' asc';
            searchPage(1);
        }
        /** 현재 정렬 방향 (asc/desc/'') */
        function sortDir(key) {
            const cur = search.sortBy || '';
            return cur === key + ' asc' ? 'asc' : cur === key + ' desc' ? 'desc' : '';
        }

        /** 신규 등록 모달 오픈 */
        function openInsert() {
            setObj(modal, { show: true, mode: 'insert', form: ${emptyForm} });
        }
        /** 수정 모달 오픈 */
        function openUpdate(row) {
            setObj(modal, { show: true, mode: 'update', form: { ...row } });
        }
        /** 등록/수정 저장 (모달) - 즉시 서버 호출 */
        async function save() {
            try {
                if (modal.mode === 'insert') {
                    await api(API, { method: 'POST', body: JSON.stringify(stripMeta(modal.form)) });
                } else {
                    await api(API + idPath(modal.form),
                              { method: 'PUT', body: JSON.stringify(stripMeta(modal.form)) });
                }
                modal.show = false;
                searchPage(page.pageNo);
            } catch (e) { alert(e.message); }
        }
        /** 행 삭제 (즉시 서버 호출) */
        async function deleteRow(row) {
            if (!confirm('삭제?')) return;
            try {
                await api(API + idPath(row), { method: 'DELETE' });
                searchPage(page.pageNo);
            } catch (e) { alert(e.message); }
        }

        onMounted(() => searchPage(1));
        return { searchFields, columns, formFields, search, list, page, modal, pageRange,
                 rowKey, searchPage, resetSearch, toggleSort, sortDir,
                 openInsert, openUpdate, save, deleteRow,
                 allChecked, toggleAllCheck, addRow,
                 deleteCheckedRows, markRowDelete,
                 cancelCheckedRows, cancelRow, saveAll };
    }
}).mount('#app');
</script>
</body>
</html>
`;
}
