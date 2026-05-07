/* ===== Source Generator : Fullstack (Nuxt 4 + Prisma) =====
 * 클라이언트 + server/api/ + Prisma ORM.
 *  - package.json / nuxt.config.ts / tsconfig.json / .env.example
 *  - prisma/schema.prisma
 *  - app/app.vue / app/pages/<endpoint>.vue
 *  - app/types/<endpoint>.ts / app/composables/use<Class>Api.ts
 *  - server/utils/db.ts                 ← PrismaClient 싱글톤
 *  - server/utils/<endpoint>Repo.ts     ← Prisma 호출 함수
 *  - server/api/<endpoint>/page-list.get.ts
 *  - server/api/<endpoint>/index.get.ts        (전체 목록)
 *  - server/api/<endpoint>/index.post.ts       (등록)
 *  - server/api/<endpoint>/[...id].get.ts      (단건)
 *  - server/api/<endpoint>/[...id].put.ts      (수정)
 *  - server/api/<endpoint>/[...id].delete.ts   (삭제)
 *
 * 의존: gnAuditFields() (sourcegen.js), mapTsType(), mapPrismaType()
 */

// ----- package.json -----
function gnFullNxPackageJsonSource(endpoint) {
    return `{
  "name": "${endpoint}-nuxt-fullstack",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build":           "nuxt build",
    "dev":             "nuxt dev",
    "preview":         "nuxt preview",
    "postinstall":     "nuxt prepare && prisma generate",
    "prisma:generate": "prisma generate",
    "prisma:push":     "prisma db push"
  },
  "dependencies": {
    "nuxt":           "^4.0.0",
    "vue":            "latest",
    "@prisma/client": "^5.22.0"
  },
  "devDependencies": {
    "prisma": "^5.22.0"
  }
}
`;
}

// ----- nuxt.config.ts -----
function gnFullNxConfigSource() {
    return `// Nuxt 4 풀스택 — Prisma 가 자체 process.env.DATABASE_URL 읽으므로 별도 설정 불필요
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      apiBase: '/api'
    }
  }
});
`;
}

// ----- tsconfig.json -----
function gnFullNxTsconfigSource() {
    return `{
  "extends": "./.nuxt/tsconfig.json"
}
`;
}

// ----- .env.example -----
function gnFullNxEnvSource(dbType) {
    const url = dbType === 'oracle'
        ? 'oracle://USER:PASSWORD@localhost:1521/XEPDB1'
        : 'postgresql://USER:PASSWORD@localhost:5432/postgres?schema=public';
    return `# Prisma DATABASE_URL — PrismaClient 가 자동으로 읽음
DATABASE_URL=${url}
`;
}

// ----- prisma/schema.prisma -----
function gnFullNxPrismaSchemaSource(className, table, dataCols, pkCols, hasAudit, dbType) {
    const allItemCols = hasAudit ? [...dataCols, ...gnAuditFields()] : dataCols;
    const provider = dbType === 'oracle' ? 'oracle' : 'postgresql';
    let fields = allItemCols.map(c => {
        const t = mapPrismaType(c.javaType);
        const optional = c.nullable ? '?' : '';
        const id = c.isPk ? ' @id' : '';
        const map = ` @map("${c.name}")`;
        return `  ${c.javaName}  ${t}${optional}${id}${map}`;
    }).join('\n');
    const compositeId = pkCols.length > 1
        ? `\n  @@id([${pkCols.map(c => c.javaName).join(', ')}])`
        : '';
    if (pkCols.length > 1) {
        fields = fields.replace(/ @id/g, '');
    }
    return `// Prisma schema — ${className}
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${provider}"
  url      = env("DATABASE_URL")
}

model ${className} {
${fields}${compositeId}

  @@map("${table}")
}
`;
}

// ----- app/app.vue -----
function gnFullNxAppVueSource(className) {
    return `<!-- Nuxt 4 풀스택 진입점 -->
<template>
  <div>
    <header style="padding:14px 20px;background:#34495e;color:#fff;">
      <h2 style="margin:0;font-size:18px;">${className} (Nuxt 4 Fullstack + Prisma)</h2>
    </header>
    <main style="padding:20px;background:#f5f7fa;min-height:calc(100vh - 60px);">
      <NuxtPage />
    </main>
  </div>
</template>
`;
}

// ----- app/types/<endpoint>.ts -----
function gnFullNxTypesSource(endpoint, className, dataCols, hasAudit) {
    const allItemCols = hasAudit ? [...dataCols, ...gnAuditFields()] : dataCols;
    const itemFields = allItemCols.map(c => `  ${c.javaName}?: ${mapTsType(c.javaType)};`).join('\n');
    return `// ${className} 타입 — 클라이언트/서버 공유
export interface ${className} {
${itemFields}
}

export interface ${className}PageResponse {
  pageList: ${className}[];
  pageTotalCount: number;
  pageNo: number;
  pageSize: number;
  pageTotalPages: number;
}
`;
}

// ----- app/composables/use<Class>Api.ts -----
function gnFullNxComposableSource(endpoint, className, pkCols) {
    const pkParams = pkCols.map(c => `${c.javaName}: string`).join(', ');
    const pkPath = pkCols.map(c => `\${${c.javaName}}`).join('/');

    return `// ${className} API — 자체 /api 호출
import type { ${className}, ${className}PageResponse } from '~/types/${endpoint}';

export const use${className}Api = () => {
  const BASE = '/api/${endpoint}';

  function buildQs(obj: Record<string, any>): string {
    const params: Record<string, any> = {};
    Object.entries(obj).forEach(([k, v]) => {
      if (v !== '' && v != null) {
        params[k] = v;
      }
    });
    return new URLSearchParams(params as any).toString();
  }

  const selectPageList = (search: Record<string, any>) =>
    $fetch<${className}PageResponse>(\`\${BASE}/page-list?\${buildQs(search)}\`);

  const selectOne = (${pkParams}) =>
    $fetch<${className}>(\`\${BASE}/${pkPath}\`);

  const create = (form: ${className}) =>
    $fetch<${className}>(BASE, { method: 'POST', body: form });

  const update = (${pkParams}, form: ${className}) =>
    $fetch<${className}>(\`\${BASE}/${pkPath}\`, { method: 'PUT', body: form });

  const remove = (${pkParams}) =>
    $fetch<void>(\`\${BASE}/${pkPath}\`, { method: 'DELETE' });

  const saveOne = (form: ${className}) =>
    $fetch<${className} | null>(\`\${BASE}/save-one\`,  { method: 'POST', body: form });

  const saveList = (rows: ${className}[]) =>
    $fetch<void>(\`\${BASE}/save-list\`, { method: 'POST', body: rows });

  return { selectPageList, selectOne, create, update, remove, saveOne, saveList };
};
`;
}

// ----- server/utils/db.ts -----
function gnFullNxDbSource() {
    return `// PrismaClient 싱글톤 — Nuxt HMR 시 connection 누수 방지
import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var _prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient = global._prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') {
  global._prisma = prisma;
}
`;
}

// ----- server/utils/<endpoint>Repo.ts -----
function gnFullNxRepoSource(endpoint, className, table, dataCols, pkCols, nonPkCols, hasAudit) {
    const lowerCls = className.charAt(0).toLowerCase() + className.slice(1);

    const stringDataCols = dataCols.filter(c => c.javaType === 'String' && !c.isAudit);
    const condBlock = stringDataCols.map(c =>
        `  if (req.${c.javaName}) where.${c.javaName} = { contains: req.${c.javaName}, mode: 'insensitive' as const };`
    ).join('\n');

    const orderByMap = dataCols.filter(c => !c.isAudit).flatMap(c => [
        `    '${c.javaName} asc':  { ${c.javaName}: 'asc' as const },`,
        `    '${c.javaName} desc': { ${c.javaName}: 'desc' as const },`
    ]).join('\n');
    const defaultOrderBy = pkCols.length === 1
        ? `{ ${pkCols[0].javaName}: 'asc' as const }`
        : `[${pkCols.map(c => `{ ${c.javaName}: 'asc' as const }`).join(', ')}]`;

    const pkArgs = pkCols.map(c => `${c.javaName}: string`).join(', ');
    const pkWhere = pkCols.length === 1
        ? `{ ${pkCols[0].javaName} }`
        : `{ ${pkCols.map(c => c.javaName).join('_')}: { ${pkCols.map(c => c.javaName).join(', ')} } }`;

    const reqDataAssigns = nonPkCols.filter(c => !c.isAudit).map(c =>
        `      ${c.javaName}: req.${c.javaName},`
    ).concat(pkCols.map(c => `      ${c.javaName}: req.${c.javaName}!,`)).join('\n');

    const updateAssigns = nonPkCols.filter(c => !c.isAudit).map(c =>
        `      ${c.javaName}: req.${c.javaName},`
    ).join('\n');

    return `// ${className} Repository — Prisma
import { prisma } from './db';
import type { ${className}, ${className}PageResponse } from '~/types/${endpoint}';

export interface ${className}SearchReq {
${dataCols.filter(c => !c.isAudit).map(c => `  ${c.javaName}?: ${mapTsType(c.javaType)} | null;`).join('\n')}
  pageNo?: number;
  pageSize?: number;
  sortBy?: string;
}

function buildQuery(req: ${className}SearchReq) {
  const where: any = {};
${condBlock}
  const sortMap: Record<string, any> = {
${orderByMap}
  };
  const orderBy = req.sortBy && sortMap[req.sortBy] ? sortMap[req.sortBy] : ${defaultOrderBy};
  return { where, orderBy };
}

export async function selectById(${pkArgs}): Promise<${className} | null> {
  const row = await prisma.${lowerCls}.findUnique({ where: ${pkWhere} });
  return row as ${className} | null;
}

export async function selectList(req: ${className}SearchReq): Promise<${className}[]> {
  const { where, orderBy } = buildQuery(req);
  const args: any = { where, orderBy };
  if ((req.pageSize ?? 0) > 0 && (req.pageNo ?? 0) > 0) {
    args.skip = ((req.pageNo ?? 1) - 1) * (req.pageSize ?? 10);
    args.take = req.pageSize ?? 10;
  }
  return await prisma.${lowerCls}.findMany(args) as unknown as ${className}[];
}

export async function selectPageList(req: ${className}SearchReq): Promise<${className}PageResponse> {
  const pageNo   = (req.pageNo   ?? 0) > 0 ? req.pageNo!   : 1;
  const pageSize = (req.pageSize ?? 0) > 0 ? req.pageSize! : 10;

  const { where, orderBy } = buildQuery(req);
  const [rows, total] = await Promise.all([
    prisma.${lowerCls}.findMany({
      where, orderBy, skip: (pageNo - 1) * pageSize, take: pageSize,
    }),
    prisma.${lowerCls}.count({ where }),
  ]);
  const pageTotalPages = pageSize <= 0 ? 0 : Math.ceil(total / pageSize);
  return {
    pageList: rows as unknown as ${className}[],
    pageTotalCount: total, pageNo, pageSize, pageTotalPages
  };
}

export async function insertOne(req: ${className}): Promise<${className}> {
  const row = await prisma.${lowerCls}.create({
    data: {
${reqDataAssigns}
    },
  });
  return row as ${className};
}

export async function updateOne(${pkArgs}, req: ${className}): Promise<${className} | null> {
  try {
    const row = await prisma.${lowerCls}.update({
      where: ${pkWhere},
      data: {
${updateAssigns}
      },
    });
    return row as ${className};
  } catch {
    return null;
  }
}

export async function deleteOne(${pkArgs}): Promise<boolean> {
  try {
    await prisma.${lowerCls}.delete({ where: ${pkWhere} });
    return true;
  } catch {
    return false;
  }
}
`;
}

// ----- server/api/<endpoint>/page-list.get.ts -----
function gnFullNxApiPageListSource(endpoint, className) {
    return `// GET /api/${endpoint}/page-list
import { selectPageList, type ${className}SearchReq } from '~/server/utils/${endpoint}Repo';

export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, any>;
  const req: ${className}SearchReq = {
    ...q,
    pageNo:   q.pageNo   ? Number(q.pageNo)   : 1,
    pageSize: q.pageSize ? Number(q.pageSize) : 10,
    sortBy:   q.sortBy as string | undefined,
  };
  return await selectPageList(req);
});
`;
}

// ----- server/api/<endpoint>/index.get.ts -----
function gnFullNxApiListSource(endpoint, className) {
    return `// GET /api/${endpoint}
import { selectList, type ${className}SearchReq } from '~/server/utils/${endpoint}Repo';

export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, any>;
  const req: ${className}SearchReq = {
    ...q,
    pageNo:   q.pageNo   ? Number(q.pageNo)   : 0,
    pageSize: q.pageSize ? Number(q.pageSize) : 0,
    sortBy:   q.sortBy as string | undefined,
  };
  return await selectList(req);
});
`;
}

// ----- server/api/<endpoint>/index.post.ts -----
function gnFullNxApiInsertSource(endpoint, className) {
    return `// POST /api/${endpoint}
import { insertOne } from '~/server/utils/${endpoint}Repo';
import type { ${className} } from '~/types/${endpoint}';

export default defineEventHandler(async (event) => {
  const body = await readBody<${className}>(event);
  return await insertOne(body);
});
`;
}

// ----- server/api/<endpoint>/[...id].get.ts -----
function gnFullNxApiGetOneSource(endpoint, className, pkCols) {
    const splitParts = pkCols.map((c, i) => `  const ${c.javaName} = parts[${i}] ?? '';`).join('\n');
    const pkArgs = pkCols.map(c => c.javaName).join(', ');
    return `// GET /api/${endpoint}/<pk1>/<pk2>...
import { selectById } from '~/server/utils/${endpoint}Repo';

export default defineEventHandler(async (event) => {
  const idParam = getRouterParam(event, 'id') ?? '';
  const parts = Array.isArray(idParam) ? idParam : idParam.split('/').filter(Boolean);
${splitParts}
  const row = await selectById(${pkArgs});
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: '${className} not found' });
  }
  return row;
});
`;
}

// ----- server/api/<endpoint>/[...id].put.ts -----
function gnFullNxApiPutSource(endpoint, className, pkCols) {
    const splitParts = pkCols.map((c, i) => `  const ${c.javaName} = parts[${i}] ?? '';`).join('\n');
    const pkArgs = pkCols.map(c => c.javaName).join(', ');
    return `// PUT /api/${endpoint}/<pk1>/<pk2>...
import { updateOne } from '~/server/utils/${endpoint}Repo';
import type { ${className} } from '~/types/${endpoint}';

export default defineEventHandler(async (event) => {
  const idParam = getRouterParam(event, 'id') ?? '';
  const parts = Array.isArray(idParam) ? idParam : idParam.split('/').filter(Boolean);
${splitParts}
  const body = await readBody<${className}>(event);
  const row = await updateOne(${pkArgs}, body);
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: '${className} not found' });
  }
  return row;
});
`;
}

// ----- server/api/<endpoint>/[...id].delete.ts -----
function gnFullNxApiDeleteSource(endpoint, className, pkCols) {
    const splitParts = pkCols.map((c, i) => `  const ${c.javaName} = parts[${i}] ?? '';`).join('\n');
    const pkArgs = pkCols.map(c => c.javaName).join(', ');
    return `// DELETE /api/${endpoint}/<pk1>/<pk2>...
import { deleteOne } from '~/server/utils/${endpoint}Repo';

export default defineEventHandler(async (event) => {
  const idParam = getRouterParam(event, 'id') ?? '';
  const parts = Array.isArray(idParam) ? idParam : idParam.split('/').filter(Boolean);
${splitParts}
  const ok = await deleteOne(${pkArgs});
  if (!ok) {
    throw createError({ statusCode: 404, statusMessage: '${className} not found' });
  }
  setResponseStatus(event, 204);
  return null;
});
`;
}

// ----- app/pages/<endpoint>.vue (클라이언트 화면) -----
function gnFullNxPageVueSource(endpoint, className, dataCols, pkCols, nonPkCols, hasAudit) {
    const allItemCols = hasAudit ? [...dataCols, ...gnAuditFields()] : dataCols;
    const stringCols = dataCols.filter(c => c.javaType === 'String' && !c.isAudit);

    const searchFieldsArr = stringCols.map(c => `  { name: '${c.javaName}', label: '${c.name}' }`).join(',\n');
    const columnsArr = allItemCols.map(c => `  { key: '${c.javaName}', label: '${c.name}' }`).join(',\n');
    const formFieldsArr = [
        ...pkCols.map(c => `  { name: '${c.javaName}', label: '${c.name}', required: true, pk: true }`),
        ...nonPkCols.filter(c => !c.isAudit).map(c => {
            const r = !c.nullable;
            return `  { name: '${c.javaName}', label: '${c.name}'${r ? ', required: true' : ''} }`;
        })
    ].join(',\n');
    const emptyForm = '{ ' + dataCols.filter(c => !c.isAudit).map(c => `${c.javaName}: ''`).join(', ') + ' }';
    const emptySearch = '{ ' + stringCols.map(c => `${c.javaName}: ''`).join(', ') + `, pageNo: 1, pageSize: 10, sortBy: '' }`;

    return `<!-- ${className} CRUD — Nuxt 4 풀스택 + Prisma -->
<script setup lang="ts">
import type { ${className} } from '~/types/${endpoint}';

const PK = [${pkCols.map(c => `'${c.javaName}'`).join(', ')}] as const;
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

const api = use${className}Api();
const search = ref<Record<string, any>>(EMPTY_SEARCH());
const list = ref<${className}[]>([]);
const page = ref({ pageTotalCount: 0, pageNo: 1, pageSize: 10, pageTotalPages: 0 });
const modal = ref({ show: false, mode: 'insert' as 'insert' | 'update', form: {} as Record<string, any> });

const pageRange = computed(() => {
  const total = page.value.pageTotalPages || 1;
  const block = Math.floor((page.value.pageNo - 1) / 5);
  const start = block * 5 + 1;
  const r: number[] = [];
  for (let i = start; i <= Math.min(start + 4, total); i++) {
    r.push(i);
  }
  return r;
});
const rowKey = (row: ${className}) => PK.map(k => row[k as keyof ${className}]).join('|');

async function searchPage(p = 1) {
  search.value = { ...search.value, pageNo: p };
  try {
    const data = await api.selectPageList(search.value);
    list.value = data.pageList || [];
    page.value = data;
  } catch (e: any) { alert(e.message); }
}

await searchPage(1);

function resetSearch() { search.value = EMPTY_SEARCH(); searchPage(1); }
function toggleSort(key: string) {
  const cur = search.value.sortBy || '';
  search.value.sortBy = cur === key + ' asc' ? key + ' desc'
                     : cur === key + ' desc' ? '' : key + ' asc';
  searchPage(1);
}
function sortDir(key: string) {
  const cur = search.value.sortBy || '';
  return cur === key + ' asc' ? 'sort-asc' : cur === key + ' desc' ? 'sort-desc' : '';
}
function openInsert() { modal.value = { show: true, mode: 'insert', form: EMPTY_FORM() }; }
function openUpdate(row: ${className}) { modal.value = { show: true, mode: 'update', form: { ...row } }; }

async function save() {
  try {
    if (modal.value.mode === 'insert') {
      await api.create(modal.value.form as ${className});
    } else {
      const pkArgs = PK.map(k => modal.value.form[k] || '') as any;
      await api.update(...pkArgs, modal.value.form as ${className});
    }
    modal.value.show = false;
    searchPage(page.value.pageNo);
  } catch (e: any) { alert(e.message); }
}
async function deleteRow(r: ${className}) {
  if (!confirm('삭제?')) {
    return;
  }
  try {
    const pkArgs = PK.map(k => r[k as keyof ${className}] || '') as any;
    await api.remove(...pkArgs);
    searchPage(page.value.pageNo);
  } catch (e: any) { alert(e.message); }
}
</script>

<template>
  <div>
    <h1>${className}</h1>

    <section class="card">
      <div v-for="f in SEARCH_FIELDS" :key="f.name" class="field">
        <label>{{ f.label }}</label>
        <input v-model="search[f.name]" :placeholder="f.label" />
      </div>
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
      <button class="sec" @click="resetSearch">초기화</button>
    </section>

    <section class="card">
      <div class="toolbar">
        <span>총 {{ page.pageTotalCount }}건 / {{ page.pageTotalPages }}페이지</span>
        <button class="suc" @click="openInsert">+ 신규등록</button>
      </div>
      <table>
        <thead>
          <tr>
            <th v-for="c in COLUMNS" :key="c.key" :class="sortDir(c.key)" @click="toggleSort(c.key)">{{ c.label }}</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!list.length"><td :colspan="COLUMNS.length + 1" class="empty">데이터 없음</td></tr>
          <tr v-for="row in list" :key="rowKey(row)">
            <td v-for="c in COLUMNS" :key="c.key">{{ row[c.key as keyof ${className}] }}</td>
            <td>
              <button class="warn sm" @click="openUpdate(row)">수정</button>
              <button class="dng sm"  @click="deleteRow(row)">삭제</button>
            </td>
          </tr>
        </tbody>
      </table>
      <nav v-if="page.pageTotalPages > 0" class="pagination">
        <button :disabled="page.pageNo <= 1" @click="searchPage(1)">«</button>
        <button :disabled="page.pageNo <= 1" @click="searchPage(page.pageNo - 1)">‹</button>
        <button v-for="p in pageRange" :key="p" :class="{ active: p === page.pageNo }" @click="searchPage(p)">{{ p }}</button>
        <button :disabled="page.pageNo >= page.pageTotalPages" @click="searchPage(page.pageNo + 1)">›</button>
        <button :disabled="page.pageNo >= page.pageTotalPages" @click="searchPage(page.pageTotalPages)">»</button>
      </nav>
    </section>

    <div v-if="modal.show" class="modal-overlay" @click.self="modal.show = false">
      <div class="modal">
        <h3>{{ modal.mode === 'insert' ? '신규' : '수정' }} - ${className}</h3>
        <div v-for="f in FORM_FIELDS" :key="f.name" class="field">
          <label>{{ f.label }}{{ f.required ? ' *' : '' }}</label>
          <input v-model="modal.form[f.name]" :disabled="modal.mode === 'update' && f.pk" />
        </div>
        <div class="actions">
          <button class="sec" @click="modal.show = false">취소</button>
          <button @click="save">저장</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card { background: #fff; border-radius: 6px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.field { display: inline-flex; align-items: center; gap: 6px; margin: 4px 8px 4px 0; }
.field label { font-size: 12px; color: #7f8c8d; }
input, select { padding: 5px 8px; border: 1px solid #d0d7de; border-radius: 4px; font-size: 13px; }
button { padding: 5px 12px; border: 0; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; background: #4f7df3; color: #fff; }
button.sec { background: #95a5a6; }
button.suc { background: #27ae60; }
button.warn { background: #f39c12; }
button.dng { background: #e74c3c; }
button.sm { padding: 3px 9px; font-size: 11px; }
button:disabled { opacity: 0.4; cursor: not-allowed; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #ecf0f1; }
th { background: #34495e; color: #fff; cursor: pointer; }
th.sort-asc::after { content: ' ▲'; }
th.sort-desc::after { content: ' ▼'; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 12px; color: #7f8c8d; }
.empty { text-align: center; color: #95a5a6; padding: 20px; }
.pagination { display: flex; gap: 4px; justify-content: center; margin-top: 12px; }
.pagination button { background: #fff; color: #2c3e50; border: 1px solid #d0d7de; min-width: 32px; }
.pagination button.active { background: #4f7df3; color: #fff; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: #fff; padding: 22px 24px; border-radius: 8px; min-width: 420px; max-width: 90vw; }
.modal .field { display: block; margin-bottom: 10px; }
.modal .field input { width: 100%; }
.actions { display: flex; justify-content: flex-end; gap: 6px; margin-top: 14px; }
</style>
`;
}
