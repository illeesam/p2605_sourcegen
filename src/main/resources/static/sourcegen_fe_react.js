/* ===== Source Generator : Frontend (React SFC/JSX) =====
 * gnReactSource — Vite/CRA 환경용 .jsx 함수형 컴포넌트 + Api.js
 * 의존: gnAuditFields() (sourcegen.js)
 */

function gnReactSource(endpoint, className, dataCols, pkCols, nonPkCols, hasAudit) {
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

    return `// React 함수형 컴포넌트 (${endpoint}Api.js 와 함께 사용)
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as api from './${endpoint}Api.js';

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
/** 모달 폼 초기값 팩토리 */
const EMPTY_FORM = () => (${emptyForm});
/** 검색조건 초기값 팩토리 */
const EMPTY_SEARCH = () => (${emptySearch});

export default function ${className}Page() {
    /** 검색조건 (페이징/정렬 포함) */
    const [search, setSearch] = useState(EMPTY_SEARCH);
    /** 그리드 행 데이터 */
    const [list, setList] = useState([]);
    /** 페이징 메타 */
    const [page, setPage] = useState({ pageTotalCount: 0, pageNo: 1, pageSize: 10, pageTotalPages: 0 });
    /** 등록/수정 모달 상태 */
    const [modal, setModal] = useState({ show: false, mode: 'insert', form: {} });

    /** 페이지 번호 5개 단위 */
    const pageRange = useMemo(() => {
        const total = page.pageTotalPages || 1;
        const block = Math.floor((page.pageNo - 1) / 5);
        const start = block * 5 + 1;
        const r = [];
        for (let i = start; i <= Math.min(start + 4, total); i++) r.push(i);
        return r;
    }, [page]);

    /** 행 고유키 (PK 조합) */
    const rowKey = (row) => PK.map(k => row[k]).join('|');

    /** 페이지 목록 조회 */
    const searchPage = useCallback(async (p = 1) => {
        const next = { ...search, pageNo: p };
        setSearch(next);
        try {
            const data = await api.selectPageData(next);
            setList(data.pageList || []);
            setPage(data);
        } catch (e) { alert(e.message); }
    }, [search]);

    useEffect(() => { searchPage(1); /* 최초 1회 */ // eslint-disable-next-line
    }, []);

    /** 검색조건 초기화 */
    const resetSearch = () => { setSearch(EMPTY_SEARCH()); setTimeout(() => searchPage(1), 0); };

    /** 헤더 클릭 - 정렬 토글 */
    const toggleSort = (key) => {
        const cur = search.sortBy || '';
        const next = cur === key + ' asc' ? key + ' desc'
            : cur === key + ' desc' ? '' : key + ' asc';
        setSearch({ ...search, sortBy: next, pageNo: 1 });
        setTimeout(() => searchPage(1), 0);
    };
    /** 현재 정렬 방향 */
    const sortDir = (key) => {
        const cur = search.sortBy || '';
        return cur === key + ' asc' ? 'sort-asc' : cur === key + ' desc' ? 'sort-desc' : '';
    };

    /** 신규 등록 모달 오픈 */
    const openInsert = () => setModal({ show: true, mode: 'insert', form: EMPTY_FORM() });
    /** 수정 모달 오픈 */
    const openUpdate = (row) => setModal({ show: true, mode: 'update', form: { ...row } });

    /** 등록/수정 저장 */
    const save = async () => {
        try {
            if (modal.mode === 'insert') {
                await api.create(modal.form);
            } else {
                await api.update(modal.form);
            }
            setModal({ ...modal, show: false });
            searchPage(page.pageNo);
        } catch (e) { alert(e.message); }
    };

    /** 행 삭제 */
    const deleteRow = async (row) => {
        if (!window.confirm('삭제?')) return;
        try {
            await api.remove(row);
            searchPage(page.pageNo);
        } catch (e) { alert(e.message); }
    };

    return (
        <div className="${endpoint}-page" style={{ padding: 20, fontFamily: 'sans-serif' }}>
            <h1>${className}</h1>

            {/* ========== 검색 영역 ========== */}
            <section style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                {/* 검색 입력 필드 */}
                {SEARCH_FIELDS.map(f => (
                    <label key={f.name}>
                        {f.label}
                        <input value={search[f.name] || ''}
                               onChange={e => setSearch({ ...search, [f.name]: e.target.value })} />
                    </label>
                ))}
                {/* 페이지 크기 (변경 시 즉시 1페이지 재조회) */}
                <label>
                    크기
                    <select value={search.pageSize}
                            onChange={e => {
                                const next = { ...search, pageSize: Number(e.target.value), pageNo: 1 };
                                setSearch(next);
                                setTimeout(() => searchPage(1), 0);
                            }}>
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </label>
                <button onClick={() => searchPage(1)}>검색</button>
                <button onClick={resetSearch}>초기화</button>
                <button onClick={openInsert}>+ 신규</button>
            </section>

            {/* ========== 목록(그리드) 영역 - 헤더 클릭 정렬 ========== */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr>
                        {COLUMNS.map(c => (
                            <th key={c.key} className={sortDir(c.key)}
                                onClick={() => toggleSort(c.key)}
                                style={{ background: '#34495e', color: '#fff',
                                         padding: 8, cursor: 'pointer', textAlign: 'left' }}>
                                {c.label}{sortDir(c.key) === 'sort-asc' ? ' ▲'
                                    : sortDir(c.key) === 'sort-desc' ? ' ▼' : ''}
                            </th>
                        ))}
                        <th style={{ background: '#34495e', color: '#fff', padding: 8 }}>관리</th>
                    </tr>
                </thead>
                <tbody>
                    {!list.length && (
                        <tr><td colSpan={COLUMNS.length + 1} style={{ padding: 20, textAlign: 'center' }}>데이터 없음</td></tr>
                    )}
                    {list.map(row => (
                        <tr key={rowKey(row)}>
                            {COLUMNS.map(c => (
                                <td key={c.key} style={{ padding: 6, borderBottom: '1px solid #eee' }}>{row[c.key]}</td>
                            ))}
                            <td>
                                <button onClick={() => openUpdate(row)}>수정</button>
                                <button onClick={() => deleteRow(row)}>삭제</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* ========== 페이징 컨트롤 ========== */}
            {page.pageTotalPages > 0 && (
                <nav style={{ marginTop: 12, display: 'flex', gap: 4, justifyContent: 'center' }}>
                    <button disabled={page.pageNo <= 1} onClick={() => searchPage(1)}>«</button>
                    <button disabled={page.pageNo <= 1} onClick={() => searchPage(page.pageNo - 1)}>‹</button>
                    {pageRange.map(p => (
                        <button key={p}
                                style={{ background: p === page.pageNo ? '#4f7df3' : '', color: p === page.pageNo ? '#fff' : '' }}
                                onClick={() => searchPage(p)}>{p}</button>
                    ))}
                    <button disabled={page.pageNo >= page.pageTotalPages} onClick={() => searchPage(page.pageNo + 1)}>›</button>
                    <button disabled={page.pageNo >= page.pageTotalPages} onClick={() => searchPage(page.pageTotalPages)}>»</button>
                </nav>
            )}

            {/* ========== 등록/수정 모달 ========== */}
            {modal.show && (
                <div onClick={(e) => { if (e.target === e.currentTarget) setModal({ ...modal, show: false }); }}
                     style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', padding: 24, borderRadius: 8, minWidth: 400 }}>
                        <h3>{modal.mode === 'insert' ? '신규' : '수정'} - ${className}</h3>
                        {/* 입력 필드 (PK는 수정 시 disabled) */}
                        {FORM_FIELDS.map(f => (
                            <div key={f.name} style={{ marginBottom: 10 }}>
                                <label>{f.label}{f.required ? ' *' : ''}</label>
                                <input value={modal.form[f.name] || ''}
                                       disabled={modal.mode === 'update' && f.pk}
                                       onChange={e => setModal({ ...modal, form: { ...modal.form, [f.name]: e.target.value } })}
                                       style={{ width: '100%', padding: 6 }} />
                            </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 14 }}>
                            <button onClick={() => setModal({ ...modal, show: false })}>취소</button>
                            <button onClick={save}>저장</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
`;
}
