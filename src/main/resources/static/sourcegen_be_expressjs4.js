/* ===== Source Generator : Backend (Express 4 + Prisma) =====
 *  - package.json / tsconfig.json / .env.example
 *  - prisma/schema.prisma
 *  - src/index.ts                       ← 앱 진입점 + Express 인스턴스
 *  - src/db.ts                          ← PrismaClient 싱글톤
 *  - src/<endpoint>/<endpoint>.routes.ts ← 라우터
 *  - src/<endpoint>/<endpoint>.controller.ts ← 핸들러
 *  - src/<endpoint>/<endpoint>.service.ts    ← 비즈니스 + Prisma
 *  - src/<endpoint>/<endpoint>.dto.ts        ← 인터페이스 + helper
 *
 * REST 경로: /api/express/<endpoint>
 * 의존: gnAuditFields(), mapTsType(), mapPrismaType() (nestjs 모듈에 정의)
 */

// ----- package.json -----
function gnExpressPackageJsonSource(endpoint) {
    return `{
  "name": "${endpoint}-express-app",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build":     "tsc",
    "start":     "node dist/index.js",
    "start:dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "prisma:generate": "prisma generate",
    "prisma:push":     "prisma db push"
  },
  "dependencies": {
    "express":        "^4.21.0",
    "cors":           "^2.8.5",
    "@prisma/client": "^5.22.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors":    "^2.8.17",
    "@types/node":    "^20",
    "prisma":         "^5.22.0",
    "ts-node-dev":    "^2.0.0",
    "typescript":     "^5.4.0"
  }
}
`;
}

// ----- tsconfig.json -----
function gnExpressTsconfigSource() {
    return `{
  "compilerOptions": {
    "target": "ES2021",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
`;
}

// ----- .env.example -----
function gnExpressEnvSource(dbType) {
    const url = dbType === 'oracle'
        ? 'oracle://USER:PASSWORD@localhost:1521/XEPDB1'
        : 'postgresql://USER:PASSWORD@localhost:5432/postgres?schema=public';
    return `# Prisma DATABASE_URL
DATABASE_URL=${url}
PORT=3002
`;
}

// ----- prisma/schema.prisma (NestJS 와 동일 — 재사용) -----
function gnExpressPrismaSchemaSource(className, table, dataCols, pkCols, hasAudit, dbType) {
    return gnNestPrismaSchemaSource(className, table, dataCols, pkCols, hasAudit, dbType);
}

// ----- src/index.ts -----
function gnExpressIndexSource(endpoint, className) {
    const lower = endpoint.toLowerCase();
    return `// Express 진입점 — npm run start:dev (포트 3002 기본)
import express from 'express';
import cors from 'cors';
import ${className}Router from './${lower}/${lower}.routes';

const app = express();
app.use(cors());            // 개발용 — 운영 시 origins 화이트리스트로 좁힐 것
app.use(express.json());

// === 라우터 ===
app.use('/api/express/${endpoint}', ${className}Router);

// === 에러 핸들러 ===
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err.status ?? 500;
  res.status(status).json({ error: err.message ?? 'Internal Server Error' });
});

const port = Number(process.env.PORT ?? 3002);
app.listen(port, () => {
  console.log(\`Express API listening on http://localhost:\${port}/api/express\`);
});
`;
}

// ----- src/db.ts -----
function gnExpressDbSource() {
    return `// PrismaClient 싱글톤 (dev 핫리로드 누수 방지)
import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var _prisma: PrismaClient | undefined;
}

export const prisma = global._prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') {
  global._prisma = prisma;
}
`;
}

// ----- src/<endpoint>/<endpoint>.dto.ts -----
function gnExpressDtoSource(endpoint, className, dataCols, pkCols, nonPkCols, hasAudit) {
    const allItemCols = hasAudit ? [...dataCols, ...gnAuditFields()] : dataCols;
    const reqFields = dataCols.map(c => `  ${c.javaName}?: ${mapTsType(c.javaType)};`).join('\n');
    const itemFields = allItemCols.map(c => `  ${c.javaName}?: ${mapTsType(c.javaType)};`).join('\n');
    const condPutters = dataCols.filter(c => !c.isAudit).map(c => {
        if (c.javaType === 'String') {
            return `    if (req.${c.javaName}) m['${c.javaName}'] = req.${c.javaName};`;
        }
        return `    if (req.${c.javaName} != null) m['${c.javaName}'] = req.${c.javaName};`;
    }).join('\n');

    return `// ${className} DTO 인터페이스 + 헬퍼
export interface ${className}Request {
${reqFields}
  pageNo?: number;
  pageSize?: number;
  sortBy?: string;
  rowStatus?: string;  // 'I' / 'U' / 'D'
}

export interface ${className}Item {
${itemFields}
}

export interface ${className}Response {
  pageList: ${className}Item[];
  pageTotalCount: number;
  pageNo: number;
  pageSize: number;
  pageTotalPages: number;
  pageCond?: Record<string, any>;
}

export function buildResponse(
  pageList: ${className}Item[], pageTotalCount: number,
  pageNo: number, pageSize: number, pageCond: Record<string, any>
): ${className}Response {
  const pageTotalPages = pageSize <= 0 ? 0 : Math.ceil(pageTotalCount / pageSize);
  return { pageList, pageTotalCount, pageNo, pageSize, pageTotalPages, pageCond };
}

export function toCond(req: ${className}Request): Record<string, any> {
  const m: Record<string, any> = {};
${condPutters}
  return m;
}
`;
}

// ----- src/<endpoint>/<endpoint>.service.ts -----
function gnExpressServiceSource(endpoint, className, dataCols, pkCols, nonPkCols, hasAudit) {
    const pkParams = pkCols.map(c => `${c.javaName}: string`).join(', ');
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

    const pkWhere = pkCols.length === 1
        ? `{ ${pkCols[0].javaName} }`
        : `{ ${pkCols.map(c => c.javaName).join('_')}: { ${pkCols.map(c => c.javaName).join(', ')} } }`;

    const reqDataAssigns = nonPkCols.filter(c => !c.isAudit).map(c =>
        `      ${c.javaName}: req.${c.javaName},`
    ).concat(pkCols.map(c => `      ${c.javaName}: req.${c.javaName}!,`)).join('\n');

    const updateAssigns = nonPkCols.filter(c => !c.isAudit).map(c =>
        `      ${c.javaName}: req.${c.javaName},`
    ).join('\n');

    const patchAssigns = nonPkCols.filter(c => !c.isAudit).map(c =>
        `    if (req.${c.javaName} != null) data['${c.javaName}'] = req.${c.javaName};`
    ).join('\n');

    return `import { prisma } from '../db';
import {
  ${className}Request, ${className}Item, ${className}Response,
  buildResponse, toCond,
} from './${endpoint}.dto';

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function buildQuery(req: ${className}Request) {
  const where: any = {};
${condBlock}
  const sortMap: Record<string, any> = {
${orderByMap}
  };
  const orderBy = req.sortBy && sortMap[req.sortBy] ? sortMap[req.sortBy] : ${defaultOrderBy};
  return { where, orderBy };
}

/** 단건 조회 */
export async function selectById(${pkParams}): Promise<${className}Item> {
  const row = await prisma.${lowerCls}.findUnique({ where: ${pkWhere} });
  if (!row) {
    throw new HttpError(404, '${className} not found');
  }
  return row as ${className}Item;
}

/** 전체 목록 (옵션 페이징) */
export async function selectList(req: ${className}Request): Promise<${className}Item[]> {
  const { where, orderBy } = buildQuery(req);
  const args: any = { where, orderBy };
  if ((req.pageSize ?? 0) > 0 && (req.pageNo ?? 0) > 0) {
    args.skip = ((req.pageNo ?? 1) - 1) * (req.pageSize ?? 10);
    args.take = req.pageSize ?? 10;
  }
  return await prisma.${lowerCls}.findMany(args) as ${className}Item[];
}

/** 페이지 목록 */
export async function selectPageList(req: ${className}Request): Promise<${className}Response> {
  const pageNo   = (req.pageNo   ?? 0) > 0 ? req.pageNo!   : 1;
  const pageSize = (req.pageSize ?? 0) > 0 ? req.pageSize! : 10;

  const { where, orderBy } = buildQuery(req);
  const [rows, total] = await Promise.all([
    prisma.${lowerCls}.findMany({
      where, orderBy, skip: (pageNo - 1) * pageSize, take: pageSize,
    }),
    prisma.${lowerCls}.count({ where }),
  ]);
  return buildResponse(rows as ${className}Item[], total, pageNo, pageSize, toCond(req));
}

/** 등록 */
export async function insert(req: ${className}Request): Promise<${className}Item> {
  const row = await prisma.${lowerCls}.create({
    data: {
${reqDataAssigns}
    },
  });
  return row as ${className}Item;
}

/** 수정 (전체 교체) */
export async function update(${pkParams}, req: ${className}Request): Promise<${className}Item> {
  try {
    const row = await prisma.${lowerCls}.update({
      where: ${pkWhere},
      data: {
${updateAssigns}
      },
    });
    return row as ${className}Item;
  } catch {
    throw new HttpError(404, '${className} not found');
  }
}

/** 부분 수정 (PATCH) */
export async function patch(${pkParams}, req: ${className}Request): Promise<${className}Item> {
  try {
    const data: Record<string, any> = {};
${patchAssigns}
    const row = await prisma.${lowerCls}.update({ where: ${pkWhere}, data });
    return row as ${className}Item;
  } catch {
    throw new HttpError(404, '${className} not found');
  }
}

/** 삭제 */
export async function deleteOne(${pkParams}): Promise<void> {
  try {
    await prisma.${lowerCls}.delete({ where: ${pkWhere} });
  } catch {
    throw new HttpError(404, '${className} not found');
  }
}

/** 단건 일괄 저장 (rowStatus=I/U/D) */
export async function saveOne(req: ${className}Request): Promise<${className}Item | null> {
  const rs = (req.rowStatus ?? '').trim().toUpperCase();
  const pkArgs = [${pkCols.map(c => `req.${c.javaName}!`).join(', ')}] as const;
  if (rs === 'I') return insert(req);
  if (rs === 'U') return update(...pkArgs, req);
  if (rs === 'D') { await deleteOne(...pkArgs); return null; }
  throw new HttpError(400, \`Unknown rowStatus: [\${req.rowStatus}] (expected I/U/D)\`);
}

/** 목록 일괄 저장 (D → U → I) */
export async function saveList(reqList: ${className}Request[]): Promise<void> {
  if (!reqList?.length) return;
  for (const r of reqList) if ((r.rowStatus ?? '').trim().toUpperCase() === 'D') await saveOne(r);
  for (const r of reqList) if ((r.rowStatus ?? '').trim().toUpperCase() === 'U') await saveOne(r);
  for (const r of reqList) if ((r.rowStatus ?? '').trim().toUpperCase() === 'I') await saveOne(r);
}
`;
}

// ----- src/<endpoint>/<endpoint>.controller.ts -----
function gnExpressControllerSource(endpoint, className, pkCols) {
    const pkParamRead = pkCols.map(c => `  const ${c.javaName} = req.params.${c.javaName};`).join('\n');
    const pkArgs = pkCols.map(c => c.javaName).join(', ');

    return `import { Request, Response, NextFunction } from 'express';
import * as service from './${endpoint}.service';
import { ${className}Request } from './${endpoint}.dto';

export async function pageList(req: Request, res: Response, next: NextFunction) {
  try {
    const r: ${className}Request = {
      ...req.query,
      pageNo:   req.query.pageNo   ? Number(req.query.pageNo)   : 1,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : 10,
    } as ${className}Request;
    res.json(await service.selectPageList(r));
  } catch (e) { next(e); }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const r: ${className}Request = {
      ...req.query,
      pageNo:   req.query.pageNo   ? Number(req.query.pageNo)   : 0,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : 0,
    } as ${className}Request;
    res.json(await service.selectList(r));
  } catch (e) { next(e); }
}

export async function selectById(req: Request, res: Response, next: NextFunction) {
  try {
${pkParamRead}
    res.json(await service.selectById(${pkArgs}));
  } catch (e) { next(e); }
}

export async function insert(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.insert(req.body as ${className}Request));
  } catch (e) { next(e); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
${pkParamRead}
    res.json(await service.update(${pkArgs}, req.body as ${className}Request));
  } catch (e) { next(e); }
}

export async function patch(req: Request, res: Response, next: NextFunction) {
  try {
${pkParamRead}
    res.json(await service.patch(${pkArgs}, req.body as ${className}Request));
  } catch (e) { next(e); }
}

export async function deleteOne(req: Request, res: Response, next: NextFunction) {
  try {
${pkParamRead}
    await service.deleteOne(${pkArgs});
    res.status(204).end();
  } catch (e) { next(e); }
}

export async function saveOne(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.saveOne(req.body as ${className}Request));
  } catch (e) { next(e); }
}

export async function saveList(req: Request, res: Response, next: NextFunction) {
  try {
    await service.saveList(req.body as ${className}Request[]);
    res.status(204).end();
  } catch (e) { next(e); }
}
`;
}

// ----- src/<endpoint>/<endpoint>.routes.ts -----
function gnExpressRoutesSource(endpoint, className, pkCols) {
    const pkRoute = pkCols.map(c => `:${c.javaName}`).join('/');

    return `import { Router } from 'express';
import * as ctrl from './${endpoint}.controller';

const router = Router();

router.get('/page-list',          ctrl.pageList);
router.get('/list',               ctrl.list);
router.post('/save-one',          ctrl.saveOne);
router.post('/save-list',         ctrl.saveList);
router.post('/',                  ctrl.insert);
router.get('/${pkRoute}',         ctrl.selectById);
router.put('/${pkRoute}',         ctrl.update);
router.patch('/${pkRoute}',       ctrl.patch);
router.delete('/${pkRoute}',      ctrl.deleteOne);

export default router;
`;
}
