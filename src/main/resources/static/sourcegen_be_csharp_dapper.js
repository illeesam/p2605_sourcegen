/* ===== Source Generator : Backend (C# .NET — ASP.NET Core + Dapper) =====
 *  - Program.cs / appsettings.json / .csproj
 *  - Data/DbConnectionFactory.cs
 *  - Models/<Class>.cs / Dtos/<Class>Dto.cs
 *  - Repositories/<Class>Repository.cs   (raw SQL + Dapper)
 *  - Services/<Class>Service.cs / Controllers/<Class>Controller.cs
 *
 * 의존: gnAuditFields() (sourcegen.js)
 *      pascalize() / mapCsType() — efcore 모듈에 정의 (같이 로드되므로 그대로 사용)
 * REST 경로: /api/csharp/dapper/<endpoint>
 */

// ----- Program.cs (Dapper) -----
function gnCsDpProgramSource(rootNs) {
    return `// ASP.NET Core 진입점 — dotnet run (Dapper)
using ${rootNs}.Data;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(opt =>
    opt.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader())
);

// Dapper 는 ORM 이 아니므로 IDbConnection 팩토리만 등록
builder.Services.AddSingleton<IDbConnectionFactory>(sp =>
    new DbConnectionFactory(
        builder.Configuration.GetConnectionString("DefaultConnection")!,
        builder.Configuration["Database:Provider"] ?? "PostgreSQL"
    ));

// Repository / Service 는 Scoped
builder.Services.Scan(scan => { });  // 또는 수동 등록
// 아래 라인은 클래스가 생성된 후 Program.cs 에 직접 추가:
// builder.Services.AddScoped<${rootNs}.Repositories.XxxRepository>();
// builder.Services.AddScoped<${rootNs}.Services.XxxService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseCors();
app.UseAuthorization();
app.MapControllers();
app.Run();
`;
}

// ----- appsettings.json (efcore 와 동일 — 재사용 가능하지만 별도 출력) -----
function gnCsDpAppSettingsSource(dbType) {
    const provider = dbType === 'oracle' ? 'Oracle' : 'PostgreSQL';
    const conn = dbType === 'oracle'
        ? 'User Id=USER;Password=PASSWORD;Data Source=localhost:1521/XEPDB1;'
        : 'Host=localhost;Port=5432;Database=postgres;Username=USER;Password=PASSWORD';
    return `{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "Database": {
    "Provider": "${provider}"
  },
  "ConnectionStrings": {
    "DefaultConnection": "${conn}"
  }
}
`;
}

// ----- .csproj -----
function gnCsDpCsprojSource(rootNs, dbType) {
    const driver = dbType === 'oracle'
        ? '    <PackageReference Include="Oracle.ManagedDataAccess.Core" Version="23.6.1" />'
        : '    <PackageReference Include="Npgsql" Version="8.0.4" />';
    return `<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <RootNamespace>${rootNs}</RootNamespace>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Dapper" Version="2.1.35" />
${driver}
    <PackageReference Include="Swashbuckle.AspNetCore" Version="6.6.2" />
  </ItemGroup>

</Project>
`;
}

// ----- Data/DbConnectionFactory.cs -----
function gnCsDpConnectionFactorySource(rootNs) {
    return `using System.Data;
using Npgsql;
using Oracle.ManagedDataAccess.Client;

namespace ${rootNs}.Data;

public interface IDbConnectionFactory
{
    IDbConnection Create();
}

/// <summary>DB 별 분기 — Provider 가 'Oracle' 이면 OracleConnection, 그 외 NpgsqlConnection</summary>
public class DbConnectionFactory : IDbConnectionFactory
{
    private readonly string _connStr;
    private readonly string _provider;

    public DbConnectionFactory(string connStr, string provider)
    {
        _connStr = connStr;
        _provider = provider;
    }

    public IDbConnection Create()
    {
        return _provider == "Oracle"
            ? new OracleConnection(_connStr)
            : new NpgsqlConnection(_connStr);
    }
}
`;
}

// ----- Models/<Class>.cs (POCO — Dapper 매핑용) -----
function gnCsDpModelSource(rootNs, className, table, dataCols, pkCols, hasAudit) {
    const allItemCols = hasAudit ? [...dataCols, ...gnAuditFields()] : dataCols;
    // Dapper 는 컬럼명과 프로퍼티명이 달라도 SQL 의 alias 로 맞추므로
    // 간단히 자바 카멜케이스 → 파스칼로 변환된 이름으로 두고, SQL 에서 AS 로 매핑.
    const props = allItemCols.map(c => {
        const t = mapCsType(c.javaType, true);
        return `    public ${t} ${pascalize(c.javaName)} { get; set; }`;
    }).join('\n');

    return `namespace ${rootNs}.Models;

/// <summary>Dapper 매핑용 POCO — 컬럼은 Repository SQL 에서 AS 로 alias</summary>
public class ${className}
{
${props}
}
`;
}

// ----- Dtos/<Class>Dto.cs (efcore 와 같은 구조) -----
function gnCsDpDtoSource(rootNs, className, dataCols, pkCols, nonPkCols, hasAudit) {
    // efcore 의 DTO 구조와 동일 — 재사용. 단 namespace 는 같은 rootNs 사용.
    return gnCsEfDtoSource(rootNs, className, dataCols, pkCols, nonPkCols, hasAudit);
}

// ----- Repositories/<Class>Repository.cs (Dapper raw SQL) -----
function gnCsDpRepoSource(rootNs, className, table, dataCols, pkCols, nonPkCols, hasAudit) {
    const allItemCols = hasAudit ? [...dataCols, ...gnAuditFields()] : dataCols;

    // SELECT 컬럼: a.col_name AS PropName
    const colList = allItemCols.map(c => `a.${c.name} AS ${pascalize(c.javaName)}`).join(', ');

    const pkArgs = pkCols.map(c => `${mapCsType(c.javaType, false)} ${c.javaName}`).join(', ');
    const pkWhere = pkCols.map(c => `a.${c.name} = @${pascalize(c.javaName)}`).join(' AND ');
    const pkAnonObj = pkCols.map(c => `${pascalize(c.javaName)} = ${c.javaName}`).join(', ');

    // 검색조건 — string 컬럼만 LIKE
    const stringDataCols = dataCols.filter(c => c.javaType === 'String' && !c.isAudit);
    const condSql = stringDataCols.map(c => {
        const propName = pascalize(c.javaName);
        return `        if (!string.IsNullOrEmpty(req.${propName}))\n` +
               `        {\n` +
               `            sb.Append(" AND UPPER(a.${c.name}) LIKE '%' || UPPER(:${propName}) || '%'");\n` +
               `            p.Add("${propName}", req.${propName});\n` +
               `        }`;
    }).join('\n');

    const sortCases = dataCols.filter(c => !c.isAudit).flatMap(c => [
        `            "${c.javaName} asc"  => " ORDER BY a.${c.name} ASC",`,
        `            "${c.javaName} desc" => " ORDER BY a.${c.name} DESC",`
    ]).join('\n');
    const defaultSort = pkCols.map(c => `a.${c.name}`).join(', ');

    // INSERT
    const insertCols = dataCols.filter(c => !c.isAudit).map(c => c.name).join(', ');
    const insertParams = dataCols.filter(c => !c.isAudit).map(c => `:${pascalize(c.javaName)}`).join(', ');
    const insertParamObj = dataCols.filter(c => !c.isAudit).map(c =>
        `${pascalize(c.javaName)} = req.${pascalize(c.javaName)}`).join(', ');

    // UPDATE
    const updateSets = nonPkCols.filter(c => !c.isAudit)
        .map(c => `${c.name} = :${pascalize(c.javaName)}`).join(', ');
    const updatePkWhere = pkCols.map(c => `${c.name} = :${pascalize(c.javaName)}`).join(' AND ');
    const updateParamObj = [...nonPkCols.filter(c => !c.isAudit), ...pkCols].map(c =>
        `${pascalize(c.javaName)} = req.${pascalize(c.javaName)}`).join(', ');

    return `using System.Data;
using System.Text;
using ${rootNs}.Data;
using ${rootNs}.Dtos;
using ${rootNs}.Models;
using Dapper;

namespace ${rootNs}.Repositories;

public class ${className}Repository
{
    private readonly IDbConnectionFactory _factory;
    public ${className}Repository(IDbConnectionFactory factory) { _factory = factory; }

    private const string SELECT_COLS = "${colList}";
    private const string TABLE_AS    = "${table} a";

    public async Task<${className}?> SelectByIdAsync(${pkArgs})
    {
        const string sql = $"/* ${className}Repository :: SelectById */ SELECT {SELECT_COLS} FROM {TABLE_AS} WHERE ${pkWhere}";
        using var conn = _factory.Create();
        return await conn.QueryFirstOrDefaultAsync<${className}>(sql, new { ${pkAnonObj} });
    }

    public async Task<List<${className}>> SelectListAsync(${className}Request req)
    {
        var (whereSql, p) = BuildWhere(req);
        var orderBy = BuildOrderBy(req);
        var paging = "";
        if (req.PageSize > 0 && req.PageNo > 0)
        {
            paging = " OFFSET :Offset ROWS FETCH NEXT :PageSize ROWS ONLY";
            p.Add("Offset",   req.Offset);
            p.Add("PageSize", req.PageSize);
        }
        var sql = $"/* ${className}Repository :: SelectList */ SELECT {SELECT_COLS} FROM {TABLE_AS}{whereSql}{orderBy}{paging}";
        using var conn = _factory.Create();
        var rows = await conn.QueryAsync<${className}>(sql, p);
        return rows.ToList();
    }

    public async Task<(List<${className}> rows, long total, int pageNo, int pageSize)>
        SelectPageListAsync(${className}Request req)
    {
        var pageNo   = req.PageNo   > 0 ? req.PageNo   : 1;
        var pageSize = req.PageSize > 0 ? req.PageSize : 10;

        var (whereSql, p) = BuildWhere(req);
        var orderBy = BuildOrderBy(req);

        var listSql = $"/* ${className}Repository :: SelectPageList */ SELECT {SELECT_COLS} FROM {TABLE_AS}{whereSql}{orderBy} OFFSET :Offset ROWS FETCH NEXT :PageSize ROWS ONLY";
        var countSql = $"/* ${className}Repository :: SelectTotalCount */ SELECT COUNT(*) FROM {TABLE_AS}{whereSql}";

        p.Add("Offset",   (pageNo - 1) * pageSize);
        p.Add("PageSize", pageSize);

        using var conn = _factory.Create();
        var total = await conn.ExecuteScalarAsync<long>(countSql, p);
        var rows = (await conn.QueryAsync<${className}>(listSql, p)).ToList();
        return (rows, total, pageNo, pageSize);
    }

    public async Task<int> InsertAsync(${className}Request req)
    {
        const string sql = $"/* ${className}Repository :: Insert */ INSERT INTO ${table} (${insertCols}) VALUES (${insertParams})";
        using var conn = _factory.Create();
        return await conn.ExecuteAsync(sql, new { ${insertParamObj} });
    }

    public async Task<int> UpdateAsync(${className}Request req)
    {
        const string sql = $"/* ${className}Repository :: Update */ UPDATE ${table} SET ${updateSets} WHERE ${updatePkWhere}";
        using var conn = _factory.Create();
        return await conn.ExecuteAsync(sql, new { ${updateParamObj} });
    }

    public async Task<int> DeleteAsync(${pkArgs})
    {
        const string sql = $"/* ${className}Repository :: Delete */ DELETE FROM ${table} WHERE ${pkCols.map(c => `${c.name} = :${pascalize(c.javaName)}`).join(' AND ')}";
        using var conn = _factory.Create();
        return await conn.ExecuteAsync(sql, new { ${pkAnonObj} });
    }

    private static (string whereSql, DynamicParameters p) BuildWhere(${className}Request req)
    {
        var sb = new StringBuilder(" WHERE 1=1");
        var p = new DynamicParameters();
${condSql}
        return (sb.ToString(), p);
    }

    private static string BuildOrderBy(${className}Request req)
    {
        return req.SortBy switch
        {
${sortCases}
            _ => " ORDER BY ${defaultSort}"
        };
    }
}
`;
}

// ----- Services/<Class>Service.cs (Dapper용 — POCO 직접 매핑) -----
function gnCsDpServiceSource(rootNs, className, pkCols, nonPkCols, hasAudit) {
    const pkArgs = pkCols.map(c => `${mapCsType(c.javaType, false)} ${c.javaName}`).join(', ');
    const pkCall = pkCols.map(c => c.javaName).join(', ');
    const reqPkCall = pkCols.map(c => `req.${pascalize(c.javaName)}!`).join(', ');

    const allItemColsForToItem = hasAudit
        ? [...nonPkCols.filter(c => !c.isAudit), ...pkCols, ...gnAuditFields()]
        : [...nonPkCols.filter(c => !c.isAudit), ...pkCols];
    const entityToItemProps = allItemColsForToItem.map(c =>
        `            ${pascalize(c.javaName)} = e.${pascalize(c.javaName)}`
    ).join(',\n');

    return `using ${rootNs}.Dtos;
using ${rootNs}.Models;
using ${rootNs}.Repositories;

namespace ${rootNs}.Services;

public class ${className}Service
{
    private readonly ${className}Repository _repo;
    public ${className}Service(${className}Repository repo) { _repo = repo; }

    public async Task<${className}Item> SelectByIdAsync(${pkArgs})
    {
        var e = await _repo.SelectByIdAsync(${pkCall})
            ?? throw new KeyNotFoundException($"${className} not found");
        return ToItem(e);
    }

    public async Task<List<${className}Item>> SelectListAsync(${className}Request req)
    {
        var rows = await _repo.SelectListAsync(req);
        return rows.Select(ToItem).ToList();
    }

    public async Task<${className}Response> SelectPageListAsync(${className}Request req)
    {
        var (rows, total, pageNo, pageSize) = await _repo.SelectPageListAsync(req);
        return ${className}Response.Of(
            rows.Select(ToItem).ToList(), total, pageNo, pageSize,
            ${className}Response.ToCond(req));
    }

    public async Task<${className}Item> InsertAsync(${className}Request req)
    {
        var n = await _repo.InsertAsync(req);
        if (n == 0) throw new InvalidOperationException("Insert failed");
        return await SelectByIdAsync(${reqPkCall});
    }

    public async Task<${className}Item> UpdateAsync(${pkArgs}, ${className}Request req)
    {
${pkCols.map(c => `        req.${pascalize(c.javaName)} = ${c.javaName};`).join('\n')}
        var n = await _repo.UpdateAsync(req);
        if (n == 0) throw new KeyNotFoundException($"${className} not found");
        return await SelectByIdAsync(${pkCall});
    }

    public async Task<${className}Item> PatchAsync(${pkArgs}, ${className}Request req)
    {
        // PATCH 는 raw SQL 로 동적 SET 절 빌드가 복잡하니 — 현재값 read → null 아닌 필드만 덮어쓰고 update
        var current = await _repo.SelectByIdAsync(${pkCall})
            ?? throw new KeyNotFoundException($"${className} not found");
${nonPkCols.filter(c => !c.isAudit).map(c => `        if (req.${pascalize(c.javaName)} == null) req.${pascalize(c.javaName)} = current.${pascalize(c.javaName)};`).join('\n')}
${pkCols.map(c => `        req.${pascalize(c.javaName)} = ${c.javaName};`).join('\n')}
        await _repo.UpdateAsync(req);
        return await SelectByIdAsync(${pkCall});
    }

    public async Task DeleteAsync(${pkArgs})
    {
        var n = await _repo.DeleteAsync(${pkCall});
        if (n == 0) throw new KeyNotFoundException($"${className} not found");
    }

    public async Task<${className}Item?> SaveOneAsync(${className}Request req)
    {
        var rs = (req.RowStatus ?? "").Trim().ToUpperInvariant();
        return rs switch
        {
            "I" => await InsertAsync(req),
            "U" => await UpdateAsync(${reqPkCall}, req),
            "D" => await DeleteVoid(${reqPkCall}),
            _   => throw new ArgumentException($"Unknown rowStatus: [{req.RowStatus}] (expected I/U/D)")
        };
    }

    private async Task<${className}Item?> DeleteVoid(${pkArgs})
    {
        await DeleteAsync(${pkCall});
        return null;
    }

    public async Task SaveListAsync(List<${className}Request> reqList)
    {
        if (reqList == null || reqList.Count == 0) return;
        foreach (var r in reqList) if (Eq(r.RowStatus, "D")) await SaveOneAsync(r);
        foreach (var r in reqList) if (Eq(r.RowStatus, "U")) await SaveOneAsync(r);
        foreach (var r in reqList) if (Eq(r.RowStatus, "I")) await SaveOneAsync(r);
    }
    private static bool Eq(string? a, string b) =>
        string.Equals((a ?? "").Trim(), b, StringComparison.OrdinalIgnoreCase);

    private static ${className}Item ToItem(${className} e) => new()
    {
${entityToItemProps}
    };
}
`;
}

// ----- Controllers/<Class>Controller.cs (Dapper) -----
function gnCsDpControllerSource(rootNs, className, endpoint, pkCols) {
    const pkRoute = pkCols.map(c => `{${c.javaName}}`).join('/');
    const pkArgs = pkCols.map(c => `${mapCsType(c.javaType, false)} ${c.javaName}`).join(', ');
    const pkCall = pkCols.map(c => c.javaName).join(', ');

    return `using ${rootNs}.Dtos;
using ${rootNs}.Services;
using Microsoft.AspNetCore.Mvc;

namespace ${rootNs}.Controllers;

[ApiController]
[Route("api/csharp/dapper/${endpoint}")]
public class ${className}Controller : ControllerBase
{
    private readonly ${className}Service _service;
    public ${className}Controller(${className}Service service) { _service = service; }

    [HttpGet("${pkRoute}")]
    public async Task<ActionResult<${className}Item>> SelectById(${pkArgs})
        => Ok(await _service.SelectByIdAsync(${pkCall}));

    [HttpGet("page-list")]
    public async Task<ActionResult<${className}Response>> PageList([FromQuery] ${className}Request req)
        => Ok(await _service.SelectPageListAsync(req));

    [HttpGet("list")]
    public async Task<ActionResult<List<${className}Item>>> List([FromQuery] ${className}Request req)
        => Ok(await _service.SelectListAsync(req));

    [HttpPost]
    public async Task<ActionResult<${className}Item>> Insert([FromBody] ${className}Request req)
        => Ok(await _service.InsertAsync(req));

    [HttpPut("${pkRoute}")]
    public async Task<ActionResult<${className}Item>> Update(${pkArgs}, [FromBody] ${className}Request req)
        => Ok(await _service.UpdateAsync(${pkCall}, req));

    [HttpPatch("${pkRoute}")]
    public async Task<ActionResult<${className}Item>> Patch(${pkArgs}, [FromBody] ${className}Request req)
        => Ok(await _service.PatchAsync(${pkCall}, req));

    [HttpDelete("${pkRoute}")]
    public async Task<IActionResult> Delete(${pkArgs})
    {
        await _service.DeleteAsync(${pkCall});
        return NoContent();
    }

    [HttpPost("save-one")]
    public async Task<ActionResult<${className}Item?>> SaveOne([FromBody] ${className}Request req)
        => Ok(await _service.SaveOneAsync(req));

    [HttpPost("save-list")]
    public async Task<IActionResult> SaveList([FromBody] List<${className}Request> reqList)
    {
        await _service.SaveListAsync(reqList);
        return NoContent();
    }
}
`;
}
