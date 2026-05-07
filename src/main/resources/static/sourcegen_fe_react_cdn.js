/* ===== Source Generator : Frontend (React CDN) =====
 * gnReactCdnStandaloneSource — React/ReactDOM/Babel CDN 단일 HTML (in-browser JSX)
 * 의존: gnAuditFields() (sourcegen.js)
 */

function gnReactCdnStandaloneSource(endpoint, className, dataCols, pkCols, nonPkCols, hasAudit) {
    const allItemCols = hasAudit ? [...dataCols, ...gnAuditFields()] : dataCols;
    const stringCols = dataCols.filter(c => c.javaType === 'String' && !c.isAudit);
    const idPath = pkCols.map(c => `\${row.${c.javaName}}`).join('/');

    const emptyForm = '{ ' + dataCols.filter(c => !c.isAudit).map(c => `${c.javaName}: ''`).join(', ') + ' }';
    const emptySearch = '{ ' + stringCols.map(c => `${c.javaName}: ''`).join(', ') + `, pageNo: 1, pageSize: 10, sortBy: '' }`;

    const searchFieldsArr = stringCols.map(c => `  { name: '${c.javaName}', label: '${c.name}' }`).join(',\n');
    const columnsArr = allItemCols.map(c => `  { key: '${c.javaName}', label: '${c.name}' }`).join(',\n');
    const formFieldsArr = [
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
    <title>${className} CRUD (React CDN)</title>
    <!-- React / ReactDOM / Babel (in-browser JSX 변환) - CDN 단독 동작 -->
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
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
        button.sec { background: #95a5a6; }
        button.suc { background: #27ae60; }
        button.warn { background: #f39c12; }
        button.dng { background: #e74c3c; }
        button.sm { padding: 3px 9px; font-size: 11px; }
        button:disabled { opacity: 0.4; cursor: not-allowed; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #ecf0f1; }
        th { background: #34495e; color: #fff; cursor: pointer; user-select: none; }
        th.sort-asc::after { content: ' ▲'; }
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
    </style>
</head>
<body>
<div id="root"></div>

<script type="text/babel" data-presets="react">
const { useState, useEffect, useMemo, useCallback } = React;

/** REST API base URL */
const API = 'http://localhost:8080/api/${endpoint}';

/** PK 필드명 */
const PK = [${pkCols.map(c => `'${c.javaName}'`).join(', ')}];

/** 검색 영역 입력 필드 */
const SEARCH_FIELDS = [
${searchFieldsArr}
];
/** 그리드 컬럼 (감사 필드 포함) */
const COLUMNS = [
${columnsArr}
];
/** 등록/수정 모달 입력 필드 */
const FORM_FIELDS = [
${formFieldsArr}
];
const EMPTY_FORM   = () => (${emptyForm});
const EMPTY_SEARCH = () => (${emptySearch});

/** 단일 row 의 PK path (예: /id1/id2) */
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

function ${className}Page() {
    const [search, setSearch] = useState(EMPTY_SEARCH);
    const [list,   setList]   = useState([]);
    const [page,   setPage]   = useState({ pageTotalCount: 0, pageNo: 1, pageSize: 10, pageTotalPages: 0 });
    const [modal,  setModal]  = useState({ show: false, mode: 'insert', form: {} });

    /** 페이지 번호 5개 단위 */
    const pageRange = useMemo(() => {
        const total = page.pageTotalPages || 1;
        const block = Math.floor((page.pageNo - 1) / 5);
        const start = block * 5 + 1;
        const r = [];
        for (let i = start; i <= Math.min(start + 4, total); i++) r.push(i);
        return r;
    }, [page]);

    const rowKey = (row) => PK.map(k => row[k]).join('|');

    /** 페이지 목록 조회 */
    const searchPage = useCallback(async (p = 1, override = null) => {
        const s = { ...(override || search), pageNo: p };
        setSearch(s);
        try {
            const params = {};
            Object.entries(s).forEach(([k, v]) => {
                if (v !== '' && v != null) {
                    params[k] = v;
                }
            });
            const qs = new URLSearchParams(params).toString();
            const data = await api(API + '/page-list?' + qs);
            setList(data.pageList || []);
            setPage({
                pageTotalCount: data.pageTotalCount, pageNo: data.pageNo,
                pageSize: data.pageSize, pageTotalPages: data.pageTotalPages
            });
        } catch (e) { alert(e.message); }
    }, [search]);

    useEffect(() => { searchPage(1); /* 최초 1회 */ // eslint-disable-next-line
    }, []);

    /** 검색조건 초기화 */
    const resetSearch = () => { const s = EMPTY_SEARCH(); searchPage(1, s); };

    /** 헤더 클릭 - 정렬 토글 */
    const toggleSort = (key) => {
        const cur = search.sortBy || '';
        const next = cur === key + ' asc' ? key + ' desc'
                    : cur === key + ' desc' ? '' : key + ' asc';
        searchPage(1, { ...search, sortBy: next });
    };
    const sortDir = (key) => {
        const cur = search.sortBy || '';
        return cur === key + ' asc' ? 'sort-asc' : cur === key + ' desc' ? 'sort-desc' : '';
    };

    const openInsert = () => setModal({ show: true, mode: 'insert', form: EMPTY_FORM() });
    const openUpdate = (row) => setModal({ show: true, mode: 'update', form: { ...row } });

    /** 등록/수정 저장 */
    const save = async () => {
        try {
            if (modal.mode === 'insert') {
                await api(API, { method: 'POST', body: JSON.stringify(modal.form) });
            } else {
                await api(API + idPath(modal.form),
                    { method: 'PUT', body: JSON.stringify(modal.form) });
            }
            setModal({ ...modal, show: false });
            searchPage(page.pageNo);
        } catch (e) { alert(e.message); }
    };

    /** 행 삭제 */
    const deleteRow = async (row) => {
        if (!window.confirm('삭제?')) return;
        try {
            await api(API + idPath(row), { method: 'DELETE' });
            searchPage(page.pageNo);
        } catch (e) { alert(e.message); }
    };

    return (
        <div>
            <h1>${className} (React CDN)</h1>

            {/* ========== 검색 영역 ========== */}
            <div className="card">
                {SEARCH_FIELDS.map(f => (
                    <span className="field" key={f.name}>
                        <label>{f.label}</label>
                        <input value={search[f.name] || ''} placeholder={f.label}
                               onChange={e => setSearch({ ...search, [f.name]: e.target.value })} />
                    </span>
                ))}
                <span className="field">
                    <label>페이지크기</label>
                    <select value={search.pageSize}
                            onChange={e => searchPage(1, { ...search, pageSize: Number(e.target.value) })}>
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </span>
                <button onClick={() => searchPage(1)}>검색</button>
                <button className="sec" onClick={resetSearch}>초기화</button>
            </div>

            {/* ========== 목록(그리드) ========== */}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: '#7f8c8d' }}>
                        총 {page.pageTotalCount}건 / {page.pageTotalPages || 0}페이지
                    </span>
                    <button className="suc" onClick={openInsert}>+ 신규등록</button>
                </div>
                <table>
                    <thead>
                        <tr>
                            {COLUMNS.map(c => (
                                <th key={c.key} className={sortDir(c.key)}
                                    onClick={() => toggleSort(c.key)}>{c.label}</th>
                            ))}
                            <th style={{ width: 130 }}>관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!list.length && (
                            <tr><td colSpan={COLUMNS.length + 1} className="empty">데이터 없음</td></tr>
                        )}
                        {list.map(row => (
                            <tr key={rowKey(row)}>
                                {COLUMNS.map(c => (
                                    <td key={c.key}>{row[c.key]}</td>
                                ))}
                                <td className="actions">
                                    <button className="warn sm" onClick={() => openUpdate(row)}>수정</button>
                                    <button className="dng sm" onClick={() => deleteRow(row)}>삭제</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* ========== 페이징 ========== */}
                {page.pageTotalPages > 0 && (
                    <div className="pagination">
                        <button disabled={page.pageNo <= 1} onClick={() => searchPage(1)}>«</button>
                        <button disabled={page.pageNo <= 1} onClick={() => searchPage(page.pageNo - 1)}>‹</button>
                        {pageRange.map(p => (
                            <button key={p} className={p === page.pageNo ? 'active' : ''}
                                    onClick={() => searchPage(p)}>{p}</button>
                        ))}
                        <button disabled={page.pageNo >= page.pageTotalPages} onClick={() => searchPage(page.pageNo + 1)}>›</button>
                        <button disabled={page.pageNo >= page.pageTotalPages} onClick={() => searchPage(page.pageTotalPages)}>»</button>
                    </div>
                )}
            </div>

            {/* ========== 등록/수정 모달 ========== */}
            {modal.show && (
                <div className="modal-overlay"
                     onClick={(e) => { if (e.target === e.currentTarget) setModal({ ...modal, show: false }); }}>
                    <div className="modal">
                        <h3>{modal.mode === 'insert' ? '신규 등록' : '수정'} - ${className}</h3>
                        {FORM_FIELDS.map(f => (
                            <div className="field" key={f.name}>
                                <label>{f.label}{f.required ? ' *' : ''}</label>
                                <input value={modal.form[f.name] || ''}
                                       disabled={modal.mode === 'update' && f.pk}
                                       placeholder={f.required ? '필수' : ''}
                                       onChange={e => setModal({ ...modal, form: { ...modal.form, [f.name]: e.target.value } })} />
                            </div>
                        ))}
                        <div className="modal-btns">
                            <button className="sec" onClick={() => setModal({ ...modal, show: false })}>취소</button>
                            <button onClick={save}>저장</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(<${className}Page />);
</script>
</body>
</html>
`;
}
