/* ===== Source Generator : Frontend (PyScript CDN — Python in browser) =====
 * gnPyScriptCdnStandaloneSource — 단일 HTML, PyScript CDN 으로 파이썬 직접 실행.
 *
 * 동작 방식: <script type="py"> 안에서 fetch / DOM 조작 / 이벤트 처리.
 * 첫 로딩 5~10초 (Pyodide ~10MB 다운로드) — 데모/학습용.
 *
 * 의존: gnAuditFields() (sourcegen.js)
 */

function gnPyScriptCdnStandaloneSource(endpoint, className, dataCols, pkCols, nonPkCols, hasAudit) {
    const allItemCols = hasAudit ? [...dataCols, ...gnAuditFields()] : dataCols;
    const stringCols = dataCols.filter(c => c.javaType === 'String' && !c.isAudit);

    const pkList = pkCols.map(c => `'${c.javaName}'`).join(', ');
    const searchFieldsPy = stringCols.map(c =>
        `    {'name': '${c.javaName}', 'label': '${c.name}'}`).join(',\n');
    const columnsPy = allItemCols.map(c =>
        `    {'key': '${c.javaName}', 'label': '${c.name}'}`).join(',\n');
    const formFieldsPy = [
        ...pkCols.map(c => `    {'name': '${c.javaName}', 'label': '${c.name}', 'required': True, 'pk': True}`),
        ...nonPkCols.filter(c => !c.isAudit).map(c => {
            const r = !c.nullable;
            return `    {'name': '${c.javaName}', 'label': '${c.name}'${r ? ", 'required': True" : ''}}`;
        })
    ].join(',\n');
    const emptyFormPy = '{' + dataCols.filter(c => !c.isAudit).map(c => `'${c.javaName}': ''`).join(', ') + '}';
    const emptySearchPy = '{' + stringCols.map(c => `'${c.javaName}': ''`).join(', ') +
        ", 'pageNo': 1, 'pageSize': 10, 'sortBy': ''}";

    return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>${className} CRUD (PyScript CDN)</title>
    <!-- PyScript CDN — 첫 로딩 5~10초 (Pyodide ~10MB) -->
    <link rel="stylesheet" href="https://pyscript.net/releases/2024.11.1/core.css">
    <script type="module" src="https://pyscript.net/releases/2024.11.1/core.js"></script>
    <style>
        * { box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f5f7fa; color: #2c3e50; }
        h1 { margin: 0 0 16px; font-size: 20px; }
        .loading { padding: 30px; text-align: center; color: #95a5a6;
            border: 1px dashed #d0d7de; border-radius: 6px; background: #fff; }
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
        .py-banner { background: #fef9c3; padding: 8px 12px; border-radius: 4px;
            font-size: 12px; color: #854d0e; margin-bottom: 12px; }
    </style>
</head>
<body>
<div class="py-banner">⚠ PyScript 첫 로딩에 5~10초 걸립니다 (Pyodide ~10MB 다운로드)</div>
<div id="app"><div class="loading">PyScript 로딩 중…</div></div>

<script type="py">
"""
PyScript CDN — 단일 HTML 안에서 파이썬으로 CRUD 화면 작성.
브라우저 fetch 를 pyscript.fetch 로 호출.
"""
import json
from pyscript import document, fetch
from pyscript.web import page  # 일부 헬퍼

API = 'http://localhost:8080/api/${endpoint}'  # FastAPI 사용 시 /api/python/${endpoint}

PK = [${pkList}]

SEARCH_FIELDS = [
${searchFieldsPy}
]
COLUMNS = [
${columnsPy}
]
FORM_FIELDS = [
${formFieldsPy}
]

def empty_form():
    return ${emptyFormPy}

def empty_search():
    return ${emptySearchPy}

# === 상태 (전역 dict — Python 진영의 단순 reactive 대용) ===
state = {
    'search': empty_search(),
    'list':   [],
    'page':   {'pageTotalCount': 0, 'pageNo': 1, 'pageSize': 10, 'pageTotalPages': 0},
    'modal':  {'show': False, 'mode': 'insert', 'form': {}}
}

# ============================================================
# Helpers
# ============================================================
def id_path(row):
    return '/' + '/'.join(str(row.get(k, '')) for k in PK)

def row_key(row):
    return '|'.join(str(row.get(k, '')) for k in PK)

def page_range():
    total = state['page']['pageTotalPages'] or 1
    cur = state['page']['pageNo']
    block = (cur - 1) // 5
    start = block * 5 + 1
    return list(range(start, min(start + 5, total + 1)))

def sort_dir(key):
    cur = state['search'].get('sortBy') or ''
    if cur == key + ' asc':  return 'sort-asc'
    if cur == key + ' desc': return 'sort-desc'
    return ''

def html_escape(s):
    if s is None:
        return ''
    s = str(s)
    return (s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
             .replace('"', '&quot;').replace("'", '&#39;'))

# ============================================================
# API
# ============================================================
async def api_call(url, **kwargs):
    """공통 fetch wrapper"""
    method = kwargs.get('method', 'GET')
    body = kwargs.get('body')
    headers = {'Content-Type': 'application/json'}
    if body is not None:
        res = await fetch(url, method=method, headers=headers, body=body)
    else:
        res = await fetch(url, method=method, headers=headers)
    if not res.ok:
        try:
            err = await res.json()
        except Exception:
            err = {'error': res.statusText}
        raise Exception(err.get('error', res.statusText))
    if res.status == 204:
        return None
    return await res.json()

async def search_page(p=1):
    state['search']['pageNo'] = p
    try:
        params = []
        for k, v in state['search'].items():
            if v != '' and v is not None:
                params.append(f"{k}={v}")
        qs = '&'.join(params)
        data = await api_call(f"{API}/page-list?{qs}")
        state['list'] = data.get('pageList', []) or []
        state['page'] = {
            'pageTotalCount': data.get('pageTotalCount', 0),
            'pageNo': data.get('pageNo', p),
            'pageSize': data.get('pageSize', 10),
            'pageTotalPages': data.get('pageTotalPages', 0),
        }
        render()
    except Exception as e:
        from js import alert as js_alert
        js_alert(str(e))

async def reset_search():
    state['search'] = empty_search()
    await search_page(1)

async def toggle_sort(key):
    cur = state['search'].get('sortBy') or ''
    if cur == key + ' asc':
        state['search']['sortBy'] = key + ' desc'
    elif cur == key + ' desc':
        state['search']['sortBy'] = ''
    else:
        state['search']['sortBy'] = key + ' asc'
    await search_page(1)

def open_insert():
    state['modal'] = {'show': True, 'mode': 'insert', 'form': empty_form()}
    render()

def open_update(row):
    state['modal'] = {'show': True, 'mode': 'update', 'form': dict(row)}
    render()

def close_modal():
    state['modal']['show'] = False
    render()

async def save():
    try:
        if state['modal']['mode'] == 'insert':
            await api_call(API, method='POST', body=json.dumps(state['modal']['form']))
        else:
            url = API + id_path(state['modal']['form'])
            await api_call(url, method='PUT', body=json.dumps(state['modal']['form']))
        state['modal']['show'] = False
        await search_page(state['page']['pageNo'])
    except Exception as e:
        from js import alert as js_alert
        js_alert(str(e))

async def delete_row(row):
    from js import confirm
    if not confirm('삭제?'):
        return
    try:
        await api_call(API + id_path(row), method='DELETE')
        await search_page(state['page']['pageNo'])
    except Exception as e:
        from js import alert as js_alert
        js_alert(str(e))

# ============================================================
# Render — innerHTML 한방 갱신
# ============================================================
def search_section_html():
    fields = ''
    for f in SEARCH_FIELDS:
        v = html_escape(state['search'].get(f['name'], ''))
        fields += (f'<span class="field"><label>{f["label"]}</label>'
                   f'<input data-bind="search.{f["name"]}" value="{v}" placeholder="{f["label"]}">'
                   '</span>')
    options = ''.join(
        f'<option value="{n}"{" selected" if state["search"]["pageSize"] == n else ""}>{n}</option>'
        for n in [5, 10, 20, 50, 100]
    )
    return ('<div class="card">' + fields +
            '<span class="field"><label>페이지크기</label>'
            f'<select data-bind="search.pageSize" data-search-after="1">{options}</select></span>'
            '<button data-action="searchPage:1">검색</button> '
            '<button class="sec" data-action="resetSearch">초기화</button>'
            '</div>')

def list_section_html():
    head = '<thead><tr>'
    for c in COLUMNS:
        head += f'<th class="{sort_dir(c["key"])}" data-action="toggleSort:{c["key"]}">{c["label"]}</th>'
    head += '<th style="width:130px">관리</th></tr></thead>'

    if state['list']:
        body = ''
        for row in state['list']:
            rk = html_escape(row_key(row))
            tds = ''.join(f'<td>{html_escape(row.get(c["key"]))}</td>' for c in COLUMNS)
            body += (f'<tr data-row-key="{rk}">{tds}'
                     f'<td class="actions">'
                     f'<button class="warn sm" data-action="openUpdate:{rk}">수정</button>'
                     f'<button class="dng sm"  data-action="deleteRow:{rk}">삭제</button>'
                     f'</td></tr>')
    else:
        body = f'<tr><td colspan="{len(COLUMNS) + 1}" class="empty">데이터 없음</td></tr>'

    pag = ''
    if state['page']['pageTotalPages'] > 0:
        cur = state['page']['pageNo']
        total_p = state['page']['pageTotalPages']
        btns = ''
        btns += f'<button data-action="searchPage:1" {"disabled" if cur <= 1 else ""}>«</button>'
        btns += f'<button data-action="searchPage:{cur-1}" {"disabled" if cur <= 1 else ""}>‹</button>'
        for p in page_range():
            cls = 'active' if p == cur else ''
            btns += f'<button class="{cls}" data-action="searchPage:{p}">{p}</button>'
        btns += f'<button data-action="searchPage:{cur+1}" {"disabled" if cur >= total_p else ""}>›</button>'
        btns += f'<button data-action="searchPage:{total_p}" {"disabled" if cur >= total_p else ""}>»</button>'
        pag = f'<div class="pagination">{btns}</div>'

    return ('<div class="card">'
            '<div style="display:flex;justify-content:space-between;margin-bottom:8px;">'
            f'<span style="font-size:12px;color:#7f8c8d;">총 {state["page"]["pageTotalCount"]}건 / '
            f'{state["page"]["pageTotalPages"] or 0}페이지</span>'
            '<button class="suc" data-action="openInsert">+ 신규등록</button>'
            '</div>'
            f'<table>{head}<tbody>{body}</tbody></table>'
            f'{pag}</div>')

def modal_section_html():
    if not state['modal']['show']:
        return ''
    inputs = ''
    for f in FORM_FIELDS:
        disabled = 'disabled' if (state['modal']['mode'] == 'update' and f.get('pk')) else ''
        v = html_escape(state['modal']['form'].get(f['name'], ''))
        req_mark = ' *' if f.get('required') else ''
        inputs += (f'<div class="field"><label>{f["label"]}{req_mark}</label>'
                   f'<input data-bind="modal.form.{f["name"]}" value="{v}" {disabled}></div>')
    title = '신규 등록' if state['modal']['mode'] == 'insert' else '수정'
    return ('<div class="modal-overlay" data-action="overlayClose">'
            '<div class="modal" data-stop>'
            f'<h3>{title} - ${className}</h3>'
            f'{inputs}'
            '<div class="modal-btns">'
            '<button class="sec" data-action="closeModal">취소</button>'
            '<button data-action="save">저장</button>'
            '</div></div></div>')

def render():
    app = document.getElementById('app')
    app.innerHTML = (
        '<h1>${className} (PyScript CDN)</h1>' +
        search_section_html() +
        list_section_html() +
        modal_section_html()
    )

# ============================================================
# Event delegation
# ============================================================
import asyncio

async def handle_action(name, arg, event):
    if name == 'searchPage':
        await search_page(int(arg))
    elif name == 'resetSearch':
        await reset_search()
    elif name == 'toggleSort':
        await toggle_sort(arg)
    elif name == 'openInsert':
        open_insert()
    elif name == 'openUpdate':
        row = next((r for r in state['list'] if row_key(r) == arg), None)
        if row:
            open_update(row)
    elif name == 'deleteRow':
        row = next((r for r in state['list'] if row_key(r) == arg), None)
        if row:
            await delete_row(row)
    elif name == 'save':
        await save()
    elif name == 'closeModal':
        close_modal()
    elif name == 'overlayClose':
        # 오버레이 자기 자신 클릭만 닫기
        if event.target == event.currentTarget:
            close_modal()

def on_click(event):
    target = event.target
    # data-action 속성 가진 가장 가까운 부모 찾기
    el = target
    while el and el is not None:
        if hasattr(el, 'getAttribute') and el.getAttribute('data-action'):
            spec = el.getAttribute('data-action')
            parts = spec.split(':', 1)
            name = parts[0]
            arg = parts[1] if len(parts) > 1 else None
            asyncio.ensure_future(handle_action(name, arg, event))
            return
        el = el.parentElement

def on_input(event):
    t = event.target
    bind = t.getAttribute('data-bind') if hasattr(t, 'getAttribute') else None
    if not bind:
        return
    parts = bind.split('.')
    obj = state
    for k in parts[:-1]:
        obj = obj[k]
    val = t.value
    if t.tagName == 'SELECT' and bind == 'search.pageSize':
        try:
            val = int(val)
        except Exception:
            pass
    obj[parts[-1]] = val

def on_change(event):
    t = event.target
    after = t.getAttribute('data-search-after') if hasattr(t, 'getAttribute') else None
    if after:
        asyncio.ensure_future(search_page(int(after)))

# Event listener 등록
from pyscript import window
app_el = document.getElementById('app')
app_el.addEventListener('click',  on_click)
app_el.addEventListener('input',  on_input)
app_el.addEventListener('change', on_change)

# 초기 1회 조회
asyncio.ensure_future(search_page(1))
</script>
</body>
</html>
`;
}
