/* ===== Source Generator : Frontend (Vue3 SFC) =====
 * gnVue3Source — Vite/Webpack 환경용 .vue SFC
 * 의존: gnAuditFields() (sourcegen.js)
 */

function gnVue3Source(endpoint, className, dataCols, pkCols, nonPkCols, hasAudit) {
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

    return `<!-- Vue3 SFC (Vite/Webpack 환경, ${endpoint}Api.js 와 함께 사용) -->
<script setup>
import { reactive, computed, onMounted } from 'vue';
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
const search = reactive(${emptySearch});
/** 그리드 행 데이터 */
const list = reactive([]);
/** 페이징 메타 */
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

/** 행 고유키 (PK 조합) */
const rowKey = (row) => PK.map(k => row[k]).join('|');

/** 페이지 목록 조회 */
async function searchPage(p = 1) {
  search.pageNo = p;
  try {
    const data = await api.selectPageData(search);
    setArr(list, data.pageList || []);
    setObj(page, data);
  } catch (e) { alert(e.message); }
}

/** 검색조건 초기화 */
function resetSearch() {
  setObj(search, ${emptySearch});
  searchPage(1);
}

/** 헤더 클릭 - 정렬 토글 */
function toggleSort(key) {
  const cur = search.sortBy || '';
  search.sortBy = cur === key + ' asc' ? key + ' desc'
    : cur === key + ' desc' ? '' : key + ' asc';
  searchPage(1);
}
/** 현재 정렬 방향 */
function sortDir(key) {
  const cur = search.sortBy || '';
  return cur === key + ' asc' ? 'sort-asc' : cur === key + ' desc' ? 'sort-desc' : '';
}

/** 신규 등록 모달 오픈 */
function openInsert() { setObj(modal, { show: true, mode: 'insert', form: ${emptyForm} }); }
/** 수정 모달 오픈 */
function openUpdate(row) { setObj(modal, { show: true, mode: 'update', form: { ...row } }); }

/** 등록/수정 저장 */
async function save() {
  try {
    if (modal.mode === 'insert') {
      await api.create(modal.form);
    } else {
      await api.update(modal.form);
    }
    modal.show = false;
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

onMounted(() => searchPage(1));
</script>

<template>
  <div class="${endpoint}-page">
    <h1>${className}</h1>

    <!-- ========== 검색 영역 ========== -->
    <section class="search">
      <!-- 검색 입력 필드 -->
      <div v-for="f in searchFields" :key="f.name" class="field">
        <label>{{ f.label }}</label>
        <input v-model="search[f.name]" />
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
      <button @click="searchPage(1)">검색</button>
      <button @click="resetSearch">초기화</button>
      <button @click="openInsert">+ 신규</button>
    </section>

    <!-- ========== 목록(그리드) 영역 ========== -->
    <!-- 헤더 클릭 시 정렬 (asc → desc → 해제) -->
    <table>
      <thead>
        <tr>
          <th v-for="c in columns" :key="c.key"
              :class="sortDir(c.key)"
              @click="toggleSort(c.key)">
            {{ c.label }}
          </th>
          <th>관리</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!list.length"><td :colspan="columns.length + 1">데이터 없음</td></tr>
        <tr v-for="row in list" :key="rowKey(row)">
          <td v-for="c in columns" :key="c.key">{{ row[c.key] }}</td>
          <td>
            <button @click="openUpdate(row)">수정</button>
            <button @click="deleteRow(row)">삭제</button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- ========== 페이징 컨트롤 ========== -->
    <nav class="pagination" v-if="page.pageTotalPages > 0">
      <button :disabled="page.pageNo <= 1" @click="searchPage(1)">«</button>
      <button :disabled="page.pageNo <= 1" @click="searchPage(page.pageNo - 1)">‹</button>
      <button v-for="p in pageRange" :key="p"
              :class="{ active: p === page.pageNo }"
              @click="searchPage(p)">{{ p }}</button>
      <button :disabled="page.pageNo >= page.pageTotalPages" @click="searchPage(page.pageNo + 1)">›</button>
      <button :disabled="page.pageNo >= page.pageTotalPages" @click="searchPage(page.pageTotalPages)">»</button>
    </nav>

    <!-- ========== 등록/수정 모달 ========== -->
    <div v-if="modal.show" class="modal-overlay" @click.self="modal.show = false">
      <div class="modal">
        <h3>{{ modal.mode === 'insert' ? '신규' : '수정' }} - ${className}</h3>
        <!-- 입력 필드 (PK는 수정 시 disabled) -->
        <div v-for="f in formFields" :key="f.name" class="field">
          <label>{{ f.label }}{{ f.required ? ' *' : '' }}</label>
          <input v-model="modal.form[f.name]"
                 :disabled="modal.mode === 'update' && f.pk" />
        </div>
        <div class="actions">
          <button @click="modal.show = false">취소</button>
          <button @click="save">저장</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.${endpoint}-page { padding: 20px; font-family: sans-serif; }
.search { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
.field { display: flex; gap: 6px; align-items: center; }
table { width: 100%; border-collapse: collapse; }
th { background: #34495e; color: #fff; padding: 8px; text-align: left; cursor: pointer; }
th.sort-asc::after { content: ' ▲'; }
th.sort-desc::after { content: ' ▼'; }
td { padding: 6px 8px; border-bottom: 1px solid #eee; }
.pagination { margin-top: 12px; display: flex; gap: 4px; justify-content: center; }
.pagination button.active { background: #4f7df3; color: #fff; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center; }
.modal { background: #fff; padding: 24px; border-radius: 8px; min-width: 400px; }
.modal .field { display: block; margin-bottom: 10px; }
.modal .field input { width: 100%; padding: 6px; }
.actions { display: flex; justify-content: flex-end; gap: 6px; margin-top: 14px; }
</style>
`;
}
