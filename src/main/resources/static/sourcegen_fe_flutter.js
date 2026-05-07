/* ===== Source Generator : Frontend (Flutter — Mobile) =====
 *  - pubspec.yaml
 *  - lib/main.dart                       ← 진입점 (MaterialApp)
 *  - lib/screens/<endpoint>_screen.dart  ← CRUD 화면 (검색/리스트/페이징/모달)
 *  - lib/models/<endpoint>.dart          ← Dart 모델 (fromJson/toJson)
 *  - lib/services/<endpoint>_service.dart ← API 호출 (dio)
 *
 * 의존: gnAuditFields() (sourcegen.js)
 * 빌드 필수: flutter run / flutter build apk
 */

// ----- pubspec.yaml -----
function gnFlPubspecSource(endpoint) {
    return `name: ${endpoint}_app
description: Generated CRUD Flutter app
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: ^3.4.0

dependencies:
  flutter:
    sdk: flutter
  dio: ^5.4.0
  intl: ^0.19.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0

flutter:
  uses-material-design: true
`;
}

// ----- lib/main.dart -----
function gnFlMainDartSource(endpoint, className) {
    return `// Flutter 진입점 — MaterialApp 으로 ${className}Screen 마운트
import 'package:flutter/material.dart';
import 'screens/${endpoint}_screen.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '${className} CRUD',
      theme: ThemeData(
        colorSchemeSeed: const Color(0xFF4F7DF3),
        useMaterial3: true,
      ),
      home: const ${className}Screen(),
    );
  }
}
`;
}

// ----- lib/models/<endpoint>.dart -----
function gnFlModelDartSource(endpoint, className, dataCols, pkCols, hasAudit) {
    const allItemCols = hasAudit ? [...dataCols, ...gnAuditFields()] : dataCols;

    const fields = allItemCols.map(c => {
        const t = mapDartType(c.javaType);
        return `  ${t}? ${c.javaName};`;
    }).join('\n');

    const ctorParams = allItemCols.map(c => `    this.${c.javaName},`).join('\n');

    const fromJsonAssigns = allItemCols.map(c => {
        if (c.javaType === 'LocalDateTime' || c.javaType === 'LocalDate') {
            return `      ${c.javaName}: json['${c.javaName}'] != null ? DateTime.tryParse(json['${c.javaName}'].toString()) : null,`;
        }
        if (c.javaType === 'Integer' || c.javaType === 'Long') {
            return `      ${c.javaName}: json['${c.javaName}'] is int ? json['${c.javaName}'] as int : int.tryParse('\${json['${c.javaName}']}'),`;
        }
        if (c.javaType === 'Boolean') {
            return `      ${c.javaName}: json['${c.javaName}'] as bool?,`;
        }
        if (c.javaType === 'java.math.BigDecimal') {
            return `      ${c.javaName}: json['${c.javaName}'] != null ? double.tryParse('\${json['${c.javaName}']}') : null,`;
        }
        return `      ${c.javaName}: json['${c.javaName}']?.toString(),`;
    }).join('\n');

    const toJsonEntries = allItemCols.map(c => {
        if (c.javaType === 'LocalDateTime' || c.javaType === 'LocalDate') {
            return `      '${c.javaName}': ${c.javaName}?.toIso8601String(),`;
        }
        return `      '${c.javaName}': ${c.javaName},`;
    }).join('\n');

    return `// ${className} 모델 — fromJson / toJson 지원
class ${className} {
${fields}

  ${className}({
${ctorParams}
  });

  factory ${className}.fromJson(Map<String, dynamic> json) {
    return ${className}(
${fromJsonAssigns}
    );
  }

  Map<String, dynamic> toJson() => {
${toJsonEntries}
  };
}

/// 페이지 응답 DTO
class ${className}PageResponse {
  final List<${className}> pageList;
  final int pageTotalCount;
  final int pageNo;
  final int pageSize;
  final int pageTotalPages;

  ${className}PageResponse({
    required this.pageList,
    required this.pageTotalCount,
    required this.pageNo,
    required this.pageSize,
    required this.pageTotalPages,
  });

  factory ${className}PageResponse.fromJson(Map<String, dynamic> json) {
    final list = (json['pageList'] as List? ?? [])
        .map((e) => ${className}.fromJson(e as Map<String, dynamic>))
        .toList();
    return ${className}PageResponse(
      pageList: list,
      pageTotalCount: (json['pageTotalCount'] as num?)?.toInt() ?? 0,
      pageNo:         (json['pageNo']         as num?)?.toInt() ?? 1,
      pageSize:       (json['pageSize']       as num?)?.toInt() ?? 10,
      pageTotalPages: (json['pageTotalPages'] as num?)?.toInt() ?? 0,
    );
  }
}
`;
}

// ----- lib/services/<endpoint>_service.dart -----
function gnFlServiceDartSource(endpoint, className, pkCols) {
    const pkParams = pkCols.map(c => `String ${c.javaName}`).join(', ');
    const pkPath = pkCols.map(c => `\${${c.javaName}}`).join('/');

    return `// API 호출 — dio 사용. 시뮬레이터/에뮬레이터에서는 localhost 대신 PC IP 사용
import 'package:dio/dio.dart';
import '../models/${endpoint}.dart';

class ${className}Service {
  // Android 에뮬레이터: 10.0.2.2 가 호스트 PC. iOS 시뮬레이터: localhost OK.
  static const String baseUrl = 'http://10.0.2.2:8080/api/${endpoint}';

  final Dio _dio = Dio(BaseOptions(
    headers: {'Content-Type': 'application/json'},
  ));

  /// 페이지 목록 조회
  Future<${className}PageResponse> selectPageList(Map<String, dynamic> search) async {
    final qs = search.entries
        .where((e) => e.value != null && e.value.toString().isNotEmpty)
        .map((e) => '\${Uri.encodeQueryComponent(e.key)}=\${Uri.encodeQueryComponent(e.value.toString())}')
        .join('&');
    final res = await _dio.get('\$baseUrl/page-list?\$qs');
    return ${className}PageResponse.fromJson(res.data as Map<String, dynamic>);
  }

  /// 단건 조회
  Future<${className}> selectById(${pkParams}) async {
    final res = await _dio.get('\$baseUrl/${pkPath}');
    return ${className}.fromJson(res.data as Map<String, dynamic>);
  }

  /// 등록
  Future<${className}> create(${className} req) async {
    final res = await _dio.post(baseUrl, data: req.toJson());
    return ${className}.fromJson(res.data as Map<String, dynamic>);
  }

  /// 수정
  Future<${className}> update(${pkParams}, ${className} req) async {
    final res = await _dio.put('\$baseUrl/${pkPath}', data: req.toJson());
    return ${className}.fromJson(res.data as Map<String, dynamic>);
  }

  /// 삭제
  Future<void> remove(${pkParams}) async {
    await _dio.delete('\$baseUrl/${pkPath}');
  }

  /// 단건 일괄 저장 (rowStatus = I/U/D)
  Future<${className}?> saveOne(${className} req) async {
    final res = await _dio.post('\$baseUrl/save-one', data: req.toJson());
    if (res.data == null) return null;
    return ${className}.fromJson(res.data as Map<String, dynamic>);
  }

  /// 목록 일괄 저장 (D → U → I 순)
  Future<void> saveList(List<${className}> rows) async {
    await _dio.post('\$baseUrl/save-list',
        data: rows.map((r) => r.toJson()).toList());
  }
}
`;
}

// ----- lib/screens/<endpoint>_screen.dart -----
function gnFlScreenDartSource(endpoint, className, dataCols, pkCols, nonPkCols, hasAudit) {
    const allItemCols = hasAudit ? [...dataCols, ...gnAuditFields()] : dataCols;
    const stringCols = dataCols.filter(c => c.javaType === 'String' && !c.isAudit);

    // 검색 입력 필드 (모바일은 좁으므로 string 컬럼만)
    const searchControllers = stringCols.map(c =>
        `  final TextEditingController _${c.javaName}Ctrl = TextEditingController();`
    ).join('\n');

    const searchInputs = stringCols.map(c =>
        `              _searchInput('${c.name}', _${c.javaName}Ctrl),`
    ).join('\n');

    const searchToMap = stringCols.map(c =>
        `      '${c.javaName}': _${c.javaName}Ctrl.text,`
    ).join('\n');

    const searchClear = stringCols.map(c =>
        `    _${c.javaName}Ctrl.clear();`
    ).join('\n');

    // 모달 필드 컨트롤러 (PK + 비-PK 데이터 컬럼)
    const formCols = [...pkCols, ...nonPkCols.filter(c => !c.isAudit)];
    const formControllers = formCols.map(c =>
        `  final TextEditingController _f${pascalize(c.javaName)} = TextEditingController();`
    ).join('\n');

    const formClear = formCols.map(c =>
        `    _f${pascalize(c.javaName)}.clear();`
    ).join('\n');

    const formLoadFromRow = formCols.map(c =>
        `    _f${pascalize(c.javaName)}.text = row.${c.javaName} ?? '';`
    ).join('\n');

    const formInputs = formCols.map(c => {
        const isPk = c.isPk;
        return `              _formInput('${c.name}', _f${pascalize(c.javaName)}, disabled: _editMode == 'update' && ${isPk}),`;
    }).join('\n');

    const formToReq = formCols.map(c => {
        if (c.javaType === 'String') {
            return `      ..${c.javaName} = _f${pascalize(c.javaName)}.text`;
        }
        // 모바일은 단순화 — text 그대로 모델에 넣되, 비-string 은 호출자가 백엔드 처리
        return `      ..${c.javaName} = _f${pascalize(c.javaName)}.text as dynamic`;
    }).join('\n') + ';';

    // 리스트 row 표시: PK + nm 만 (모바일 좁음)
    const displayCols = allItemCols.slice(0, 2).map(c => c.javaName);
    const titleField = displayCols[1] || displayCols[0] || pkCols[0]?.javaName;
    const subField = displayCols[0] || pkCols[0]?.javaName;

    const pkArgsForCall = pkCols.map(c => `r.${c.javaName} ?? ''`).join(', ');

    return `// ${className} CRUD 화면 — 검색 + 리스트 + 페이징 + 등록/수정 모달
import 'package:flutter/material.dart';
import '../models/${endpoint}.dart';
import '../services/${endpoint}_service.dart';

class ${className}Screen extends StatefulWidget {
  const ${className}Screen({super.key});

  @override
  State<${className}Screen> createState() => _${className}ScreenState();
}

class _${className}ScreenState extends State<${className}Screen> {
  final ${className}Service _service = ${className}Service();

  // 검색 입력 컨트롤러
${searchControllers}

  // 모달 입력 컨트롤러
${formControllers}

  List<${className}> _list = [];
  int _pageNo = 1;
  int _pageSize = 10;
  int _pageTotalCount = 0;
  int _pageTotalPages = 0;
  String _sortBy = '';

  String _editMode = 'insert';   // 'insert' | 'update'
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _searchPage(1);
  }

  Future<void> _searchPage(int p) async {
    setState(() => _loading = true);
    try {
      final params = <String, dynamic>{
${searchToMap}
        'pageNo': p,
        'pageSize': _pageSize,
        'sortBy': _sortBy,
      };
      final res = await _service.selectPageList(params);
      setState(() {
        _list = res.pageList;
        _pageNo = res.pageNo;
        _pageSize = res.pageSize;
        _pageTotalCount = res.pageTotalCount;
        _pageTotalPages = res.pageTotalPages;
      });
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('오류: \$e')));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _resetSearch() {
${searchClear}
    _sortBy = '';
    _searchPage(1);
  }

  void _toggleSort(String col) {
    setState(() {
      if (_sortBy == '\$col asc') _sortBy = '\$col desc';
      else if (_sortBy == '\$col desc') _sortBy = '';
      else _sortBy = '\$col asc';
    });
    _searchPage(1);
  }

  void _openInsert() {
${formClear}
    setState(() => _editMode = 'insert');
    _showFormDialog();
  }

  void _openUpdate(${className} row) {
${formLoadFromRow}
    setState(() => _editMode = 'update');
    _showFormDialog();
  }

  Future<void> _save() async {
    final req = ${className}()
${formToReq}
    try {
      if (_editMode == 'insert') {
        await _service.create(req);
      } else {
        await _service.update(${pkCols.map(c => `req.${c.javaName} ?? ''`).join(', ')}, req);
      }
      if (mounted) Navigator.of(context).pop();
      _searchPage(_pageNo);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('저장 실패: \$e')));
    }
  }

  Future<void> _delete(${className} r) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('삭제'),
        content: const Text('정말 삭제하시겠습니까?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('취소')),
          TextButton(onPressed: () => Navigator.pop(context, true),  child: const Text('확인')),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await _service.remove(${pkArgsForCall});
      _searchPage(_pageNo);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('삭제 실패: \$e')));
    }
  }

  void _showFormDialog() {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(_editMode == 'insert' ? '신규 등록' : '수정'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
${formInputs}
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('취소')),
          FilledButton(onPressed: _save, child: const Text('저장')),
        ],
      ),
    );
  }

  Widget _searchInput(String label, TextEditingController ctrl) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: TextField(
        controller: ctrl,
        decoration: InputDecoration(labelText: label, isDense: true, border: const OutlineInputBorder()),
      ),
    );
  }

  Widget _formInput(String label, TextEditingController ctrl, {bool disabled = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: TextField(
        controller: ctrl,
        enabled: !disabled,
        decoration: InputDecoration(labelText: label, isDense: true, border: const OutlineInputBorder()),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('${className}'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: () => _searchPage(_pageNo)),
          IconButton(icon: const Icon(Icons.add),     onPressed: _openInsert),
        ],
      ),
      body: Column(
        children: [
          // === 검색 영역 ===
          ExpansionTile(
            title: const Text('검색'),
            children: [
              Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  children: [
${searchInputs}
                    Row(
                      children: [
                        Expanded(child: FilledButton.icon(
                          onPressed: () => _searchPage(1),
                          icon: const Icon(Icons.search),
                          label: const Text('검색'),
                        )),
                        const SizedBox(width: 8),
                        Expanded(child: OutlinedButton(
                          onPressed: _resetSearch,
                          child: const Text('초기화'),
                        )),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          // === 결과 헤더 ===
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            child: Row(
              children: [
                Text('총 \$_pageTotalCount건 / \$_pageTotalPages페이지', style: const TextStyle(fontSize: 12)),
                const Spacer(),
                if (_loading) const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
              ],
            ),
          ),
          // === 리스트 ===
          Expanded(
            child: _list.isEmpty && !_loading
              ? const Center(child: Text('데이터 없음'))
              : ListView.separated(
                  itemCount: _list.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (_, i) {
                    final r = _list[i];
                    return ListTile(
                      title: Text(r.${titleField} ?? ''),
                      subtitle: Text(r.${subField} ?? ''),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(icon: const Icon(Icons.edit, color: Colors.orange), onPressed: () => _openUpdate(r)),
                          IconButton(icon: const Icon(Icons.delete, color: Colors.red), onPressed: () => _delete(r)),
                        ],
                      ),
                    );
                  },
                ),
          ),
          // === 페이징 ===
          if (_pageTotalPages > 0)
            Padding(
              padding: const EdgeInsets.all(8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  IconButton(
                    icon: const Icon(Icons.first_page),
                    onPressed: _pageNo > 1 ? () => _searchPage(1) : null,
                  ),
                  IconButton(
                    icon: const Icon(Icons.chevron_left),
                    onPressed: _pageNo > 1 ? () => _searchPage(_pageNo - 1) : null,
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: Text('\$_pageNo / \$_pageTotalPages'),
                  ),
                  IconButton(
                    icon: const Icon(Icons.chevron_right),
                    onPressed: _pageNo < _pageTotalPages ? () => _searchPage(_pageNo + 1) : null,
                  ),
                  IconButton(
                    icon: const Icon(Icons.last_page),
                    onPressed: _pageNo < _pageTotalPages ? () => _searchPage(_pageTotalPages) : null,
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
`;
}

function mapDartType(javaType) {
    switch (javaType) {
        case 'String':              return 'String';
        case 'Integer':             return 'int';
        case 'Long':                return 'int';
        case 'Boolean':             return 'bool';
        case 'LocalDateTime':       return 'DateTime';
        case 'LocalDate':           return 'DateTime';
        case 'java.math.BigDecimal':return 'double';
        default:                    return 'String';
    }
}

// pascalize 는 다른 모듈(efcore) 에 정의됨 — 같이 로드되어 사용 가능
