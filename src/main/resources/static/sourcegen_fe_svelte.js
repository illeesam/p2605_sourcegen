/* ===== Source Generator : Frontend (Svelte) =====
 * gnSvelteSource (App.svelte) / gnSveltePackageJson / gnSvelteApiJsSource
 * 의존: gnAuditFields() (sourcegen.js)
 *
 * Svelte 는 컴파일러 기반이라 CDN-only 단독 동작 불가.
 * → Vite + svelte 템플릿용 SFC 풀세트로 생성. 사용자가 빌드 후 사용.
 */

// ----- App.svelte -----
function gnSvelteSource(endpoint, className, dataCols, pkCols, nonPkCols, hasAudit) {
    const allItemCols = hasAudit ? [...dataCols, ...gnAuditFields()] : dataCols;
    const stringCols = dataCols.filter(c => c.javaType === 'String' && !c.isAudit);

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

    return `<!-- Svelte SFC (Vite + svelte 환경, ${endpoint}Api.js 와 함께 사용) -->
<script>
  import { onMount } from 'svelte';
  import * as api from './${endpoint}Api.js';

  /** PK 필드명 (rowKey 생성) */
  const PK = [${pkCols.map(c => `'${c.javaName}'`).join(', ')}];

  /** 검색 영역 입력 필드 */
  const searchFields = [
${searchFieldsArr}
  ];
  /** 그리드 컬럼 (감사 필드 포함) */
  const columns = [
${columnsArr}
  ];
  /** 등록/수정 모달 입력 필드 */
  const formFields = [
${formFieldsArr}
  ];

  /** 검색조건 (페이징/정렬 포함) */
  let search = ${emptySearch};
  /** 그리드 행 데이터 */
  let list = [];
  /** 페이징 메타 */
  let page = { pageTotalCount: 0, pageNo: 1, pageSize: 10, pageTotalPages: 0 };
  /** 등록/수정 모달 상태 */
  let modal = { show: false, mode: 'insert', form: {} };

  /** 페이지 번호 5개 단위 */
  $: pageRange = (() => {
    const total = page.pageTotalPages || 1;
    const block = Math.floor((page.pageNo - 1) / 5);
    const start = block * 5 + 1;
    const r = [];
    for (let i = start; i <= Math.min(start + 4, total); i++) r.push(i);
    return r;
  })();

  /** 행 고유키 (PK 조합) */
  function rowKey(row) {
    return PK.map(k => row[k]).join('|');
  }

  /** 페이지 목록 조회 */
  async function searchPage(p = 1) {
    search = { ...search, pageNo: p };
    try {
      const data = await api.selectPageData(search);
      list = data.pageList || [];
      page = data;
    } catch (e) { alert(e.message); }
  }

  onMount(() => searchPage(1));

  /** 검색조건 초기화 */
  function resetSearch() {
    search = ${emptySearch};
    searchPage(1);
  }

  /** 헤더 클릭 → 정렬 토글 (asc → desc → 해제) */
  function toggleSort(key) {
    const cur = search.sortBy || '';
    const next = cur === key + ' asc' ? key + ' desc'
              : cur === key + ' desc' ? '' : key + ' asc';
    search = { ...search, sortBy: next, pageNo: 1 };
    searchPage(1);
  }
  /** 현재 정렬 방향 (asc/desc/'') */
  function sortDir(key) {
    const cur = search.sortBy || '';
    return cur === key + ' asc' ? 'sort-asc' : cur === key + ' desc' ? 'sort-desc' : '';
  }

  /** 신규 등록 모달 오픈 */
  function openInsert() {
    modal = { show: true, mode: 'insert', form: ${emptyForm} };
  }
  /** 수정 모달 오픈 */
  function openUpdate(row) {
    modal = { show: true, mode: 'update', form: { ...row } };
  }

  /** 등록/수정 저장 */
  async function save() {
    try {
      if (modal.mode === 'insert') {
        await api.create(modal.form);
      } else {
        await api.update(modal.form);
      }
      modal = { ...modal, show: false };
      searchPage(page.pageNo);
    } catch (e) { alert(e.message); }
  }

  /** 행 삭제 */
  async function deleteRow(row) {
    if (!confirm('삭제?')) return;
    try {
      await api.remove(row);
      searchPage(page.pageNo);
    } catch (e) { alert(e.message); }
  }
</script>

<div class="${endpoint}-page">
  <h1>${className}</h1>

  <!-- ========== 검색 영역 ========== -->
  <section class="search">
    <!-- 검색 입력 필드 -->
    {#each searchFields as f (f.name)}
      <div class="field">
        <label>{f.label}</label>
        <input bind:value={search[f.name]} />
      </div>
    {/each}
    <!-- 페이지 크기 (변경 시 즉시 1페이지 재조회) -->
    <div class="field">
      <label>크기</label>
      <select bind:value={search.pageSize} on:change={() => searchPage(1)}>
        <option value={5}>5</option>
        <option value={10}>10</option>
        <option value={20}>20</option>
        <option value={50}>50</option>
        <option value={100}>100</option>
      </select>
    </div>
    <button on:click={() => searchPage(1)}>검색</button>
    <button on:click={resetSearch}>초기화</button>
    <button on:click={openInsert}>+ 신규</button>
  </section>

  <!-- ========== 목록(그리드) 영역 — 헤더 클릭 정렬 ========== -->
  <table>
    <thead>
      <tr>
        {#each columns as c (c.key)}
          <th class={sortDir(c.key)} on:click={() => toggleSort(c.key)}>{c.label}</th>
        {/each}
        <th>관리</th>
      </tr>
    </thead>
    <tbody>
      {#if !list.length}
        <tr><td colspan={columns.length + 1}>데이터 없음</td></tr>
      {/if}
      {#each list as row (rowKey(row))}
        <tr>
          {#each columns as c (c.key)}
            <td>{row[c.key] ?? ''}</td>
          {/each}
          <td>
            <button on:click={() => openUpdate(row)}>수정</button>
            <button on:click={() => deleteRow(row)}>삭제</button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>

  <!-- ========== 페이징 컨트롤 ========== -->
  {#if page.pageTotalPages > 0}
    <nav class="pagination">
      <button disabled={page.pageNo <= 1} on:click={() => searchPage(1)}>«</button>
      <button disabled={page.pageNo <= 1} on:click={() => searchPage(page.pageNo - 1)}>‹</button>
      {#each pageRange as p}
        <button class:active={p === page.pageNo} on:click={() => searchPage(p)}>{p}</button>
      {/each}
      <button disabled={page.pageNo >= page.pageTotalPages} on:click={() => searchPage(page.pageNo + 1)}>›</button>
      <button disabled={page.pageNo >= page.pageTotalPages} on:click={() => searchPage(page.pageTotalPages)}>»</button>
    </nav>
  {/if}

  <!-- ========== 등록/수정 모달 ========== -->
  {#if modal.show}
    <div class="modal-overlay"
         on:click|self={() => (modal = { ...modal, show: false })}>
      <div class="modal">
        <h3>{modal.mode === 'insert' ? '신규' : '수정'} - ${className}</h3>
        <!-- 입력 필드 (PK는 수정 시 disabled) -->
        {#each formFields as f (f.name)}
          <div class="field">
            <label>{f.label}{f.required ? ' *' : ''}</label>
            <input bind:value={modal.form[f.name]}
                   disabled={modal.mode === 'update' && f.pk} />
          </div>
        {/each}
        <div class="actions">
          <button on:click={() => (modal = { ...modal, show: false })}>취소</button>
          <button on:click={save}>저장</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .${endpoint}-page { padding: 20px; font-family: sans-serif; }
  .search { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
  .field { display: flex; gap: 6px; align-items: center; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #34495e; color: #fff; padding: 8px; text-align: left; cursor: pointer; user-select: none; }
  th.sort-asc::after  { content: ' ▲'; }
  th.sort-desc::after { content: ' ▼'; }
  td { padding: 6px 8px; border-bottom: 1px solid #eee; }
  .pagination { margin-top: 12px; display: flex; gap: 4px; justify-content: center; }
  .pagination button.active { background: #4f7df3; color: #fff; }
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5);
    display: flex; align-items: center; justify-content: center; z-index: 1000; }
  .modal { background: #fff; padding: 24px; border-radius: 8px; min-width: 400px; }
  .modal .field { display: block; margin-bottom: 10px; }
  .modal .field input { width: 100%; padding: 6px; }
  .actions { display: flex; justify-content: flex-end; gap: 6px; margin-top: 14px; }
</style>
`;
}

// ----- main.js (Vite 진입점) -----
function gnSvelteMainJsSource(className) {
    return `// Vite 진입점 — App.svelte 를 #app 에 마운트
import App from './App.svelte';

const app = new App({
  target: document.getElementById('app'),
});

export default app;
`;
}

// ----- index.html (Vite root) -----
function gnSvelteIndexHtmlSource(className) {
    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>${className} (Svelte)</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
`;
}

// ----- package.json -----
function gnSveltePackageJson(endpoint) {
    return `{
  "name": "${endpoint}-svelte",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev":     "vite",
    "build":   "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^3.1.0",
    "svelte": "^4.2.0",
    "vite":   "^5.2.0"
  }
}
`;
}

// ----- vite.config.js -----
function gnSvelteViteConfigSource() {
    return `import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
});
`;
}

// ----- API 모듈 (Vue3 SFC / React 와 동일 구조) -----
function gnSvelteApiJsSource(endpoint) {
    return `// ${endpoint} REST API 호출 (Svelte 전용)

/** REST API base URL */
const BASE = 'http://localhost:8080/api/${endpoint}';

/** 공통 fetch wrapper */
async function api(url, opts = {}) {
    const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...opts,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
    }
    if (res.status === 204) {
        return null;
    }
    return res.json();
}

/** Query string 빌드 (빈값 제외) */
function buildQs(obj) {
    const params = {};
    Object.entries(obj).forEach(([k, v]) => {
        if (v !== '' && v != null) {
            params[k] = v;
        }
    });
    return new URLSearchParams(params).toString();
}

/** PK 경로 빌드 (/exam1Id/exam2Id/...) */
function idPath(row) {
    const keys = Object.keys(row).filter(k => /^exam[1-9]Id$/.test(k));
    return '/' + keys.map(k => row[k]).join('/');
}

/** 단건 조회 */
export const selectOne   = (row) => api(BASE + idPath(row));
/** 전체 목록 */
export const selectList  = (search) => api(\`\${BASE}/list?\${buildQs(search)}\`);
/** 페이지 목록 */
export const selectPageData  = (search) => api(\`\${BASE}/page-list?\${buildQs(search)}\`);
/** 등록 */
export const create     = (form) => api(BASE, { method: 'POST', body: JSON.stringify(form) });
/** 수정 (전체 교체) */
export const update     = (form) => api(BASE + idPath(form), { method: 'PUT', body: JSON.stringify(form) });
/** 부분 수정 (PATCH - null 아닌 필드만) */
export const patch      = (form) => api(BASE + idPath(form), { method: 'PATCH', body: JSON.stringify(form) });
/** 삭제 */
export const remove     = (row)  => api(BASE + idPath(row),  { method: 'DELETE' });
/** 단건 일괄 저장 (rowStatus = I/U/D) */
export const saveOne    = (form) => api(\`\${BASE}/save-one\`,  { method: 'POST', body: JSON.stringify(form) });
/** 목록 일괄 저장 (D → U → I) */
export const saveList   = (rows) => api(\`\${BASE}/save-list\`, { method: 'POST', body: JSON.stringify(rows) });
`;
}
