/* ===== 공통 JS ===== */
const API_BASE = 'http://localhost:8080/api';

/** 공통 fetch wrapper */
async function apiCall(url, opts = {}) {
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || res.statusText);
    }
    if (res.status === 204) return null;
    return res.json();
}

function makePageRange(cur, total) {
    const block = Math.floor((cur - 1) / 5);
    const start = block * 5 + 1;
    const end = Math.min(start + 4, total || 1);
    const r = [];
    for (let i = start; i <= end; i++) r.push(i);
    return r;
}

/** reactive 객체 통째 교체 (속성 reset + Object.assign) */
function setObj(target, src) {
    Object.keys(target).forEach(k => delete target[k]);
    if (src) Object.assign(target, src);
}
/** reactive 배열 통째 교체 (length=0 + push) */
function setArr(target, src) {
    target.length = 0;
    if (src && src.length) target.push(...src);
}

/**
 * Exam CRUD Vue 앱 팩토리
 * meta = { endpoint, pk, searchFields, columns, formFields, emptyForm, emptySearch, idPath }
 */
function createExamApp(meta) {
    const { createApp, ref, reactive, computed, onMounted } = Vue;

    return createApp({
        setup() {
            const search = reactive(meta.emptySearch());
            const list = reactive([]);
            const page = reactive({ pageTotalCount: 0, pageNo: 1, pageSize: 10, pageTotalPages: 0 });
            const modal = reactive({ show: false, mode: 'insert', form: {} });
            const toast = ref(null);

            const debug = reactive({
                method: '', url: '', params: null, body: null,
                status: null, response: null, durationMs: null, error: null,
            });

            function notify(type, text) {
                toast.value = { type, text };
                setTimeout(() => toast.value = null, 2500);
            }

            const pageRange = computed(() =>
                makePageRange(page.pageNo, page.pageTotalPages)
            );

            function rowKey(row) {
                return meta.pk.map(k => row[k]).join('|');
            }

            async function trackedCall(method, url, params, body) {
                setObj(debug, { method, url, params, body, status: null, response: null, durationMs: null, error: null });
                const start = performance.now();
                try {
                    const opts = { method };
                    if (body !== undefined && body !== null) {
                        opts.headers = { 'Content-Type': 'application/json' };
                        opts.body = JSON.stringify(body);
                    }
                    const res = await fetch(url, opts);
                    debug.status = `${res.status} ${res.statusText}`;
                    debug.durationMs = Math.round(performance.now() - start);
                    if (!res.ok) {
                        const errBody = await res.json().catch(() => ({ error: res.statusText }));
                        debug.response = errBody;
                        debug.error = errBody.error || res.statusText;
                        throw new Error(debug.error);
                    }
                    if (res.status === 204) { debug.response = '(no content)'; return null; }
                    const data = await res.json();
                    debug.response = data;
                    return data;
                } catch (e) {
                    if (debug.durationMs == null) debug.durationMs = Math.round(performance.now() - start);
                    if (!debug.error) debug.error = e.message;
                    throw e;
                }
            }

            async function searchPage(p = 1) {
                search.pageNo = p;
                try {
                    const params = {};
                    Object.entries(search).forEach(([k, v]) => {
                        if (v !== '' && v != null) params[k] = v;
                    });
                    const qs = new URLSearchParams(params).toString();
                    const data = await trackedCall(
                        'GET', `${API_BASE}/${meta.endpoint}/page-list?${qs}`, params, null
                    );
                    setArr(list, data.pageList || []);
                    setObj(page, {
                        pageTotalCount: data.pageTotalCount, pageNo: data.pageNo,
                        pageSize: data.pageSize, pageTotalPages: data.pageTotalPages
                    });
                } catch (e) {
                    notify('err', e.message);
                }
            }

            function resetSearch() {
                setObj(search, meta.emptySearch());
                searchPage(1);
            }

            /** 헤더 클릭 → asc → desc → 해제 사이클. sortBy 형식: "컬럼 asc" / "컬럼 desc" / "" */
            function toggleSort(colKey) {
                const cur = search.sortBy || '';
                let next;
                if (cur === colKey + ' asc')       next = colKey + ' desc';
                else if (cur === colKey + ' desc') next = '';
                else                               next = colKey + ' asc';
                search.sortBy = next;
                searchPage(1);
            }

            /** 헤더 표시용: 현재 정렬 방향 ('asc' | 'desc' | '') */
            function sortDir(colKey) {
                const cur = search.sortBy || '';
                if (cur === colKey + ' asc')  return 'asc';
                if (cur === colKey + ' desc') return 'desc';
                return '';
            }

            function openInsert() {
                setObj(modal, { show: true, mode: 'insert', form: meta.emptyForm() });
            }
            function openInsertWith(prefill) {
                setObj(modal, { show: true, mode: 'insert', form: { ...meta.emptyForm(), ...prefill } });
            }
            function openUpdate(row) {
                setObj(modal, { show: true, mode: 'update', form: { ...row } });
            }

            async function saveModal() {
                try {
                    if (modal.mode === 'insert') {
                        await trackedCall('POST', `${API_BASE}/${meta.endpoint}`, null, modal.form);
                        notify('ok', '등록 완료');
                    } else {
                        const path = meta.idPath(modal.form);
                        await trackedCall('PUT', `${API_BASE}/${meta.endpoint}${path}`, null, modal.form);
                        notify('ok', '수정 완료');
                    }
                    modal.show = false;
                    searchPage(page.pageNo);
                } catch (e) { notify('err', e.message); }
            }

            async function deleteRow(row) {
                const ids = meta.pk.map(k => row[k]).join(' / ');
                if (!confirm(`삭제하시겠습니까?\n[${ids}]`)) return;
                try {
                    const path = meta.idPath(row);
                    await trackedCall('DELETE', `${API_BASE}/${meta.endpoint}${path}`, null, null);
                    notify('ok', '삭제 완료');
                    searchPage(page.pageNo);
                } catch (e) { notify('err', e.message); }
            }

            function fmt(v) {
                if (v === null || v === undefined) return '(없음)';
                if (typeof v === 'string') return v;
                try { return JSON.stringify(v, null, 2); } catch { return String(v); }
            }

            onMounted(() => searchPage(1));

            return {
                meta, search, list, page, modal, toast, pageRange, debug,
                rowKey, searchPage, resetSearch,
                toggleSort, sortDir,
                openInsert, openInsertWith, openUpdate, saveModal, deleteRow, fmt
            };
        }
    });
}
