/* ===== Source Generator : Frontend (iOS — SwiftUI + Swift) =====
 *  - <ProjectName>.xcodeproj/project.pbxproj 같은 Xcode 프로젝트 파일은 본 생성기에서는 만들지 않음.
 *    → 사용자는 Xcode 에서 신규 SwiftUI 프로젝트를 만들고 아래 Swift 파일들을 넣으면 됨.
 *
 *  - README.md                          ← 빌드 안내
 *  - Sources/<Class>App.swift           ← @main 진입점
 *  - Sources/Models/<Class>.swift       ← Codable 모델
 *  - Sources/Services/<Class>Api.swift  ← URLSession HTTP 클라이언트
 *  - Sources/Views/<Class>View.swift    ← SwiftUI CRUD 화면
 *
 * 의존: gnAuditFields() (sourcegen.js)
 * 빌드 필수: Xcode 16+, Swift 5.10+, iOS 17+
 */

// ----- 헬퍼: Java type -> Swift type -----
function fmSwType(javaType) {
    switch (javaType) {
        case 'String':              return 'String';
        case 'Integer':             return 'Int';
        case 'Long':                return 'Int64';
        case 'Boolean':             return 'Bool';
        case 'LocalDateTime':       return 'String';   // ISO 문자열 (Codable 단순화)
        case 'LocalDate':           return 'String';
        case 'java.math.BigDecimal':return 'Double';
        default:                    return 'String';
    }
}

// ----- README.md -----
function gnIosReadmeSource(className) {
    return `# ${className} iOS App

## 빌드
1. Xcode 에서 새 프로젝트 생성: **iOS → App → Interface: SwiftUI**.
2. 본 폴더의 \`Sources/\` 안 \`.swift\` 파일들을 모두 프로젝트에 드래그하여 추가 (\"Copy items if needed\" 체크).
3. \`Sources/${className}App.swift\` 가 이미 \`@main\` 이므로 Xcode 가 자동 생성한 \`<ProjectName>App.swift\` 는 삭제.
4. **Info.plist** 또는 \`Project → Info → App Transport Security Settings\` 에 다음 추가
   (개발 시 http 호출 허용; 운영은 https):
   - \`Allow Arbitrary Loads\` → \`YES\`
5. \`${className}Api.swift\` 의 \`baseURL\` 을 백엔드 IP 로 수정 — 시뮬레이터는 \`localhost\` 가능, 실디바이스는 PC LAN IP.

## 동작
- 검색 / 페이지 / 목록 / 등록 / 수정 / 삭제 + 일괄 저장(saveOne, saveList) 지원
- 백엔드 API \`/api/${className.toLowerCase()}/...\` 호출 (Swift 코드 안에서 endpoint 수정 가능)
`;
}

// ----- <Class>App.swift -----
function gnIosAppSwiftSource(className) {
    return `// SwiftUI 진입점
import SwiftUI

@main
struct ${className}App: App {
    var body: some Scene {
        WindowGroup {
            ${className}View()
        }
    }
}
`;
}

// ----- Models/<Class>.swift -----
function gnIosModelSource(className, dataCols, hasAudit) {
    const allItemCols = hasAudit ? [...dataCols, ...gnAuditFields()] : dataCols;
    const props = allItemCols.map(c => {
        const t = fmSwType(c.javaType);
        return `    var ${c.javaName}: ${t}? = nil`;
    }).join('\n');

    // CodingKeys 는 동일 이름이라 생략 가능. 단, rowStatus 까지 포함하려면 별도 필요 — 단순화 위해 자동 매핑.
    return `// ${className} 모델 — Codable 자동 매핑
import Foundation

struct ${className}: Codable, Identifiable, Hashable {
${props}

    /// SwiftUI List 의 id 로 사용 — PK 들의 조합
    var id: String {
        return [${allItemCols.filter(c => c.isPk).map(c => `${c.javaName} ?? ""`).join(', ')}].joined(separator: "|")
    }

    /// 일괄 저장 시 사용 (서버에 전송)
    var rowStatus: String? = nil

    enum CodingKeys: String, CodingKey {
${allItemCols.map(c => `        case ${c.javaName}`).join('\n')}
        case rowStatus
    }
}

/// 페이지 응답 DTO
struct ${className}PageResponse: Codable {
    let pageList: [${className}]
    let pageTotalCount: Int
    let pageNo: Int
    let pageSize: Int
    let pageTotalPages: Int
}
`;
}

// ----- Services/<Class>Api.swift -----
function gnIosApiSource(endpoint, className, pkCols) {
    const pkParams = pkCols.map(c => `${c.javaName}: String`).join(', ');
    const pkPath = pkCols.map(c => `\\(${c.javaName})`).join('/');

    return `// ${className} REST API — URLSession 기반 (의존성 없음)
import Foundation

struct ${className}Api {
    /// 시뮬레이터: localhost / 실디바이스: PC LAN IP. http 사용 시 Info.plist 의 ATS 허용 필요.
    static let baseURL = "http://localhost:8080/api/${endpoint}"

    // === 공통 fetch ===
    private static func request<T: Decodable>(
        _ url: URL,
        method: String = "GET",
        body: Encodable? = nil
    ) async throws -> T {
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let body = body {
            req.httpBody = try JSONEncoder().encode(AnyEncodable(body))
        }
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse else {
            throw NSError(domain: "Api", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid response"])
        }
        guard (200..<300).contains(http.statusCode) else {
            let msg = String(data: data, encoding: .utf8) ?? "HTTP \\(http.statusCode)"
            throw NSError(domain: "Api", code: http.statusCode, userInfo: [NSLocalizedDescriptionKey: msg])
        }
        if http.statusCode == 204 || data.isEmpty {
            return try JSONDecoder().decode(T.self, from: "{}".data(using: .utf8)!)
        }
        return try JSONDecoder().decode(T.self, from: data)
    }

    // === 검색조건 → query string ===
    private static func buildQs(_ params: [String: Any]) -> String {
        let comps = params.compactMap { (k, v) -> URLQueryItem? in
            let s = "\\(v)"
            return s.isEmpty ? nil : URLQueryItem(name: k, value: s)
        }
        var u = URLComponents()
        u.queryItems = comps
        return u.percentEncodedQuery ?? ""
    }

    // === REST 엔드포인트 ===
    static func selectPageData(_ params: [String: Any]) async throws -> ${className}PageResponse {
        let qs = buildQs(params)
        let url = URL(string: "\\(baseURL)/page-list?\\(qs)")!
        return try await request(url)
    }

    static func selectList(_ params: [String: Any]) async throws -> [${className}] {
        let qs = buildQs(params)
        let url = URL(string: "\\(baseURL)/list?\\(qs)")!
        return try await request(url)
    }

    static func selectOne(${pkParams}) async throws -> ${className} {
        let url = URL(string: "\\(baseURL)/${pkPath}")!
        return try await request(url)
    }

    static func create(_ form: ${className}) async throws -> ${className} {
        let url = URL(string: baseURL)!
        return try await request(url, method: "POST", body: form)
    }

    static func update(${pkParams}, form: ${className}) async throws -> ${className} {
        let url = URL(string: "\\(baseURL)/${pkPath}")!
        return try await request(url, method: "PUT", body: form)
    }

    static func remove(${pkParams}) async throws {
        let url = URL(string: "\\(baseURL)/${pkPath}")!
        let _: EmptyResponse = try await request(url, method: "DELETE")
    }

    static func saveOne(_ form: ${className}) async throws -> ${className}? {
        let url = URL(string: "\\(baseURL)/save-one")!
        return try await request(url, method: "POST", body: form)
    }

    static func saveList(_ rows: [${className}]) async throws {
        let url = URL(string: "\\(baseURL)/save-list")!
        let _: EmptyResponse = try await request(url, method: "POST", body: rows)
    }
}

// === 헬퍼 — 빈 응답 / 임의 Encodable 래퍼 ===
struct EmptyResponse: Codable {}

struct AnyEncodable: Encodable {
    let value: Encodable
    init(_ value: Encodable) { self.value = value }
    func encode(to encoder: Encoder) throws { try value.encode(to: encoder) }
}
`;
}

// ----- Views/<Class>View.swift -----
function gnIosViewSource(endpoint, className, dataCols, pkCols, nonPkCols, hasAudit) {
    const allItemCols = hasAudit ? [...dataCols, ...gnAuditFields()] : dataCols;
    const stringCols = dataCols.filter(c => c.javaType === 'String' && !c.isAudit);
    const formCols = [...pkCols, ...nonPkCols.filter(c => !c.isAudit)];

    const titleField = (allItemCols[1] || allItemCols[0])?.javaName || pkCols[0]?.javaName;
    const subField   = (allItemCols[0])?.javaName || pkCols[0]?.javaName;

    const searchStateProps = stringCols.map(c =>
        `    @State private var s_${c.javaName}: String = ""`
    ).join('\n');
    const formStateProps = formCols.map(c =>
        `    @State private var f_${c.javaName}: String = ""`
    ).join('\n');

    const searchInputs = stringCols.map(c =>
        `                        TextField("${c.name}", text: $s_${c.javaName})\n` +
        `                            .textFieldStyle(.roundedBorder)`
    ).join('\n');

    const formInputs = formCols.map(c => {
        const isPk = c.isPk ? 'true' : 'false';
        return `                    TextField("${c.name}", text: $f_${c.javaName})\n` +
               `                        .textFieldStyle(.roundedBorder)\n` +
               `                        .disabled(editMode == "update" && ${isPk})`;
    }).join('\n');

    const searchToParams = stringCols.map(c =>
        `        if !s_${c.javaName}.isEmpty { params["${c.javaName}"] = s_${c.javaName} }`
    ).join('\n');

    const searchClear = stringCols.map(c => `        s_${c.javaName} = ""`).join('\n');

    const loadFormFromRow = formCols.map(c =>
        `        f_${c.javaName} = r.${c.javaName} ?? ""`
    ).join('\n');

    const clearForm = formCols.map(c => `        f_${c.javaName} = ""`).join('\n');

    const buildReq = formCols.map(c => {
        const t = fmSwType(c.javaType);
        if (t === 'String') {
            return `        req.${c.javaName} = f_${c.javaName}`;
        }
        if (t === 'Int' || t === 'Int64') {
            return `        req.${c.javaName} = ${t}(f_${c.javaName})`;
        }
        if (t === 'Bool') {
            return `        req.${c.javaName} = Bool(f_${c.javaName})`;
        }
        if (t === 'Double') {
            return `        req.${c.javaName} = Double(f_${c.javaName})`;
        }
        return `        req.${c.javaName} = f_${c.javaName}`;
    }).join('\n');

    const pkArgsForUpdate = pkCols.map(c => `${c.javaName}: f_${c.javaName}`).join(', ');
    const pkArgsForRemove = pkCols.map(c => `${c.javaName}: r.${c.javaName} ?? ""`).join(', ');

    return `// ${className} CRUD 화면 — SwiftUI
import SwiftUI

struct ${className}View: View {

    // === 데이터 상태 ===
    @State private var list: [${className}] = []
    @State private var pageNo: Int = 1
    @State private var pageSize: Int = 10
    @State private var pageTotalCount: Int = 0
    @State private var pageTotalPages: Int = 0
    @State private var loading: Bool = false
    @State private var errMsg: String? = nil

    // === 검색 입력 ===
${searchStateProps}

    // === 모달 입력 ===
    @State private var showSheet: Bool = false
    @State private var editMode: String = "insert"   // "insert" | "update"
${formStateProps}

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {

                // === 검색 영역 ===
                DisclosureGroup("검색 조건") {
                    VStack(spacing: 8) {
${searchInputs}
                        HStack {
                            Button("검색") { Task { await searchPage(1) } }
                                .buttonStyle(.borderedProminent)
                                .frame(maxWidth: .infinity)
                            Button("초기화") {
${searchClear}
                                Task { await searchPage(1) }
                            }
                                .buttonStyle(.bordered)
                                .frame(maxWidth: .infinity)
                        }
                    }
                    .padding(.vertical, 8)
                }
                .padding()

                // === 메타 ===
                HStack {
                    Text("총 \\(pageTotalCount)건 / \\(pageTotalPages)페이지").font(.caption).foregroundStyle(.secondary)
                    Spacer()
                    if loading { ProgressView().scaleEffect(0.6) }
                }
                .padding(.horizontal)

                if let msg = errMsg {
                    Text("오류: \\(msg)").foregroundStyle(.red).font(.caption).padding(.horizontal)
                }

                // === 리스트 ===
                List(list) { r in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(r.${titleField} ?? "").fontWeight(.semibold)
                            Text(r.${subField} ?? "").font(.caption).foregroundStyle(.secondary)
                        }
                        Spacer()
                        Button("수정") { openUpdate(r) }
                            .buttonStyle(.borderless).foregroundStyle(.orange)
                        Button("삭제") {
                            Task {
                                do {
                                    try await ${className}Api.remove(${pkArgsForRemove})
                                    await searchPage(pageNo)
                                } catch { errMsg = "\\(error)" }
                            }
                        }
                        .buttonStyle(.borderless).foregroundStyle(.red)
                    }
                }
                .listStyle(.plain)

                // === 페이징 ===
                if pageTotalPages > 0 {
                    HStack {
                        Button("«") { Task { await searchPage(1) } }.disabled(pageNo <= 1)
                        Button("‹") { Task { await searchPage(pageNo - 1) } }.disabled(pageNo <= 1)
                        Text("\\(pageNo) / \\(pageTotalPages)").padding(.horizontal)
                        Button("›") { Task { await searchPage(pageNo + 1) } }.disabled(pageNo >= pageTotalPages)
                        Button("»") { Task { await searchPage(pageTotalPages) } }.disabled(pageNo >= pageTotalPages)
                    }
                    .padding(.vertical, 8)
                }
            }
            .navigationTitle("${className}")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button("+ 신규") { openInsert() }
                }
            }
            .task { await searchPage(1) }
            .sheet(isPresented: $showSheet) {
                NavigationStack {
                    Form {
${formInputs}
                    }
                    .navigationTitle(editMode == "insert" ? "신규 등록" : "수정")
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("취소") { showSheet = false }
                        }
                        ToolbarItem(placement: .confirmationAction) {
                            Button("저장") {
                                Task { await save() }
                            }
                        }
                    }
                }
            }
        }
    }

    // === Actions ===
    private func searchPage(_ p: Int) async {
        loading = true
        defer { loading = false }
        errMsg = nil
        var params: [String: Any] = ["pageNo": p, "pageSize": pageSize]
${searchToParams}
        do {
            let res = try await ${className}Api.selectPageData(params)
            list = res.pageList
            pageNo = res.pageNo
            pageSize = res.pageSize
            pageTotalCount = res.pageTotalCount
            pageTotalPages = res.pageTotalPages
        } catch {
            errMsg = "\\(error)"
        }
    }

    private func openInsert() {
${clearForm}
        editMode = "insert"
        showSheet = true
    }

    private func openUpdate(_ r: ${className}) {
${loadFormFromRow}
        editMode = "update"
        showSheet = true
    }

    private func save() async {
        var req = ${className}()
${buildReq}
        do {
            if editMode == "insert" {
                _ = try await ${className}Api.create(req)
            } else {
                _ = try await ${className}Api.update(${pkArgsForUpdate}, form: req)
            }
            showSheet = false
            await searchPage(pageNo)
        } catch {
            errMsg = "\\(error)"
        }
    }
}

#Preview {
    ${className}View()
}
`;
}
