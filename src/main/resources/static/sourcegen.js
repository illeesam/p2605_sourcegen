/* ===== Source Generator : Main =====
 * 진입점 gnGenerate() + DDL 파서 + 공통 헬퍼(gnAuditFields/cap) + gnApiJsSource(공유)
 * 분리 파일 (브라우저는 단순 글로벌 스코프 공유):
 *  - sourcegen_be_jpa.js
 *  - sourcegen_be_mybatis.js
 *  - sourcegen_fe_vue3.js
 *  - sourcegen_fe_react.js
 */

function gnParseDdl(ddl, dbType /* 'oracle' | 'postgresql' */) {
    // CREATE TABLE schema.tbl ( ... );
    const tblRe = /CREATE\s+TABLE\s+(?:(\w+)\.)?(\w+)\s*\(([\s\S]*?)\)\s*;/i;
    const m = ddl.match(tblRe);
    if (!m) throw new Error('CREATE TABLE 문을 찾을 수 없습니다');
    const schema = m[1] || '';
    const table = m[2];
    const body = m[3];

    // PRIMARY KEY 행 추출
    const pkRe = /CONSTRAINT\s+\w+\s+PRIMARY\s+KEY\s*\(([^)]+)\)/i;
    const pkMatch = body.match(pkRe);
    const pkCols = pkMatch
        ? pkMatch[1].split(',').map(s => s.trim().toLowerCase())
        : [];

    // 컬럼 행 파싱 (CONSTRAINT 행 제외)
    const cols = [];
    body.split(/,\s*\n/).forEach(line => {
        line = line.trim();
        if (!line || /^constraint/i.test(line)) return;
        // colName  TYPE(N)  NULL/NOT NULL ...
        const cm = line.match(/^(\w+)\s+([A-Za-z0-9]+)(?:\s*\(\s*(\d+)\s*\))?\s*(NOT\s+NULL|NULL)?/i);
        if (!cm) return;
        const name = cm[1].toLowerCase();
        const sqlType = cm[2].toUpperCase();
        const size = cm[3] ? parseInt(cm[3]) : null;
        const nullable = !/NOT\s+NULL/i.test(cm[4] || '');
        cols.push({
            name, sqlType, size, nullable,
            javaType: fmJavaType(sqlType),
            javaName: fmSnakeToCamel(name),
            isPk: pkCols.includes(name),
            isAudit: ['reg_id', 'reg_dt', 'upd_id', 'upd_dt'].includes(name)
        });
    });

    // COMMENT ON COLUMN ...
    const commentRe = /COMMENT\s+ON\s+COLUMN\s+\S*\.?\S*\.(\w+)\s+IS\s+'([^']+)'/gi;
    let cm;
    while ((cm = commentRe.exec(ddl)) !== null) {
        const col = cols.find(c => c.name === cm[1].toLowerCase());
        if (col) col.comment = cm[2];
    }

    return { schema, table, cols, pkCols, dbType };
}

function fmJavaType(sqlType) {
    const t = sqlType.toUpperCase();
    if (t.includes('CHAR') || t.includes('TEXT') || t === 'CLOB') return 'String';
    if (t === 'TIMESTAMP' || t === 'DATETIME') return 'LocalDateTime';
    if (t === 'DATE') return 'LocalDate';
    if (t === 'NUMBER' || t.includes('DECIMAL') || t.includes('NUMERIC')) return 'java.math.BigDecimal';
    if (t === 'INT' || t === 'INTEGER' || t === 'INT4') return 'Integer';
    if (t === 'BIGINT' || t === 'INT8' || t === 'LONG') return 'Long';
    if (t === 'BOOLEAN' || t === 'BIT') return 'Boolean';
    return 'String';
}

function fmSnakeToCamel(s) {
    return s.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
function fmSnakeToPascal(s) {
    const c = fmSnakeToCamel(s);
    return c.charAt(0).toUpperCase() + c.slice(1);
}

// ====== 코드 생성 ======
function gnGenerate(meta, opts) {
    const pkg = opts.basePackage || 'com.exam.app';
    const className = opts.className || fmSnakeToPascal(meta.table);          // ex) ZzExam1
    const varName = fmSnakeToCamel(className.charAt(0).toLowerCase() + className.slice(1)); // ex) zzExam1
    const endpoint = opts.endpoint || meta.table.replace(/^[a-z]+_/, '');  // ex) exam1

    const dataCols = meta.cols.filter(c => !c.isAudit);
    const auditCols = meta.cols.filter(c => c.isAudit);
    const hasAudit = auditCols.length === 4;
    const pkCols = dataCols.filter(c => c.isPk);
    const nonPkCols = dataCols.filter(c => !c.isPk);

    const usesLocalDate = dataCols.some(c => c.javaType === 'LocalDateTime' || c.javaType === 'LocalDate');

    const files = {};

    // ===================== Backend (JPA) =====================
    // Entity
    if (pkCols.length > 1) {
        files[`backend_jpa/domain/${className}Id.java`] = gnEntityIdSource(pkg, className, pkCols);
    }
    files[`backend_jpa/domain/${className}.java`] = gnEntitySource(pkg, className, meta.table, dataCols, pkCols, hasAudit);

    // Dto (jpa / mybatis 공유 가능하지만, 풀세트 정책으로 각각 따로 둠)
    files[`backend_jpa/dto/${className}Dto.java`] = gnDtoSource(pkg, className, dataCols, pkCols, nonPkCols, hasAudit, usesLocalDate);

    // Repository
    files[`backend_jpa/repository/${className}Repository.java`] = gnRepoSource(pkg, className, pkCols);
    files[`backend_jpa/repository/${className}RepositoryCustom.java`] = gnRepoCustomSource(pkg, className, pkCols);
    files[`backend_jpa/repository/impl/${className}RepositoryCustomImpl.java`] =
        gnRepoCustomImplSource(pkg, className, varName, dataCols, pkCols, hasAudit);

    // Service
    files[`backend_jpa/service/${className}Service.java`] = gnServiceSource(pkg, className, pkCols, nonPkCols);

    // Controller (경로: /api/${endpoint})
    files[`backend_jpa/controller/${className}Controller.java`] = gnControllerSource(pkg, className, endpoint, pkCols);

    // ===================== Backend (MyBatis) =====================
    // Dto (jpa 와 동일 구조 — 독립적으로 사용 가능하도록 풀세트)
    files[`backend_mybatis/dto/${className}Dto.java`] =
        gnMybatisDtoSource(pkg, className, dataCols, pkCols, nonPkCols, hasAudit, usesLocalDate);
    // Mapper interface
    files[`backend_mybatis/mapper/${className}Mapper.java`] =
        gnMybatisMapperSource(pkg, className, pkCols);
    // Mapper XML
    files[`backend_mybatis/mapper/${className}Mapper.xml`] =
        gnMybatisMapperXmlSource(pkg, className, meta.table, dataCols, pkCols, nonPkCols, hasAudit);
    // Service
    files[`backend_mybatis/service/${className}Service.java`] =
        gnMybatisServiceSource(pkg, className, pkCols, nonPkCols);
    // Controller (경로: /api/mybatis/${endpoint} — jpa 와 충돌 방지)
    files[`backend_mybatis/controller/${className}Controller.java`] =
        gnMybatisControllerSource(pkg, className, endpoint, pkCols);

    // ===================== Backend (Python — FastAPI + SQLAlchemy) =====================
    const dbType = meta.dbType || 'oracle';
    files[`backend_python/main.py`]              = gnPyMainSource(endpoint, className);
    files[`backend_python/database.py`]          = gnPyDatabaseSource(dbType);
    files[`backend_python/config.py`]            = gnPyConfigSource(dbType);
    files[`backend_python/requirements.txt`]     = gnPyRequirementsSource(dbType);
    files[`backend_python/models/${endpoint}.py`]   = gnPyModelSource(endpoint, className, meta.table, dataCols, pkCols, hasAudit);
    files[`backend_python/schemas/${endpoint}.py`]  = gnPySchemaSource(endpoint, className, dataCols, pkCols, nonPkCols, hasAudit);
    files[`backend_python/crud/${endpoint}.py`]     = gnPyCrudSource(endpoint, className, dataCols, pkCols, nonPkCols, hasAudit);
    files[`backend_python/services/${endpoint}.py`] = gnPyServiceSource(endpoint, className, pkCols);
    files[`backend_python/routers/${endpoint}.py`]  = gnPyRouterSource(endpoint, className, pkCols);

    // ===================== Backend (C# .NET — EF Core) =====================
    // RootNamespace: basePackage 의 마지막 세그먼트를 PascalCase 로 (com.exam.app → ExamApp)
    const rootNs = pkg.split('.').slice(-2).map(s => fmSnakeToPascal(s)).join('') || 'GeneratedApp';
    files[`backend_csharp_efcore/Program.cs`]                          = gnCsEfProgramSource(rootNs);
    files[`backend_csharp_efcore/appsettings.json`]                    = gnCsEfAppSettingsSource(dbType);
    files[`backend_csharp_efcore/${rootNs}.csproj`]                    = gnCsEfCsprojSource(rootNs, dbType);
    files[`backend_csharp_efcore/Data/AppDbContext.cs`]                = gnCsEfDbContextSource(rootNs, className);
    files[`backend_csharp_efcore/Models/${className}.cs`]              = gnCsEfModelSource(rootNs, className, meta.table, dataCols, pkCols, hasAudit);
    files[`backend_csharp_efcore/Dtos/${className}Dto.cs`]             = gnCsEfDtoSource(rootNs, className, dataCols, pkCols, nonPkCols, hasAudit);
    files[`backend_csharp_efcore/Repositories/${className}Repository.cs`] = gnCsEfRepoSource(rootNs, className, dataCols, pkCols, nonPkCols, hasAudit);
    files[`backend_csharp_efcore/Services/${className}Service.cs`]     = gnCsEfServiceSource(rootNs, className, pkCols, nonPkCols, hasAudit);
    files[`backend_csharp_efcore/Controllers/${className}Controller.cs`] = gnCsEfControllerSource(rootNs, className, endpoint, pkCols);

    // ===================== Backend (C# .NET — Dapper) =====================
    files[`backend_csharp_dapper/Program.cs`]                          = gnCsDpProgramSource(rootNs);
    files[`backend_csharp_dapper/appsettings.json`]                    = gnCsDpAppSettingsSource(dbType);
    files[`backend_csharp_dapper/${rootNs}.csproj`]                    = gnCsDpCsprojSource(rootNs, dbType);
    files[`backend_csharp_dapper/Data/DbConnectionFactory.cs`]         = gnCsDpConnectionFactorySource(rootNs);
    files[`backend_csharp_dapper/Models/${className}.cs`]              = gnCsDpModelSource(rootNs, className, meta.table, dataCols, pkCols, hasAudit);
    files[`backend_csharp_dapper/Dtos/${className}Dto.cs`]             = gnCsDpDtoSource(rootNs, className, dataCols, pkCols, nonPkCols, hasAudit);
    files[`backend_csharp_dapper/Repositories/${className}Repository.cs`] = gnCsDpRepoSource(rootNs, className, meta.table, dataCols, pkCols, nonPkCols, hasAudit);
    files[`backend_csharp_dapper/Services/${className}Service.cs`]     = gnCsDpServiceSource(rootNs, className, pkCols, nonPkCols, hasAudit);
    files[`backend_csharp_dapper/Controllers/${className}Controller.cs`] = gnCsDpControllerSource(rootNs, className, endpoint, pkCols);

    // ===================== Backend (NestJS 10 + Prisma) =====================
    const lowerEp = endpoint.toLowerCase();
    files[`backend_nestjs/package.json`]                            = gnNestPackageJsonSource(endpoint);
    files[`backend_nestjs/tsconfig.json`]                           = gnNestTsconfigSource();
    files[`backend_nestjs/nest-cli.json`]                           = gnNestCliJsonSource();
    files[`backend_nestjs/.env.example`]                            = gnNestEnvSource(dbType);
    files[`backend_nestjs/prisma/schema.prisma`]                    = gnNestPrismaSchemaSource(className, meta.table, dataCols, pkCols, hasAudit, dbType);
    files[`backend_nestjs/src/main.ts`]                             = gnNestMainSource();
    files[`backend_nestjs/src/app.module.ts`]                       = gnNestAppModuleSource(endpoint, className);
    files[`backend_nestjs/src/prisma/prisma.module.ts`]             = gnNestPrismaModuleSource();
    files[`backend_nestjs/src/prisma/prisma.service.ts`]            = gnNestPrismaServiceSource();
    files[`backend_nestjs/src/${lowerEp}/${lowerEp}.module.ts`]     = gnNestFeatureModuleSource(endpoint, className);
    files[`backend_nestjs/src/${lowerEp}/${lowerEp}.controller.ts`] = gnNestControllerSource(endpoint, className, pkCols);
    files[`backend_nestjs/src/${lowerEp}/${lowerEp}.service.ts`]    = gnNestServiceSource(endpoint, className, dataCols, pkCols, nonPkCols, hasAudit);
    files[`backend_nestjs/src/${lowerEp}/dto/${lowerEp}.dto.ts`]    = gnNestDtoSource(endpoint, className, dataCols, pkCols, nonPkCols, hasAudit);

    // ===================== Backend (Express 4 + Prisma) =====================
    files[`backend_expressjs/package.json`]                              = gnExpressPackageJsonSource(endpoint);
    files[`backend_expressjs/tsconfig.json`]                             = gnExpressTsconfigSource();
    files[`backend_expressjs/.env.example`]                              = gnExpressEnvSource(dbType);
    files[`backend_expressjs/prisma/schema.prisma`]                      = gnExpressPrismaSchemaSource(className, meta.table, dataCols, pkCols, hasAudit, dbType);
    files[`backend_expressjs/src/index.ts`]                              = gnExpressIndexSource(endpoint, className);
    files[`backend_expressjs/src/db.ts`]                                 = gnExpressDbSource();
    files[`backend_expressjs/src/${lowerEp}/${lowerEp}.dto.ts`]          = gnExpressDtoSource(endpoint, className, dataCols, pkCols, nonPkCols, hasAudit);
    files[`backend_expressjs/src/${lowerEp}/${lowerEp}.service.ts`]      = gnExpressServiceSource(endpoint, className, dataCols, pkCols, nonPkCols, hasAudit);
    files[`backend_expressjs/src/${lowerEp}/${lowerEp}.controller.ts`]   = gnExpressControllerSource(endpoint, className, pkCols);
    files[`backend_expressjs/src/${lowerEp}/${lowerEp}.routes.ts`]       = gnExpressRoutesSource(endpoint, className, pkCols);

    // === Frontend ===
    // (1) Vue3 CDN - common.css/js 의존 버전
    files[`frontend_vue3cdn_with_common/${endpoint}.html`] =
        gnHtmlSource(endpoint, className, dataCols, pkCols, nonPkCols, hasAudit);
    // (2) Vue3 CDN - 단일 파일 (CSS/JS 인라인)
    files[`frontend_vue3cdn_standalone/${endpoint}.html`] =
        gnHtmlStandaloneSource(endpoint, className, dataCols, pkCols, nonPkCols, hasAudit);
    // (3) Vue3 SFC
    files[`frontend_vue3/${className}View.vue`] =
        gnVue3Source(endpoint, className, dataCols, pkCols, nonPkCols, hasAudit);
    files[`frontend_vue3/${endpoint}Api.js`] =
        gnApiJsSource(endpoint);
    // (4) React
    files[`frontend_react/${className}Page.jsx`] =
        gnReactSource(endpoint, className, dataCols, pkCols, nonPkCols, hasAudit);
    files[`frontend_react/${endpoint}Api.js`] =
        gnApiJsSource(endpoint);
    // (5) React CDN - 단일 파일 (React/ReactDOM/Babel CDN, in-browser JSX)
    files[`frontend_react_cdn_standalone/${endpoint}.html`] =
        gnReactCdnStandaloneSource(endpoint, className, dataCols, pkCols, nonPkCols, hasAudit);
    // (6) Svelte (Vite + svelte SFC — 빌드 필요)
    files[`frontend_svelte/src/App.svelte`] =
        gnSvelteSource(endpoint, className, dataCols, pkCols, nonPkCols, hasAudit);
    files[`frontend_svelte/src/main.js`]        = gnSvelteMainJsSource(className);
    files[`frontend_svelte/src/${endpoint}Api.js`] = gnSvelteApiJsSource(endpoint);
    files[`frontend_svelte/index.html`]         = gnSvelteIndexHtmlSource(className);
    files[`frontend_svelte/package.json`]       = gnSveltePackageJson(endpoint);
    files[`frontend_svelte/vite.config.js`]     = gnSvelteViteConfigSource();
    // (7) Svelte CDN — vanilla JS 단일 HTML (svelte 풍, 빌드 불필요)
    files[`frontend_svelte_cdn_standalone/${endpoint}.html`] =
        gnSvelteCdnStandaloneSource(endpoint, className, dataCols, pkCols, nonPkCols, hasAudit);
    // (8) PyScript CDN — Python in browser, 단일 HTML (첫 로딩 5~10초)
    files[`frontend_pyscript_cdn_standalone/${endpoint}.html`] =
        gnPyScriptCdnStandaloneSource(endpoint, className, dataCols, pkCols, nonPkCols, hasAudit);

    // (9) Flutter (Mobile — Dart, flutter run 빌드 필수)
    files[`frontend_flutter/pubspec.yaml`]                    = gnFlPubspecSource(endpoint);
    files[`frontend_flutter/lib/main.dart`]                   = gnFlMainDartSource(endpoint, className);
    files[`frontend_flutter/lib/models/${endpoint}.dart`]     = gnFlModelDartSource(endpoint, className, dataCols, pkCols, hasAudit);
    files[`frontend_flutter/lib/services/${endpoint}_service.dart`] = gnFlServiceDartSource(endpoint, className, pkCols);
    files[`frontend_flutter/lib/screens/${endpoint}_screen.dart`]   = gnFlScreenDartSource(endpoint, className, dataCols, pkCols, nonPkCols, hasAudit);

    // (10) React Native (Expo — TypeScript, expo start 빌드 필수)
    files[`frontend_react_native/package.json`]               = gnRnPackageJsonSource(endpoint);
    files[`frontend_react_native/app.json`]                   = gnRnAppJsonSource(endpoint, className);
    files[`frontend_react_native/tsconfig.json`]              = gnRnTsconfigSource();
    files[`frontend_react_native/App.tsx`]                    = gnRnAppTsxSource(className);
    files[`frontend_react_native/src/services/${endpoint}Api.ts`] = gnRnApiTsSource(endpoint, className, dataCols, pkCols, hasAudit);
    files[`frontend_react_native/src/screens/${className}Screen.tsx`] = gnRnScreenTsxSource(endpoint, className, dataCols, pkCols, nonPkCols, hasAudit);

    // (10a) Android (Kotlin + Jetpack Compose, Gradle 빌드 필수)
    // pkg → 폴더 경로
    const adPkg = `${pkg}.${endpoint}`;       // ex) com.exam.app.exam1
    const adPkgPath = adPkg.replace(/\./g, '/');
    files[`frontend_android/build.gradle.kts`]                              = gnAdProjectGradleSource();
    files[`frontend_android/settings.gradle.kts`]                           = gnAdSettingsGradleSource(endpoint);
    files[`frontend_android/app/build.gradle.kts`]                          = gnAdAppGradleSource(adPkg, className);
    files[`frontend_android/app/src/main/AndroidManifest.xml`]              = gnAdManifestSource(adPkg, className);
    files[`frontend_android/app/src/main/java/${adPkgPath}/MainActivity.kt`]                  = gnAdMainActivitySource(adPkg, className);
    files[`frontend_android/app/src/main/java/${adPkgPath}/data/${className}.kt`]              = gnAdDataClassSource(adPkg, className, dataCols, hasAudit);
    files[`frontend_android/app/src/main/java/${adPkgPath}/data/${className}ApiService.kt`]    = gnAdApiServiceSource(adPkg, endpoint, className, pkCols);
    files[`frontend_android/app/src/main/java/${adPkgPath}/ui/${className}Screen.kt`]          = gnAdScreenSource(adPkg, endpoint, className, dataCols, pkCols, nonPkCols, hasAudit);

    // (10b) iOS (SwiftUI + Swift, Xcode 빌드 필수)
    files[`frontend_ios/README.md`]                              = gnIosReadmeSource(className);
    files[`frontend_ios/Sources/${className}App.swift`]          = gnIosAppSwiftSource(className);
    files[`frontend_ios/Sources/Models/${className}.swift`]      = gnIosModelSource(className, dataCols, hasAudit);
    files[`frontend_ios/Sources/Services/${className}Api.swift`] = gnIosApiSource(endpoint, className, pkCols);
    files[`frontend_ios/Sources/Views/${className}View.swift`]   = gnIosViewSource(endpoint, className, dataCols, pkCols, nonPkCols, hasAudit);

    // (11) Nuxt 4 풀스택 + Prisma (클라이언트 + server/api/ + Prisma)
    files[`fullstack_nuxt/package.json`]                                = gnFullNxPackageJsonSource(endpoint);
    files[`fullstack_nuxt/nuxt.config.ts`]                              = gnFullNxConfigSource();
    files[`fullstack_nuxt/tsconfig.json`]                               = gnFullNxTsconfigSource();
    files[`fullstack_nuxt/.env.example`]                                = gnFullNxEnvSource(dbType);
    files[`fullstack_nuxt/prisma/schema.prisma`]                        = gnFullNxPrismaSchemaSource(className, meta.table, dataCols, pkCols, hasAudit, dbType);
    files[`fullstack_nuxt/app/app.vue`]                                 = gnFullNxAppVueSource(className);
    files[`fullstack_nuxt/app/types/${endpoint}.ts`]                    = gnFullNxTypesSource(endpoint, className, dataCols, hasAudit);
    files[`fullstack_nuxt/app/composables/use${className}Api.ts`]       = gnFullNxComposableSource(endpoint, className, pkCols);
    files[`fullstack_nuxt/app/pages/${endpoint}.vue`]                   = gnFullNxPageVueSource(endpoint, className, dataCols, pkCols, nonPkCols, hasAudit);
    files[`fullstack_nuxt/server/utils/db.ts`]                          = gnFullNxDbSource();
    files[`fullstack_nuxt/server/utils/${endpoint}Repo.ts`]             = gnFullNxRepoSource(endpoint, className, meta.table, dataCols, pkCols, nonPkCols, hasAudit);
    files[`fullstack_nuxt/server/api/${endpoint}/page-list.get.ts`]     = gnFullNxApiPageListSource(endpoint, className);
    files[`fullstack_nuxt/server/api/${endpoint}/index.get.ts`]         = gnFullNxApiListSource(endpoint, className);
    files[`fullstack_nuxt/server/api/${endpoint}/index.post.ts`]        = gnFullNxApiInsertSource(endpoint, className);
    files[`fullstack_nuxt/server/api/${endpoint}/[...id].get.ts`]       = gnFullNxApiGetOneSource(endpoint, className, pkCols);
    files[`fullstack_nuxt/server/api/${endpoint}/[...id].put.ts`]       = gnFullNxApiPutSource(endpoint, className, pkCols);
    files[`fullstack_nuxt/server/api/${endpoint}/[...id].delete.ts`]    = gnFullNxApiDeleteSource(endpoint, className, pkCols);

    // (12) Next.js 15 풀스택 + Prisma (App Router + Route Handlers + Prisma)
    files[`fullstack_nextjs/package.json`]                              = gnFullNextPackageJsonSource(endpoint);
    files[`fullstack_nextjs/next.config.mjs`]                           = gnFullNextConfigSource();
    files[`fullstack_nextjs/tsconfig.json`]                             = gnFullNextTsconfigSource();
    files[`fullstack_nextjs/.env.example`]                              = gnFullNextEnvSource(dbType);
    files[`fullstack_nextjs/prisma/schema.prisma`]                      = gnFullNextPrismaSchemaSource(className, meta.table, dataCols, pkCols, hasAudit, dbType);
    files[`fullstack_nextjs/app/layout.tsx`]                            = gnFullNextLayoutSource(className);
    files[`fullstack_nextjs/app/${endpoint}/page.tsx`]                  = gnFullNextPageTsxSource(endpoint, className, dataCols, pkCols, nonPkCols, hasAudit);
    files[`fullstack_nextjs/lib/db.ts`]                                 = gnFullNextDbSource();
    files[`fullstack_nextjs/lib/${endpoint}Api.ts`]                     = gnFullNextApiTsSource(endpoint, className, dataCols, pkCols, hasAudit);
    files[`fullstack_nextjs/lib/${endpoint}Repo.ts`]                    = gnFullNextRepoSource(endpoint, className, meta.table, dataCols, pkCols, nonPkCols, hasAudit);
    files[`fullstack_nextjs/app/api/${endpoint}/page-list/route.ts`]    = gnFullNextRoutePageListSource(endpoint, className);
    files[`fullstack_nextjs/app/api/${endpoint}/route.ts`]              = gnFullNextRouteIndexSource(endpoint, className);
    files[`fullstack_nextjs/app/api/${endpoint}/[...id]/route.ts`]      = gnFullNextRouteIdSource(endpoint, className, pkCols);

    // === DDL ===
    files[`ddl/${meta.table}.sql`] = opts.rawDdl;

    return files;
}

// ====== 공통 헬퍼 ======
function gnAuditFields() {
    return [
        { name: 'reg_id', javaName: 'regId', javaType: 'String', size: 20, nullable: true, isAudit: true },
        { name: 'reg_dt', javaName: 'regDt', javaType: 'LocalDateTime', nullable: true, isAudit: true },
        { name: 'upd_id', javaName: 'updId', javaType: 'String', size: 20, nullable: true, isAudit: true },
        { name: 'upd_dt', javaName: 'updDt', javaType: 'LocalDateTime', nullable: true, isAudit: true }
    ];
}

function fmCap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ====== API 호출 모듈 (Vue3 SFC / React 공용) ======
function gnApiJsSource(endpoint) {
    return `// ${endpoint} REST API 호출 (Vue3 SFC / React 공용)

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
    return res.status === 204 ? null : res.json();
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
export const selectPageList  = (search) => api(\`\${BASE}/page-list?\${buildQs(search)}\`);
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
/** 목록 일괄 저장 (각 행의 rowStatus 로 분기, D → U → I 순) */
export const saveList   = (rows) => api(\`\${BASE}/save-list\`, { method: 'POST', body: JSON.stringify(rows) });
`;
}
