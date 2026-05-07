/* ===== Source Generator : Fullstack (Next.js 15 + Prisma) =====
 * 클라이언트 + Route Handlers + Prisma ORM.
 *  - package.json / next.config.mjs / tsconfig.json / .env.example
 *  - prisma/schema.prisma
 *  - app/layout.tsx
 *  - app/<endpoint>/page.tsx                       (클라이언트 화면)
 *  - app/api/<endpoint>/page-list/route.ts         (페이지 목록)
 *  - app/api/<endpoint>/route.ts                   (목록 GET / 등록 POST)
 *  - app/api/<endpoint>/[...id]/route.ts           (단건 / 수정 / 삭제)
 *  - lib/<endpoint>Api.ts                          (클라이언트 fetch wrapper)
 *  - lib/<endpoint>Repo.ts                         (서버 Repository - Prisma)
 *  - lib/db.ts                                     (PrismaClient 싱글톤)
 *
 * 의존: gnAuditFields() (sourcegen.js), mapTsType(), mapPrismaType()
 */

// ----- package.json -----
function gnFullNextPackageJsonSource(endpoint) {
    return `{
  "name": "${endpoint}-next-fullstack",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev":             "next dev",
    "build":           "next build",
    "start":           "next start",
    "lint":            "next lint",
    "postinstall":     "prisma generate",
    "prisma:generate": "prisma generate",
    "prisma:push":     "prisma db push"
  },
  "dependencies": {
    "next":           "^15.0.0",
    "react":          "^18.3.0",
    "react-dom":      "^18.3.0",
    "@prisma/client": "^5.22.0"
  },
  "devDependencies": {
    "@types/node":      "^20",
    "@types/react":     "^18",
    "@types/react-dom": "^18",
    "prisma":           "^5.22.0",
    "typescript":       "^5"
  }
}
`;
}

// ----- next.config.mjs -----
function gnFullNextConfigSource() {
    return `/** @type {import('next').NextConfig} */
const nextConfig = {
  // 풀스택 — 자체 /api Route Handlers 사용
};

export default nextConfig;
`;
}

// ----- tsconfig.json -----
function gnFullNextTsconfigSource() {
    return `{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
`;
}

// ----- .env.example -----
function gnFullNextEnvSource(dbType) {
    const url = dbType === 'oracle'
        ? 'oracle://USER:PASSWORD@localhost:1521/XEPDB1'
        : 'postgresql://USER:PASSWORD@localhost:5432/postgres?schema=public';
    return `# Prisma DATABASE_URL
DATABASE_URL=${url}
`;
}

// ----- prisma/schema.prisma -----
function gnFullNextPrismaSchemaSource(className, table, dataCols, pkCols, hasAudit, dbType) {
    return gnFullNxPrismaSchemaSource(className, table, dataCols, pkCols, hasAudit, dbType);
}

// ----- app/layout.tsx -----
function gnFullNextLayoutSource(className) {
    return `import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '${className} CRUD (Next.js Fullstack + Prisma)',
  description: 'Generated CRUD app',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, fontFamily: 'sans-serif', background: '#f5f7fa' }}>
        <header style={{ padding: '14px 20px', background: '#34495e', color: '#fff' }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>${className} (Next.js 15 Fullstack + Prisma)</h2>
        </header>
        <main style={{ padding: 20 }}>{children}</main>
      </body>
    </html>
  );
}
`;
}

// ----- lib/db.ts -----
function gnFullNextDbSource() {
    return `// PrismaClient 싱글톤 — Next.js dev 핫리로드 누수 방지
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

// ----- lib/<endpoint>Api.ts (클라이언트 fetch wrapper) -----
function gnFullNextApiTsSource(endpoint, className, dataCols, pkCols, hasAudit) {
    const allItemCols = hasAudit ? [...dataCols, ...gnAuditFields()] : dataCols;
    const itemFields = allItemCols.map(c => `  ${c.javaName}?: ${mapTsType(c.javaType)};`).join('\n');
    const pkParams = pkCols.map(c => `${c.javaName}: string`).join(', ');
    const pkPath = pkCols.map(c => `\${${c.javaName}}`).join('/');

    return `// ${className} API — 자체 /api 호출
const BASE = '/api/${endpoint}';

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

async function api(url: string, opts: RequestInit = {}): Promise<any> {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    cache: 'no-store',
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

function buildQs(obj: Record<string, any>): string {
  const params: Record<string, any> = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== '' && v != null) {
      params[k] = v;
    }
  });
  return new URLSearchParams(params as any).toString();
}

export const selectPageList = (search: Record<string, any>): Promise<${className}PageResponse> =>
  api(\`\${BASE}/page-list?\${buildQs(search)}\`);

export const selectOne = (${pkParams}): Promise<${className}> =>
  api(\`\${BASE}/${pkPath}\`);

export const create = (form: ${className}): Promise<${className}> =>
  api(BASE, { method: 'POST', body: JSON.stringify(form) });

export const update = (${pkParams}, form: ${className}): Promise<${className}> =>
  api(\`\${BASE}/${pkPath}\`, { method: 'PUT', body: JSON.stringify(form) });

export const remove = (${pkParams}): Promise<void> =>
  api(\`\${BASE}/${pkPath}\`, { method: 'DELETE' });

export const saveOne = (form: ${className}): Promise<${className} | null> =>
  api(\`\${BASE}/save-one\`,  { method: 'POST', body: JSON.stringify(form) });

export const saveList = (rows: ${className}[]): Promise<void> =>
  api(\`\${BASE}/save-list\`, { method: 'POST', body: JSON.stringify(rows) });
`;
}

// ----- lib/<endpoint>Repo.ts (서버 Repository — Prisma) -----
function gnFullNextRepoSource(endpoint, className, table, dataCols, pkCols, nonPkCols, hasAudit) {
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
import { prisma } from '@/lib/db';
import type { ${className}, ${className}PageResponse } from '@/lib/${endpoint}Api';

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

// ----- app/api/<endpoint>/page-list/route.ts -----
function gnFullNextRoutePageListSource(endpoint, className) {
    return `// GET /api/${endpoint}/page-list
import { NextResponse, type NextRequest } from 'next/server';
import { selectPageList, type ${className}SearchReq } from '@/lib/${endpoint}Repo';

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const req: ${className}SearchReq = {
    pageNo:   sp.get('pageNo')   ? Number(sp.get('pageNo'))   : 1,
    pageSize: sp.get('pageSize') ? Number(sp.get('pageSize')) : 10,
    sortBy:   sp.get('sortBy') ?? undefined,
  };
  sp.forEach((v, k) => {
    if (!['pageNo', 'pageSize', 'sortBy'].includes(k)) {
      (req as any)[k] = v;
    }
  });
  return NextResponse.json(await selectPageList(req));
}
`;
}

// ----- app/api/<endpoint>/route.ts -----
function gnFullNextRouteIndexSource(endpoint, className) {
    return `// GET /api/${endpoint}    — 전체 목록
// POST /api/${endpoint}   — 등록
import { NextResponse, type NextRequest } from 'next/server';
import { selectList, insertOne, type ${className}SearchReq } from '@/lib/${endpoint}Repo';
import type { ${className} } from '@/lib/${endpoint}Api';

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const req: ${className}SearchReq = {
    pageNo:   sp.get('pageNo')   ? Number(sp.get('pageNo'))   : 0,
    pageSize: sp.get('pageSize') ? Number(sp.get('pageSize')) : 0,
    sortBy:   sp.get('sortBy') ?? undefined,
  };
  sp.forEach((v, k) => {
    if (!['pageNo', 'pageSize', 'sortBy'].includes(k)) {
      (req as any)[k] = v;
    }
  });
  return NextResponse.json(await selectList(req));
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as ${className};
  return NextResponse.json(await insertOne(body));
}
`;
}

// ----- app/api/<endpoint>/[...id]/route.ts -----
function gnFullNextRouteIdSource(endpoint, className, pkCols) {
    const splitParts = pkCols.map((c, i) => `  const ${c.javaName} = parts[${i}] ?? '';`).join('\n');
    const pkArgs = pkCols.map(c => c.javaName).join(', ');

    return `// GET    /api/${endpoint}/<pk1>/<pk2>...   — 단건
// PUT    /api/${endpoint}/<pk1>/<pk2>...   — 수정
// DELETE /api/${endpoint}/<pk1>/<pk2>...   — 삭제
import { NextResponse, type NextRequest } from 'next/server';
import { selectById, updateOne, deleteOne } from '@/lib/${endpoint}Repo';
import type { ${className} } from '@/lib/${endpoint}Api';

interface Ctx { params: Promise<{ id: string[] }>; }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const parts = Array.isArray(id) ? id : [id];
${splitParts}
  const row = await selectById(${pkArgs});
  if (!row) {
    return NextResponse.json({ error: '${className} not found' }, { status: 404 });
  }
  return NextResponse.json(row);
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const parts = Array.isArray(id) ? id : [id];
${splitParts}
  const body = (await request.json()) as ${className};
  const row = await updateOne(${pkArgs}, body);
  if (!row) {
    return NextResponse.json({ error: '${className} not found' }, { status: 404 });
  }
  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const parts = Array.isArray(id) ? id : [id];
${splitParts}
  const ok = await deleteOne(${pkArgs});
  if (!ok) {
    return NextResponse.json({ error: '${className} not found' }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
`;
}

// ----- app/<endpoint>/page.tsx (클라이언트 화면) -----
function gnFullNextPageTsxSource(endpoint, className, dataCols, pkCols, nonPkCols, hasAudit) {
    const allItemCols = hasAudit ? [...dataCols, ...gnAuditFields()] : dataCols;
    const stringCols = dataCols.filter(c => c.javaType === 'String' && !c.isAudit);

    const searchFieldsArr = stringCols.map(c => `  { name: '${c.javaName}', label: '${c.name}' }`).join(',\n');
    const columnsArr      = allItemCols.map(c => `  { key: '${c.javaName}', label: '${c.name}' }`).join(',\n');
    const formFieldsArr   = [
        ...pkCols.map(c => `  { name: '${c.javaName}', label: '${c.name}', required: true, pk: true }`),
        ...nonPkCols.filter(c => !c.isAudit).map(c => {
            const r = !c.nullable;
            return `  { name: '${c.javaName}', label: '${c.name}'${r ? ', required: true' : ''} }`;
        })
    ].join(',\n');
    const emptyForm   = '{ ' + dataCols.filter(c => !c.isAudit).map(c => `${c.javaName}: ''`).join(', ') + ' }';
    const emptySearch = '{ ' + stringCols.map(c => `${c.javaName}: ''`).join(', ') + `, pageNo: 1, pageSize: 10, sortBy: '' }`;

    return `// ${className} CRUD — Next.js 15 풀스택 + Prisma
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as api from '@/lib/${endpoint}Api';
import type { ${className} } from '@/lib/${endpoint}Api';

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

export default function ${className}Page() {
  const [search, setSearch] = useState<Record<string, any>>(EMPTY_SEARCH());
  const [list, setList] = useState<${className}[]>([]);
  const [page, setPage] = useState({ pageTotalCount: 0, pageNo: 1, pageSize: 10, pageTotalPages: 0 });
  const [modal, setModal] = useState<{ show: boolean; mode: 'insert' | 'update'; form: Record<string, any> }>({
    show: false, mode: 'insert', form: {}
  });

  const pageRange = useMemo(() => {
    const total = page.pageTotalPages || 1;
    const block = Math.floor((page.pageNo - 1) / 5);
    const start = block * 5 + 1;
    const r: number[] = [];
    for (let i = start; i <= Math.min(start + 4, total); i++) {
      r.push(i);
    }
    return r;
  }, [page]);

  const rowKey = (row: ${className}) => PK.map(k => row[k as keyof ${className}]).join('|');

  const searchPage = useCallback(async (p = 1) => {
    const next = { ...search, pageNo: p };
    setSearch(next);
    try {
      const data = await api.selectPageList(next);
      setList(data.pageList || []);
      setPage(data);
    } catch (e: any) { alert(e.message); }
  }, [search]);

  useEffect(() => { searchPage(1); /* eslint-disable-next-line */ }, []);

  const resetSearch = () => { setSearch(EMPTY_SEARCH()); setTimeout(() => searchPage(1), 0); };
  const toggleSort = (key: string) => {
    const cur = search.sortBy || '';
    const next = cur === key + ' asc' ? key + ' desc'
              : cur === key + ' desc' ? '' : key + ' asc';
    setSearch({ ...search, sortBy: next, pageNo: 1 });
    setTimeout(() => searchPage(1), 0);
  };
  const sortDir = (key: string) => {
    const cur = search.sortBy || '';
    return cur === key + ' asc' ? 'sort-asc' : cur === key + ' desc' ? 'sort-desc' : '';
  };

  const openInsert = () => setModal({ show: true, mode: 'insert', form: EMPTY_FORM() });
  const openUpdate = (row: ${className}) => setModal({ show: true, mode: 'update', form: { ...row } });

  const save = async () => {
    try {
      if (modal.mode === 'insert') {
        await api.create(modal.form as ${className});
      } else {
        const pkArgs = PK.map(k => modal.form[k] || '') as any;
        await api.update(...pkArgs, modal.form as ${className});
      }
      setModal({ ...modal, show: false });
      searchPage(page.pageNo);
    } catch (e: any) { alert(e.message); }
  };

  const deleteRow = async (r: ${className}) => {
    if (!confirm('삭제?')) {
      return;
    }
    try {
      const pkArgs = PK.map(k => r[k as keyof ${className}] || '') as any;
      await api.remove(...pkArgs);
      searchPage(page.pageNo);
    } catch (e: any) { alert(e.message); }
  };

  return (
    <div>
      <h1>${className}</h1>

      <section style={S.card}>
        {SEARCH_FIELDS.map(f => (
          <span key={f.name} style={S.field}>
            <label style={S.label}>{f.label}</label>
            <input style={S.input} value={search[f.name] || ''}
                   onChange={e => setSearch({ ...search, [f.name]: e.target.value })} />
          </span>
        ))}
        <span style={S.field}>
          <label style={S.label}>크기</label>
          <select style={S.input} value={search.pageSize}
                  onChange={e => { setSearch({ ...search, pageSize: Number(e.target.value), pageNo: 1 });
                                   setTimeout(() => searchPage(1), 0); }}>
            {[5, 10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </span>
        <button style={S.btnPri} onClick={() => searchPage(1)}>검색</button>
        <button style={S.btnSec} onClick={resetSearch}>초기화</button>
      </section>

      <section style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: '#7f8c8d' }}>
            총 {page.pageTotalCount}건 / {page.pageTotalPages}페이지
          </span>
          <button style={S.btnSuc} onClick={openInsert}>+ 신규등록</button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {COLUMNS.map(c => (
                <th key={c.key} className={sortDir(c.key)} onClick={() => toggleSort(c.key)}
                    style={{ background: '#34495e', color: '#fff', padding: 8, cursor: 'pointer', textAlign: 'left' }}>
                  {c.label}{sortDir(c.key) === 'sort-asc' ? ' ▲' : sortDir(c.key) === 'sort-desc' ? ' ▼' : ''}
                </th>
              ))}
              <th style={{ background: '#34495e', color: '#fff', padding: 8, width: 130 }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {!list.length && (
              <tr><td colSpan={COLUMNS.length + 1} style={{ padding: 20, textAlign: 'center', color: '#95a5a6' }}>데이터 없음</td></tr>
            )}
            {list.map(row => (
              <tr key={rowKey(row)}>
                {COLUMNS.map(c => (
                  <td key={c.key} style={{ padding: 6, borderBottom: '1px solid #eee' }}>
                    {String(row[c.key as keyof ${className}] ?? '')}
                  </td>
                ))}
                <td style={{ padding: 6, textAlign: 'right' }}>
                  <button style={S.btnWarnSm} onClick={() => openUpdate(row)}>수정</button>{' '}
                  <button style={S.btnDngSm}  onClick={() => deleteRow(row)}>삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {page.pageTotalPages > 0 && (
          <nav style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 12 }}>
            <button disabled={page.pageNo <= 1} onClick={() => searchPage(1)}>«</button>
            <button disabled={page.pageNo <= 1} onClick={() => searchPage(page.pageNo - 1)}>‹</button>
            {pageRange.map(p => (
              <button key={p}
                      style={{ background: p === page.pageNo ? '#4f7df3' : '#fff',
                               color:      p === page.pageNo ? '#fff' : '#2c3e50' }}
                      onClick={() => searchPage(p)}>{p}</button>
            ))}
            <button disabled={page.pageNo >= page.pageTotalPages} onClick={() => searchPage(page.pageNo + 1)}>›</button>
            <button disabled={page.pageNo >= page.pageTotalPages} onClick={() => searchPage(page.pageTotalPages)}>»</button>
          </nav>
        )}
      </section>

      {modal.show && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setModal({ ...modal, show: false }); }}
             style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 8, minWidth: 420 }}>
            <h3 style={{ margin: '0 0 14px' }}>{modal.mode === 'insert' ? '신규' : '수정'} - ${className}</h3>
            {FORM_FIELDS.map(f => (
              <div key={f.name} style={{ marginBottom: 10 }}>
                <label style={S.label}>{f.label}{f.required ? ' *' : ''}</label>
                <input style={{ ...S.input, width: '100%' }} value={modal.form[f.name] || ''}
                       disabled={modal.mode === 'update' && f.pk}
                       onChange={e => setModal({ ...modal, form: { ...modal.form, [f.name]: e.target.value } })} />
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 14 }}>
              <button style={S.btnSec} onClick={() => setModal({ ...modal, show: false })}>취소</button>
              <button style={S.btnPri} onClick={save}>저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  card:   { background: '#fff', borderRadius: 6, padding: 16, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  field:  { display: 'inline-flex', alignItems: 'center', gap: 6, margin: '4px 8px 4px 0' },
  label:  { fontSize: 12, color: '#7f8c8d' },
  input:  { padding: '5px 8px', border: '1px solid #d0d7de', borderRadius: 4, fontSize: 13 },
  btnPri:    { padding: '5px 12px', border: 0, borderRadius: 4, cursor: 'pointer', background: '#4f7df3', color: '#fff', fontWeight: 600 },
  btnSec:    { padding: '5px 12px', border: 0, borderRadius: 4, cursor: 'pointer', background: '#95a5a6', color: '#fff', fontWeight: 600 },
  btnSuc:    { padding: '5px 12px', border: 0, borderRadius: 4, cursor: 'pointer', background: '#27ae60', color: '#fff', fontWeight: 600 },
  btnWarnSm: { padding: '3px 9px', border: 0, borderRadius: 3, cursor: 'pointer', background: '#f39c12', color: '#fff', fontSize: 11, fontWeight: 600 },
  btnDngSm:  { padding: '3px 9px', border: 0, borderRadius: 3, cursor: 'pointer', background: '#e74c3c', color: '#fff', fontSize: 11, fontWeight: 600 },
};
`;
}
