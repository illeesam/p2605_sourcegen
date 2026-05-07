/* ===== Source Generator : Backend (C# .NET — ASP.NET Core + EF Core) =====
 *  - Program.cs / appsettings.json / .csproj
 *  - Data/AppDbContext.cs
 *  - Models/<Class>.cs / Dtos/<Class>Dto.cs
 *  - Repositories/<Class>Repository.cs
 *  - Services/<Class>Service.cs / Controllers/<Class>Controller.cs
 *
 * 의존: gnAuditFields() (sourcegen.js)
 * REST 경로: /api/csharp/efcore/<endpoint>
 */

// ----- Program.cs -----
function gnCsEfProgramSource(rootNs) {
    return `// ASP.NET Core 진입점 — dotnet run (port 5001 기본)
using ${rootNs}.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// === Services ===
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS — 개발용 (운영 시 origins 화이트리스트로 좁힐 것)
builder.Services.AddCors(opt =>
    opt.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader())
);

// EF Core DbContext — appsettings.json 의 DefaultConnection 사용
var conn = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(opt =>
{
    // DB 별 분기 — Oracle 또는 PostgreSQL
    if (builder.Configuration["Database:Provider"] == "Oracle")
        opt.UseOracle(conn);
    else
        opt.UseNpgsql(conn);
});

var app = builder.Build();

// === Pipeline ===
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

// ----- appsettings.json -----
function gnCsEfAppSettingsSource(dbType) {
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
function gnCsEfCsprojSource(rootNs, dbType) {
    const driver = dbType === 'oracle'
        ? '    <PackageReference Include="Oracle.EntityFrameworkCore" Version="8.21.121" />'
        : '    <PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="8.0.4" />';
    return `<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <RootNamespace>${rootNs}</RootNamespace>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.EntityFrameworkCore" Version="8.0.10" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="8.0.10" />
${driver}
    <PackageReference Include="Swashbuckle.AspNetCore" Version="6.6.2" />
  </ItemGroup>

</Project>
`;
}

// ----- Data/AppDbContext.cs -----
function gnCsEfDbContextSource(rootNs, className) {
    return `using ${rootNs}.Models;
using Microsoft.EntityFrameworkCore;

namespace ${rootNs}.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> opt) : base(opt) { }

    public DbSet<${className}> ${className}s => Set<${className}>();
}
`;
}

// ----- Models/<Class>.cs -----
function gnCsEfModelSource(rootNs, className, table, dataCols, pkCols, hasAudit) {
    const allItemCols = hasAudit ? [...dataCols, ...gnAuditFields()] : dataCols;

    const props = allItemCols.map(c => {
        const t = mapCsType(c.javaType, c.nullable);
        const pkAttr = c.isPk ? '    [Key]\n' : '';
        // 단일 PK 가 아닌 경우(복합 PK) 는 OnModelCreating 으로 잡아야 하는데, 여기서는 [Key] 로만 표시.
        const colAttr = `    [Column("${c.name}")]\n`;
        const lengthAttr = (c.javaType === 'String' && c.size)
            ? `    [StringLength(${c.size})]\n`
            : '';
        const requiredAttr = (!c.nullable && !c.isAudit && c.javaType === 'String')
            ? '    [Required]\n'
            : '';
        const init = c.javaType === 'String' && !c.nullable ? ' = string.Empty;' : '';
        return `${pkAttr}${colAttr}${lengthAttr}${requiredAttr}    public ${t} ${pascalize(c.javaName)} { get; set; }${init}`;
    }).join('\n\n');

    const pkComposite = pkCols.length > 1
        ? `\n\n    // 복합 PK — DbContext.OnModelCreating 에서 HasKey(...) 로 추가 설정 필요`
        : '';

    return `using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ${rootNs}.Models;

[Table("${table}")]
public class ${className}
{
${props}${pkComposite}
}
`;
}

// ----- Dtos/<Class>Dto.cs (Request / Item / Response) -----
function gnCsEfDtoSource(rootNs, className, dataCols, pkCols, nonPkCols, hasAudit) {
    const allItemCols = hasAudit ? [...dataCols, ...gnAuditFields()] : dataCols;

    const reqProps = dataCols.map(c => {
        const t = mapCsType(c.javaType, true /* request 는 모두 nullable */);
        const required = !c.nullable && !c.isAudit && c.javaType === 'String';
        const annot = required ? `    [Required(ErrorMessage = "${c.javaName}는 필수입니다")]\n` : '';
        const length = (c.javaType === 'String' && c.size) ? `    [StringLength(${c.size})]\n` : '';
        return `${annot}${length}    public ${t} ${pascalize(c.javaName)} { get; set; }`;
    }).join('\n\n');

    const itemProps = allItemCols.map(c => {
        const t = mapCsType(c.javaType, true);
        return `    public ${t} ${pascalize(c.javaName)} { get; set; }`;
    }).join('\n');

    const condIfs = dataCols.filter(c => !c.isAudit).map(c => {
        if (c.javaType === 'String') {
            return `        if (!string.IsNullOrEmpty(${pascalize(c.javaName)})) m["${c.javaName}"] = ${pascalize(c.javaName)};`;
        }
        return `        if (${pascalize(c.javaName)} != null) m["${c.javaName}"] = ${pascalize(c.javaName)}!;`;
    }).join('\n');

    return `using System.ComponentModel.DataAnnotations;

namespace ${rootNs}.Dtos;

/// <summary>요청 DTO (등록/수정/검색/페이징/정렬/일괄저장 통합)</summary>
public class ${className}Request
{
${reqProps}

    // === 페이징/정렬/일괄저장 메타 ===
    public int PageNo { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string? SortBy { get; set; }
    public string? RowStatus { get; set; }  // "I" / "U" / "D"

    public int Offset => (PageNo - 1) * PageSize;
}

/// <summary>응답 DTO (단건/목록 행)</summary>
public class ${className}Item
{
${itemProps}
}

/// <summary>페이지 응답 DTO</summary>
public class ${className}Response
{
    public List<${className}Item> PageList { get; set; } = new();
    public long PageTotalCount { get; set; }
    public int PageNo { get; set; }
    public int PageSize { get; set; }
    public int PageTotalPages { get; set; }
    public Dictionary<string, object> PageCond { get; set; } = new();

    public static ${className}Response Of(
        List<${className}Item> pageList, long pageTotalCount,
        int pageNo, int pageSize, Dictionary<string, object> pageCond)
    {
        var pageTotalPages = pageSize <= 0 ? 0 : (int)Math.Ceiling((double)pageTotalCount / pageSize);
        return new ${className}Response
        {
            PageList = pageList,
            PageTotalCount = pageTotalCount,
            PageNo = pageNo,
            PageSize = pageSize,
            PageTotalPages = pageTotalPages,
            PageCond = pageCond
        };
    }

    /// <summary>Request → pageCond Dict (값이 있는 검색 필드만)</summary>
    public static Dictionary<string, object> ToCond(${className}Request req)
    {
        var m = new Dictionary<string, object>();
        if (req == null) return m;
${condIfs}
        return m;
    }
}
`;
}

// ----- Repositories/<Class>Repository.cs -----
function gnCsEfRepoSource(rootNs, className, dataCols, pkCols, nonPkCols, hasAudit) {
    const pkArgs = pkCols.map(c => `${mapCsType(c.javaType, false)} ${c.javaName}`).join(', ');
    const pkFilter = pkCols.map(c => `e.${pascalize(c.javaName)} == ${c.javaName}`).join(' && ');
    const stringDataCols = dataCols.filter(c => c.javaType === 'String' && !c.isAudit);

    const condIfs = stringDataCols.map(c =>
        `        if (!string.IsNullOrEmpty(req.${pascalize(c.javaName)}))\n` +
        `            q = q.Where(e => EF.Functions.Like(e.${pascalize(c.javaName)}!, $"%{req.${pascalize(c.javaName)}}%"));`
    ).join('\n');

    const sortCases = dataCols.filter(c => !c.isAudit).flatMap(c => [
        `            "${c.javaName} asc"  => q.OrderBy(e => e.${pascalize(c.javaName)}),`,
        `            "${c.javaName} desc" => q.OrderByDescending(e => e.${pascalize(c.javaName)}),`
    ]).join('\n');

    return `using ${rootNs}.Data;
using ${rootNs}.Dtos;
using ${rootNs}.Models;
using Microsoft.EntityFrameworkCore;

namespace ${rootNs}.Repositories;

public class ${className}Repository
{
    private readonly AppDbContext _db;
    public ${className}Repository(AppDbContext db) { _db = db; }

    public async Task<${className}?> SelectByIdAsync(${pkArgs})
    {
        return await _db.${className}s.FirstOrDefaultAsync(e => ${pkFilter});
    }

    public async Task<List<${className}>> SelectListAsync(${className}Request req)
    {
        var q = BuildQuery(req);
        if (req.PageSize > 0 && req.PageNo > 0)
            q = q.Skip(req.Offset).Take(req.PageSize);
        return await q.ToListAsync();
    }

    public async Task<(List<${className}> rows, long total, int pageNo, int pageSize)>
        SelectPageListAsync(${className}Request req)
    {
        var pageNo   = req.PageNo   > 0 ? req.PageNo   : 1;
        var pageSize = req.PageSize > 0 ? req.PageSize : 10;

        var q = BuildQuery(req);
        var total = await q.LongCountAsync();
        var rows = await q.Skip((pageNo - 1) * pageSize).Take(pageSize).ToListAsync();
        return (rows, total, pageNo, pageSize);
    }

    public async Task<${className}> InsertAsync(${className} entity)
    {
        _db.${className}s.Add(entity);
        await _db.SaveChangesAsync();
        return entity;
    }

    public async Task<int> UpdateAsync(${className} entity)
    {
        _db.${className}s.Update(entity);
        return await _db.SaveChangesAsync();
    }

    public async Task<int> DeleteAsync(${pkArgs})
    {
        var entity = await SelectByIdAsync(${pkCols.map(c => c.javaName).join(', ')});
        if (entity == null) return 0;
        _db.${className}s.Remove(entity);
        return await _db.SaveChangesAsync();
    }

    /// <summary>검색조건 + 정렬 적용된 쿼리</summary>
    private IQueryable<${className}> BuildQuery(${className}Request req)
    {
        var q = _db.${className}s.AsNoTracking();
${condIfs}
        // 정렬
        q = req.SortBy switch
        {
${sortCases}
            _ => q
        };
        return q;
    }
}
`;
}

// ----- Services/<Class>Service.cs -----
function gnCsEfServiceSource(rootNs, className, pkCols, nonPkCols, hasAudit) {
    const pkArgs = pkCols.map(c => `${mapCsType(c.javaType, false)} ${c.javaName}`).join(', ');
    const pkCall = pkCols.map(c => c.javaName).join(', ');
    const reqPkCall = pkCols.map(c => `req.${pascalize(c.javaName)}!`).join(', ');

    const reqToEntityProps = nonPkCols.filter(c => !c.isAudit).map(c =>
        `            ${pascalize(c.javaName)} = req.${pascalize(c.javaName)}`
    ).concat(pkCols.map(c =>
        `            ${pascalize(c.javaName)} = req.${pascalize(c.javaName)}!`
    )).join(',\n');

    const entityToItemProps = nonPkCols.filter(c => !c.isAudit).map(c =>
        `            ${pascalize(c.javaName)} = e.${pascalize(c.javaName)}`
    ).concat(pkCols.map(c =>
        `            ${pascalize(c.javaName)} = e.${pascalize(c.javaName)}`
    )).concat(hasAudit ? [
        `            RegId = e.RegId`,
        `            RegDt = e.RegDt`,
        `            UpdId = e.UpdId`,
        `            UpdDt = e.UpdDt`
    ] : []).join(',\n');

    const updateAssigns = nonPkCols.filter(c => !c.isAudit).map(c =>
        `        e.${pascalize(c.javaName)} = req.${pascalize(c.javaName)};`
    ).join('\n');

    const patchAssigns = nonPkCols.filter(c => !c.isAudit).map(c =>
        `        if (req.${pascalize(c.javaName)} != null) e.${pascalize(c.javaName)} = req.${pascalize(c.javaName)};`
    ).join('\n');

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
        var entity = new ${className}
        {
${reqToEntityProps}
        };
        await _repo.InsertAsync(entity);
        return ToItem(entity);
    }

    public async Task<${className}Item> UpdateAsync(${pkArgs}, ${className}Request req)
    {
        var e = await _repo.SelectByIdAsync(${pkCall})
            ?? throw new KeyNotFoundException($"${className} not found");
${updateAssigns}
        await _repo.UpdateAsync(e);
        return ToItem(e);
    }

    public async Task<${className}Item> PatchAsync(${pkArgs}, ${className}Request req)
    {
        var e = await _repo.SelectByIdAsync(${pkCall})
            ?? throw new KeyNotFoundException($"${className} not found");
${patchAssigns}
        await _repo.UpdateAsync(e);
        return ToItem(e);
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

    /// <summary>목록 일괄 저장 (D → U → I)</summary>
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

// ----- Controllers/<Class>Controller.cs -----
function gnCsEfControllerSource(rootNs, className, endpoint, pkCols) {
    const pkRoute = pkCols.map(c => `{${c.javaName}}`).join('/');
    const pkArgs = pkCols.map(c => `${mapCsType(c.javaType, false)} ${c.javaName}`).join(', ');
    const pkCall = pkCols.map(c => c.javaName).join(', ');

    return `using ${rootNs}.Dtos;
using ${rootNs}.Services;
using Microsoft.AspNetCore.Mvc;

namespace ${rootNs}.Controllers;

[ApiController]
[Route("api/csharp/efcore/${endpoint}")]
public class ${className}Controller : ControllerBase
{
    private readonly ${className}Service _service;
    public ${className}Controller(${className}Service service) { _service = service; }

    /// <summary>단건 조회</summary>
    [HttpGet("${pkRoute}")]
    public async Task<ActionResult<${className}Item>> SelectById(${pkArgs})
        => Ok(await _service.SelectByIdAsync(${pkCall}));

    /// <summary>페이지 목록</summary>
    [HttpGet("page-list")]
    public async Task<ActionResult<${className}Response>> PageList([FromQuery] ${className}Request req)
        => Ok(await _service.SelectPageListAsync(req));

    /// <summary>전체 목록</summary>
    [HttpGet("list")]
    public async Task<ActionResult<List<${className}Item>>> List([FromQuery] ${className}Request req)
        => Ok(await _service.SelectListAsync(req));

    /// <summary>등록</summary>
    [HttpPost]
    public async Task<ActionResult<${className}Item>> Insert([FromBody] ${className}Request req)
        => Ok(await _service.InsertAsync(req));

    /// <summary>수정 (전체 교체)</summary>
    [HttpPut("${pkRoute}")]
    public async Task<ActionResult<${className}Item>> Update(${pkArgs}, [FromBody] ${className}Request req)
        => Ok(await _service.UpdateAsync(${pkCall}, req));

    /// <summary>부분 수정 (PATCH)</summary>
    [HttpPatch("${pkRoute}")]
    public async Task<ActionResult<${className}Item>> Patch(${pkArgs}, [FromBody] ${className}Request req)
        => Ok(await _service.PatchAsync(${pkCall}, req));

    /// <summary>삭제</summary>
    [HttpDelete("${pkRoute}")]
    public async Task<IActionResult> Delete(${pkArgs})
    {
        await _service.DeleteAsync(${pkCall});
        return NoContent();
    }

    /// <summary>단건 일괄 저장 (rowStatus = I/U/D)</summary>
    [HttpPost("save-one")]
    public async Task<ActionResult<${className}Item?>> SaveOne([FromBody] ${className}Request req)
        => Ok(await _service.SaveOneAsync(req));

    /// <summary>목록 일괄 저장 (D → U → I)</summary>
    [HttpPost("save-list")]
    public async Task<IActionResult> SaveList([FromBody] List<${className}Request> reqList)
    {
        await _service.SaveListAsync(reqList);
        return NoContent();
    }
}
`;
}

// ----- 헬퍼 -----
function pascalize(camelStr) {
    return camelStr.charAt(0).toUpperCase() + camelStr.slice(1);
}

function mapCsType(javaType, nullable) {
    let base;
    switch (javaType) {
        case 'String':              base = 'string'; break;
        case 'Integer':             base = 'int'; break;
        case 'Long':                base = 'long'; break;
        case 'Boolean':             base = 'bool'; break;
        case 'LocalDateTime':       base = 'DateTime'; break;
        case 'LocalDate':           base = 'DateOnly'; break;
        case 'java.math.BigDecimal':base = 'decimal'; break;
        default:                    base = 'string'; break;
    }
    // value type 은 nullable 일 때 ?, string 은 nullable string?
    if (nullable) return base + '?';
    return base;
}
