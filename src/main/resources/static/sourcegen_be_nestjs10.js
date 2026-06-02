/* ===== Source Generator : Backend (NestJS 10 + Prisma) =====
 * 모듈/컨트롤러/서비스 + Prisma schema + DTO + main.ts.
 *
 *  - package.json / tsconfig.json / nest-cli.json / .env.example
 *  - src/main.ts                          ← 진입점 (NestFactory)
 *  - src/app.module.ts                    ← 루트 모듈
 *  - prisma/schema.prisma                 ← DB 스키마
 *  - src/prisma/prisma.module.ts          ← PrismaService DI
 *  - src/prisma/prisma.service.ts
 *  - src/<endpoint>/<endpoint>.module.ts
 *  - src/<endpoint>/<endpoint>.controller.ts
 *  - src/<endpoint>/<endpoint>.service.ts
 *  - src/<endpoint>/dto/<class>.dto.ts    ← Request / Item / Response
 *
 * REST 경로: /api/nestjs/<endpoint>
 * 의존: gnAuditFields() (sourcegen.js), mapTsType()
 */

// ----- package.json -----
function gnNestPackageJsonSource(endpoint) {
    return `{
  "name": "${endpoint}-nestjs-app",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build":       "nest build",
    "start":       "nest start",
    "start:dev":   "nest start --watch",
    "prisma:generate": "prisma generate",
    "prisma:push":     "prisma db push"
  },
  "dependencies": {
    "@nestjs/common":    "^10.4.0",
    "@nestjs/core":      "^10.4.0",
    "@nestjs/platform-express": "^10.4.0",
    "@prisma/client":    "^5.22.0",
    "class-transformer": "^0.5.1",
    "class-validator":   "^0.14.1",
    "reflect-metadata":  "^0.2.2",
    "rxjs":              "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli":       "^10.4.0",
    "@types/node":       "^20",
    "prisma":            "^5.22.0",
    "ts-node":           "^10.9.2",
    "typescript":        "^5.4.0"
  }
}
`;
}

// ----- tsconfig.json -----
function gnNestTsconfigSource() {
    return `{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": false,
    "noFallthroughCasesInSwitch": false
  }
}
`;
}

// ----- nest-cli.json -----
function gnNestCliJsonSource() {
    return `{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
`;
}

// ----- .env.example -----
function gnNestEnvSource(dbType) {
    const url = dbType === 'oracle'
        ? 'oracle://USER:PASSWORD@localhost:1521/XEPDB1'
        : 'postgresql://USER:PASSWORD@localhost:5432/postgres?schema=public';
    return `# Prisma DATABASE_URL
DATABASE_URL=${url}
`;
}

// ----- prisma/schema.prisma -----
function gnNestPrismaSchemaSource(className, table, dataCols, pkCols, hasAudit, dbType) {
    const allItemCols = hasAudit ? [...dataCols, ...gnAuditFields()] : dataCols;
    const provider = dbType === 'oracle' ? 'oracle' : 'postgresql';
    const fields = allItemCols.map(c => {
        const t = mapPrismaType(c.javaType);
        const optional = c.nullable ? '?' : '';
        const id = c.isPk ? ' @id' : '';
        const map = ` @map("${c.name}")`;
        return `  ${c.javaName}  ${t}${optional}${id}${map}`;
    }).join('\n');

    // 복합 PK 처리 — @@id([...])
    const compositeId = pkCols.length > 1
        ? `\n  @@id([${pkCols.map(c => c.javaName).join(', ')}])`
        : '';

    // 단일 PK 시 위에서 @id 표시되었으므로 schema 의 첫 PK 컬럼만 정상.
    // 복합 PK 시 위 fields 의 @id 를 제거해야 함 — 단순화 위해 별도 처리:
    const fieldsCleaned = pkCols.length > 1
        ? fields.replace(/ @id/g, '')
        : fields;

    return `// Prisma schema — ${className}
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${provider}"
  url      = env("DATABASE_URL")
}

model ${className} {
${fieldsCleaned}${compositeId}

  @@map("${table}")
}
`;
}

// ----- src/prisma/prisma.module.ts -----
function gnNestPrismaModuleSource() {
    return `import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
`;
}

// ----- src/prisma/prisma.service.ts -----
function gnNestPrismaServiceSource() {
    return `import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
`;
}

// ----- src/main.ts -----
function gnNestMainSource() {
    return `// NestJS 진입점 — npm run start:dev (포트 3001 기본)
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/nestjs');
  app.enableCors();  // 개발용 — 운영 시 origins 화이트리스트로 좁힐 것
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  await app.listen(3001);
  console.log('NestJS API listening on http://localhost:3001/api/nestjs');
}
bootstrap();
`;
}

// ----- src/app.module.ts -----
function gnNestAppModuleSource(endpoint, className) {
    const lower = endpoint.toLowerCase();
    return `import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ${className}Module } from './${lower}/${lower}.module';

@Module({
  imports: [PrismaModule, ${className}Module],
})
export class AppModule {}
`;
}

// ----- src/<endpoint>/<endpoint>.module.ts -----
function gnNestFeatureModuleSource(endpoint, className) {
    return `import { Module } from '@nestjs/common';
import { ${className}Controller } from './${endpoint}.controller';
import { ${className}Service } from './${endpoint}.service';

@Module({
  controllers: [${className}Controller],
  providers:   [${className}Service],
})
export class ${className}Module {}
`;
}

// ----- src/<endpoint>/dto/<class>.dto.ts -----
function gnNestDtoSource(endpoint, className, dataCols, pkCols, nonPkCols, hasAudit) {
    const allItemCols = hasAudit ? [...dataCols, ...gnAuditFields()] : dataCols;

    const reqProps = dataCols.map(c => {
        const t = mapTsType(c.javaType);
        const required = !c.nullable && !c.isAudit;
        const decorators = [];
        if (required && c.javaType === 'String') {
            decorators.push(`  @IsNotEmpty({ message: '${c.javaName}는 필수입니다' })`);
        }
        if (c.javaType === 'String') {
            decorators.push(`  @IsString()`);
            if (c.size) {
                decorators.push(`  @MaxLength(${c.size})`);
            }
        } else if (c.javaType === 'Integer' || c.javaType === 'Long') {
            decorators.push(`  @IsInt()`);
        } else if (c.javaType === 'Boolean') {
            decorators.push(`  @IsBoolean()`);
        }
        if (c.nullable && !required) {
            decorators.push(`  @IsOptional()`);
        }
        const decoStr = decorators.length ? decorators.join('\n') + '\n' : '';
        return `${decoStr}  ${c.javaName}?: ${t};`;
    }).join('\n\n');

    const itemProps = allItemCols.map(c => {
        const t = mapTsType(c.javaType);
        return `  ${c.javaName}?: ${t};`;
    }).join('\n');

    const condPutters = dataCols.filter(c => !c.isAudit).map(c => {
        if (c.javaType === 'String') {
            return `    if (req.${c.javaName}) m['${c.javaName}'] = req.${c.javaName};`;
        }
        return `    if (req.${c.javaName} != null) m['${c.javaName}'] = req.${c.javaName};`;
    }).join('\n');

    return `import {
  IsNotEmpty, IsOptional, IsString, IsInt, IsBoolean, MaxLength,
} from 'class-validator';

/** 요청 DTO (등록/수정/검색/페이징/정렬/일괄저장 통합) */
export class ${className}RequestDto {
${reqProps}

  // === 페이징/정렬/일괄저장 메타 ===
  @IsOptional() pageNo?: number = 1;
  @IsOptional() pageSize?: number = 10;
  @IsOptional() sortBy?: string;
  @IsOptional() rowStatus?: string;  // 'I' / 'U' / 'D'

  get offset(): number {
    return ((this.pageNo ?? 1) - 1) * (this.pageSize ?? 10);
  }
}

/** 응답 DTO (단건/목록 행) */
export class ${className}ItemDto {
${itemProps}
}

/** 페이지 응답 DTO */
export class ${className}ResponseDto {
  pageList!: ${className}ItemDto[];
  pageTotalCount!: number;
  pageNo!: number;
  pageSize!: number;
  pageTotalPages!: number;
  pageCond?: Record<string, any>;

  static of(
    pageList: ${className}ItemDto[], pageTotalCount: number,
    pageNo: number, pageSize: number, pageCond: Record<string, any>
  ): ${className}ResponseDto {
    const pageTotalPages = pageSize <= 0 ? 0 : Math.ceil(pageTotalCount / pageSize);
    return { pageList, pageTotalCount, pageNo, pageSize, pageTotalPages, pageCond };
  }

  static toCond(req: ${className}RequestDto): Record<string, any> {
    const m: Record<string, any> = {};
${condPutters}
    return m;
  }
}
`;
}

// ----- src/<endpoint>/<endpoint>.service.ts -----
function gnNestServiceSource(endpoint, className, dataCols, pkCols, nonPkCols, hasAudit) {
    const pkParams = pkCols.map(c => `${c.javaName}: string`).join(', ');
    const pkObj = pkCols.length === 1
        ? pkCols[0].javaName
        : `{ ${pkCols.map(c => c.javaName).join(', ')} }`;

    const stringDataCols = dataCols.filter(c => c.javaType === 'String' && !c.isAudit);
    const condBlock = stringDataCols.map(c =>
        `    if (req.${c.javaName}) where.${c.javaName} = { contains: req.${c.javaName}, mode: 'insensitive' as const };`
    ).join('\n');

    const orderByMap = dataCols.filter(c => !c.isAudit).flatMap(c => [
        `      '${c.javaName} asc':  { ${c.javaName}: 'asc' as const },`,
        `      '${c.javaName} desc': { ${c.javaName}: 'desc' as const },`
    ]).join('\n');
    const defaultOrderBy = pkCols.length === 1
        ? `{ ${pkCols[0].javaName}: 'asc' as const }`
        : `[${pkCols.map(c => `{ ${c.javaName}: 'asc' as const }`).join(', ')}]`;

    const reqDataAssigns = nonPkCols.filter(c => !c.isAudit).map(c =>
        `      ${c.javaName}: req.${c.javaName},`
    ).concat(pkCols.map(c => `      ${c.javaName}: req.${c.javaName}!,`)).join('\n');

    const updateAssigns = nonPkCols.filter(c => !c.isAudit).map(c =>
        `      ${c.javaName}: req.${c.javaName},`
    ).join('\n');

    return `import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ${className}RequestDto,
  ${className}ItemDto,
  ${className}ResponseDto,
} from './dto/${endpoint}.dto';

@Injectable()
export class ${className}Service {
  constructor(private readonly prisma: PrismaService) {}

  /** 단건 조회 */
  async selectById(${pkParams}): Promise<${className}ItemDto> {
    const row = await this.prisma.${className.charAt(0).toLowerCase() + className.slice(1)}.findUnique({
      where: ${pkCols.length === 1 ? `{ ${pkCols[0].javaName} }` : `{ ${pkCols.map(c => c.javaName).join('_')}: ${pkObj} }`},
    });
    if (!row) {
      throw new NotFoundException('${className} not found');
    }
    return row as ${className}ItemDto;
  }

  /** 전체 목록 (옵션 페이징) */
  async selectList(req: ${className}RequestDto): Promise<${className}ItemDto[]> {
    const { where, orderBy } = this.buildQuery(req);
    const args: any = { where, orderBy };
    if ((req.pageSize ?? 0) > 0 && (req.pageNo ?? 0) > 0) {
      args.skip = ((req.pageNo ?? 1) - 1) * (req.pageSize ?? 10);
      args.take = req.pageSize ?? 10;
    }
    const rows = await this.prisma.${className.charAt(0).toLowerCase() + className.slice(1)}.findMany(args);
    return rows as ${className}ItemDto[];
  }

  /** 페이지 목록 */
  async selectPageData(req: ${className}RequestDto): Promise<${className}ResponseDto> {
    const pageNo   = (req.pageNo   ?? 0) > 0 ? req.pageNo!   : 1;
    const pageSize = (req.pageSize ?? 0) > 0 ? req.pageSize! : 10;

    const { where, orderBy } = this.buildQuery(req);
    const [rows, total] = await Promise.all([
      this.prisma.${className.charAt(0).toLowerCase() + className.slice(1)}.findMany({
        where, orderBy, skip: (pageNo - 1) * pageSize, take: pageSize,
      }),
      this.prisma.${className.charAt(0).toLowerCase() + className.slice(1)}.count({ where }),
    ]);
    return ${className}ResponseDto.of(
      rows as ${className}ItemDto[], total, pageNo, pageSize,
      ${className}ResponseDto.toCond(req)
    );
  }

  /** 등록 */
  async insert(req: ${className}RequestDto): Promise<${className}ItemDto> {
    const row = await this.prisma.${className.charAt(0).toLowerCase() + className.slice(1)}.create({
      data: {
${reqDataAssigns}
      },
    });
    return row as ${className}ItemDto;
  }

  /** 수정 (전체 교체) */
  async update(${pkParams}, req: ${className}RequestDto): Promise<${className}ItemDto> {
    try {
      const row = await this.prisma.${className.charAt(0).toLowerCase() + className.slice(1)}.update({
        where: ${pkCols.length === 1 ? `{ ${pkCols[0].javaName} }` : `{ ${pkCols.map(c => c.javaName).join('_')}: ${pkObj} }`},
        data: {
${updateAssigns}
        },
      });
      return row as ${className}ItemDto;
    } catch {
      throw new NotFoundException('${className} not found');
    }
  }

  /** 부분 수정 (PATCH) */
  async patch(${pkParams}, req: ${className}RequestDto): Promise<${className}ItemDto> {
    try {
      const data: Record<string, any> = {};
${nonPkCols.filter(c => !c.isAudit).map(c => `      if (req.${c.javaName} != null) data['${c.javaName}'] = req.${c.javaName};`).join('\n')}
      const row = await this.prisma.${className.charAt(0).toLowerCase() + className.slice(1)}.update({
        where: ${pkCols.length === 1 ? `{ ${pkCols[0].javaName} }` : `{ ${pkCols.map(c => c.javaName).join('_')}: ${pkObj} }`},
        data,
      });
      return row as ${className}ItemDto;
    } catch {
      throw new NotFoundException('${className} not found');
    }
  }

  /** 삭제 */
  async delete(${pkParams}): Promise<void> {
    try {
      await this.prisma.${className.charAt(0).toLowerCase() + className.slice(1)}.delete({
        where: ${pkCols.length === 1 ? `{ ${pkCols[0].javaName} }` : `{ ${pkCols.map(c => c.javaName).join('_')}: ${pkObj} }`},
      });
    } catch {
      throw new NotFoundException('${className} not found');
    }
  }

  /** 단건 일괄 저장 (rowStatus = I/U/D) */
  async saveOne(req: ${className}RequestDto): Promise<${className}ItemDto | null> {
    const rs = (req.rowStatus ?? '').trim().toUpperCase();
    const pkArgs = [${pkCols.map(c => `req.${c.javaName}!`).join(', ')}] as const;
    if (rs === 'I') return this.insert(req);
    if (rs === 'U') return this.update(...pkArgs, req);
    if (rs === 'D') { await this.delete(...pkArgs); return null; }
    throw new BadRequestException(\`Unknown rowStatus: [\${req.rowStatus}] (expected I/U/D)\`);
  }

  /** 목록 일괄 저장 (D → U → I) */
  async saveList(reqList: ${className}RequestDto[]): Promise<void> {
    if (!reqList?.length) return;
    for (const r of reqList) if ((r.rowStatus ?? '').toUpperCase().trim() === 'D') await this.saveOne(r);
    for (const r of reqList) if ((r.rowStatus ?? '').toUpperCase().trim() === 'U') await this.saveOne(r);
    for (const r of reqList) if ((r.rowStatus ?? '').toUpperCase().trim() === 'I') await this.saveOne(r);
  }

  /** 검색조건 + 정렬 빌드 */
  private buildQuery(req: ${className}RequestDto) {
    const where: any = {};
${condBlock}
    const sortMap: Record<string, any> = {
${orderByMap}
    };
    const orderBy = req.sortBy && sortMap[req.sortBy] ? sortMap[req.sortBy] : ${defaultOrderBy};
    return { where, orderBy };
  }
}
`;
}

// ----- src/<endpoint>/<endpoint>.controller.ts -----
function gnNestControllerSource(endpoint, className, pkCols) {
    const pkRoute = pkCols.map(c => `:${c.javaName}`).join('/');
    const pkParams = pkCols.map(c => `@Param('${c.javaName}') ${c.javaName}: string`).join(', ');
    const pkArgs = pkCols.map(c => c.javaName).join(', ');

    return `import {
  Controller, Get, Post, Put, Patch, Delete,
  Param, Body, Query, HttpCode,
} from '@nestjs/common';
import { ${className}Service } from './${endpoint}.service';
import {
  ${className}RequestDto,
  ${className}ItemDto,
  ${className}ResponseDto,
} from './dto/${endpoint}.dto';

@Controller('${endpoint}')
export class ${className}Controller {
  constructor(private readonly service: ${className}Service) {}

  /** 페이지 목록 */
  @Get('page-list')
  pageList(@Query() req: ${className}RequestDto): Promise<${className}ResponseDto> {
    return this.service.selectPageData(req);
  }

  /** 전체 목록 */
  @Get('list')
  list(@Query() req: ${className}RequestDto): Promise<${className}ItemDto[]> {
    return this.service.selectList(req);
  }

  /** 단건 조회 */
  @Get('${pkRoute}')
  selectById(${pkParams}): Promise<${className}ItemDto> {
    return this.service.selectById(${pkArgs});
  }

  /** 등록 */
  @Post()
  insert(@Body() req: ${className}RequestDto): Promise<${className}ItemDto> {
    return this.service.insert(req);
  }

  /** 수정 (전체 교체) */
  @Put('${pkRoute}')
  update(${pkParams}, @Body() req: ${className}RequestDto): Promise<${className}ItemDto> {
    return this.service.update(${pkArgs}, req);
  }

  /** 부분 수정 (PATCH) */
  @Patch('${pkRoute}')
  patch(${pkParams}, @Body() req: ${className}RequestDto): Promise<${className}ItemDto> {
    return this.service.patch(${pkArgs}, req);
  }

  /** 삭제 */
  @Delete('${pkRoute}')
  @HttpCode(204)
  async delete(${pkParams}): Promise<void> {
    await this.service.delete(${pkArgs});
  }

  /** 단건 일괄 저장 (rowStatus=I/U/D) */
  @Post('save-one')
  saveOne(@Body() req: ${className}RequestDto): Promise<${className}ItemDto | null> {
    return this.service.saveOne(req);
  }

  /** 목록 일괄 저장 (D → U → I) */
  @Post('save-list')
  @HttpCode(204)
  async saveList(@Body() reqList: ${className}RequestDto[]): Promise<void> {
    await this.service.saveList(reqList);
  }
}
`;
}

function mapPrismaType(javaType) {
    switch (javaType) {
        case 'String':              return 'String';
        case 'Integer':             return 'Int';
        case 'Long':                return 'BigInt';
        case 'Boolean':             return 'Boolean';
        case 'LocalDateTime':       return 'DateTime';
        case 'LocalDate':           return 'DateTime';
        case 'java.math.BigDecimal':return 'Decimal';
        default:                    return 'String';
    }
}
