/* ===== Source Generator : Frontend (React Native — Expo) =====
 *  - package.json
 *  - app.json (Expo 설정)
 *  - App.tsx (진입점)
 *  - src/screens/<Class>Screen.tsx (CRUD 화면)
 *  - src/services/<endpoint>Api.ts (API 호출)
 *  - tsconfig.json
 *
 * 의존: gnAuditFields() (sourcegen.js)
 * 빌드 필수: npx expo start
 */

// ----- package.json -----
function gnRnPackageJsonSource(endpoint) {
    return `{
  "name": "${endpoint}-rn-app",
  "version": "1.0.0",
  "main": "node_modules/expo/AppEntry.js",
  "scripts": {
    "start":   "expo start",
    "android": "expo start --android",
    "ios":     "expo start --ios",
    "web":     "expo start --web"
  },
  "dependencies": {
    "expo":         "~51.0.0",
    "expo-status-bar":"~1.12.1",
    "react":        "18.2.0",
    "react-native": "0.74.0"
  },
  "devDependencies": {
    "@babel/core":               "^7.20.0",
    "@types/react":              "~18.2.45",
    "typescript":                "~5.3.3"
  },
  "private": true
}
`;
}

// ----- app.json -----
function gnRnAppJsonSource(endpoint, className) {
    return `{
  "expo": {
    "name": "${className}",
    "slug": "${endpoint}-rn-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "userInterfaceStyle": "light",
    "splash": {
      "backgroundColor": "#ffffff"
    },
    "ios":     { "supportsTablet": true },
    "android": { "adaptiveIcon": { "backgroundColor": "#ffffff" } },
    "web":     { "favicon": "./assets/favicon.png" }
  }
}
`;
}

// ----- tsconfig.json -----
function gnRnTsconfigSource() {
    return `{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true
  }
}
`;
}

// ----- App.tsx -----
function gnRnAppTsxSource(className) {
    return `// Expo 진입점 — ${className}Screen 마운트
import React from 'react';
import { SafeAreaView, StyleSheet, StatusBar } from 'react-native';
import ${className}Screen from './src/screens/${className}Screen';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <${className}Screen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
});
`;
}

// ----- src/services/<endpoint>Api.ts -----
function gnRnApiTsSource(endpoint, className, dataCols, pkCols, hasAudit) {
    const allItemCols = hasAudit ? [...dataCols, ...gnAuditFields()] : dataCols;
    const itemFields = allItemCols.map(c => `  ${c.javaName}?: ${mapTsType(c.javaType)};`).join('\n');
    const pkParams = pkCols.map(c => `${c.javaName}: string`).join(', ');
    const pkPath = pkCols.map(c => `\${${c.javaName}}`).join('/');

    return `// API 호출 — fetch 사용 (시뮬레이터/디바이스 에서는 localhost 대신 PC IP)
// Android 에뮬레이터: http://10.0.2.2:8080  /  iOS 시뮬레이터: http://localhost:8080  /  실디바이스: PC LAN IP
const BASE = 'http://10.0.2.2:8080/api/${endpoint}';

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

// ----- src/screens/<Class>Screen.tsx -----
function gnRnScreenTsxSource(endpoint, className, dataCols, pkCols, nonPkCols, hasAudit) {
    const allItemCols = hasAudit ? [...dataCols, ...gnAuditFields()] : dataCols;
    const stringCols = dataCols.filter(c => c.javaType === 'String' && !c.isAudit);

    const searchKeys = stringCols.map(c => `'${c.javaName}'`).join(', ');
    const formCols = [...pkCols, ...nonPkCols.filter(c => !c.isAudit)];
    const formKeys = formCols.map(c => `'${c.javaName}'`).join(', ');

    // 리스트 표시용 (모바일 좁음)
    const titleField = (allItemCols[1] || allItemCols[0])?.javaName || pkCols[0]?.javaName;
    const subField = (allItemCols[0])?.javaName || pkCols[0]?.javaName;
    const pkArgsForCall = pkCols.map(c => `r.${c.javaName} || ''`).join(', ');

    return `// ${className} CRUD 화면 — 검색 + 리스트 + 페이징 + 등록/수정 모달
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, Modal, Alert,
  StyleSheet, ActivityIndicator, ScrollView,
} from 'react-native';
import * as api from '../services/${endpoint}Api';
import type { ${className} } from '../services/${endpoint}Api';

const SEARCH_KEYS = [${searchKeys}] as const;
const FORM_KEYS   = [${formKeys}] as const;
const PK_KEYS     = [${pkCols.map(c => `'${c.javaName}'`).join(', ')}] as const;

export default function ${className}Screen() {
  const [search, setSearch] = useState<Record<string, any>>({ pageNo: 1, pageSize: 10, sortBy: '' });
  const [list, setList] = useState<${className}[]>([]);
  const [page, setPage] = useState({ pageTotalCount: 0, pageNo: 1, pageSize: 10, pageTotalPages: 0 });
  const [loading, setLoading] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState<'insert' | 'update'>('insert');
  const [form, setForm] = useState<Record<string, any>>({});

  const searchPage = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const next = { ...search, pageNo: p };
      setSearch(next);
      const data = await api.selectPageList(next);
      setList(data.pageList || []);
      setPage(data);
    } catch (e: any) {
      Alert.alert('오류', e.message);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { searchPage(1); /* eslint-disable-next-line */ }, []);

  const resetSearch = () => {
    const empty: Record<string, any> = { pageNo: 1, pageSize: 10, sortBy: '' };
    SEARCH_KEYS.forEach(k => empty[k] = '');
    setSearch(empty);
    setTimeout(() => searchPage(1), 0);
  };

  const openInsert = () => {
    const empty: Record<string, any> = {};
    FORM_KEYS.forEach(k => empty[k] = '');
    setForm(empty);
    setEditMode('insert');
    setModalVisible(true);
  };
  const openUpdate = (row: ${className}) => {
    setForm({ ...row });
    setEditMode('update');
    setModalVisible(true);
  };

  const save = async () => {
    try {
      if (editMode === 'insert') {
        await api.create(form as ${className});
      } else {
        const pkArgs = PK_KEYS.map(k => form[k] || '') as any;
        await api.update(...pkArgs, form as ${className});
      }
      setModalVisible(false);
      searchPage(page.pageNo);
    } catch (e: any) {
      Alert.alert('저장 실패', e.message);
    }
  };

  const removeRow = (r: ${className}) => {
    Alert.alert('삭제', '정말 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '확인',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.remove(${pkArgsForCall});
            searchPage(page.pageNo);
          } catch (e: any) {
            Alert.alert('삭제 실패', e.message);
          }
        }
      },
    ]);
  };

  return (
    <View style={styles.root}>
      {/* === 헤더 === */}
      <View style={styles.header}>
        <Text style={styles.title}>${className}</Text>
        <TouchableOpacity style={styles.btnAdd} onPress={openInsert}>
          <Text style={styles.btnAddText}>+ 신규</Text>
        </TouchableOpacity>
      </View>

      {/* === 검색 === */}
      <ScrollView style={styles.searchBox} keyboardShouldPersistTaps="handled">
        {SEARCH_KEYS.map(k => (
          <View key={k} style={styles.field}>
            <Text style={styles.label}>{k}</Text>
            <TextInput
              style={styles.input}
              value={search[k] || ''}
              onChangeText={(v) => setSearch(s => ({ ...s, [k]: v }))}
            />
          </View>
        ))}
        <View style={styles.btnRow}>
          <TouchableOpacity style={[styles.btn, styles.btnPri]} onPress={() => searchPage(1)}>
            <Text style={styles.btnTextW}>검색</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnSec]} onPress={resetSearch}>
            <Text style={styles.btnText}>초기화</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* === 메타 === */}
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>총 {page.pageTotalCount}건 / {page.pageTotalPages}페이지</Text>
        {loading && <ActivityIndicator size="small" />}
      </View>

      {/* === 리스트 === */}
      <FlatList
        data={list}
        keyExtractor={(r, i) => PK_KEYS.map(k => r[k as keyof ${className}]).join('|') + ':' + i}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>데이터 없음</Text> : null}
        renderItem={({ item: r }) => (
          <View style={styles.listItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.listTitle}>{String(r.${titleField} ?? '')}</Text>
              <Text style={styles.listSub}>{String(r.${subField} ?? '')}</Text>
            </View>
            <TouchableOpacity style={[styles.btnSm, styles.btnWarn]} onPress={() => openUpdate(r)}>
              <Text style={styles.btnTextW}>수정</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnSm, styles.btnDng]} onPress={() => removeRow(r)}>
              <Text style={styles.btnTextW}>삭제</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* === 페이징 === */}
      {page.pageTotalPages > 0 && (
        <View style={styles.paging}>
          <TouchableOpacity disabled={page.pageNo <= 1} onPress={() => searchPage(1)}>
            <Text style={[styles.pagingBtn, page.pageNo <= 1 && styles.disabled]}>«</Text>
          </TouchableOpacity>
          <TouchableOpacity disabled={page.pageNo <= 1} onPress={() => searchPage(page.pageNo - 1)}>
            <Text style={[styles.pagingBtn, page.pageNo <= 1 && styles.disabled]}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.pagingNo}>{page.pageNo} / {page.pageTotalPages}</Text>
          <TouchableOpacity disabled={page.pageNo >= page.pageTotalPages} onPress={() => searchPage(page.pageNo + 1)}>
            <Text style={[styles.pagingBtn, page.pageNo >= page.pageTotalPages && styles.disabled]}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity disabled={page.pageNo >= page.pageTotalPages} onPress={() => searchPage(page.pageTotalPages)}>
            <Text style={[styles.pagingBtn, page.pageNo >= page.pageTotalPages && styles.disabled]}>»</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* === 등록/수정 모달 === */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editMode === 'insert' ? '신규 등록' : '수정'} - ${className}</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              {FORM_KEYS.map(k => {
                const isPk = (PK_KEYS as readonly string[]).includes(k);
                const disabled = editMode === 'update' && isPk;
                return (
                  <View key={k} style={styles.field}>
                    <Text style={styles.label}>{k}{isPk ? ' (PK)' : ''}</Text>
                    <TextInput
                      style={[styles.input, disabled && styles.inputDisabled]}
                      value={form[k] || ''}
                      editable={!disabled}
                      onChangeText={(v) => setForm(f => ({ ...f, [k]: v }))}
                    />
                  </View>
                );
              })}
            </ScrollView>
            <View style={styles.btnRow}>
              <TouchableOpacity style={[styles.btn, styles.btnSec]} onPress={() => setModalVisible(false)}>
                <Text style={styles.btnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnPri]} onPress={save}>
                <Text style={styles.btnTextW}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f7fa' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#ecf0f1' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#2c3e50' },
  btnAdd: { backgroundColor: '#27ae60', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 4 },
  btnAddText: { color: '#fff', fontWeight: 'bold' },

  searchBox: { maxHeight: 240, padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#ecf0f1' },
  field: { marginBottom: 8 },
  label: { fontSize: 12, color: '#7f8c8d', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#d0d7de', borderRadius: 4,
    paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, backgroundColor: '#fff' },
  inputDisabled: { backgroundColor: '#f1f3f5', color: '#95a5a6' },

  btnRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 4, alignItems: 'center' },
  btnPri: { backgroundColor: '#4f7df3' },
  btnSec: { backgroundColor: '#bdc3c7' },
  btnSm: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 3, marginLeft: 4 },
  btnWarn: { backgroundColor: '#f39c12' },
  btnDng: { backgroundColor: '#e74c3c' },
  btnText:  { color: '#2c3e50', fontWeight: 'bold' },
  btnTextW: { color: '#fff', fontWeight: 'bold' },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 6 },
  metaText: { fontSize: 12, color: '#7f8c8d' },

  listItem: { flexDirection: 'row', alignItems: 'center', padding: 12,
    borderBottomWidth: 1, borderColor: '#ecf0f1', backgroundColor: '#fff' },
  listTitle: { fontSize: 14, fontWeight: '600', color: '#2c3e50' },
  listSub:   { fontSize: 12, color: '#7f8c8d', marginTop: 2 },
  empty: { textAlign: 'center', color: '#95a5a6', padding: 24 },

  paging: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    padding: 8, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#ecf0f1' },
  pagingBtn: { fontSize: 18, paddingHorizontal: 14, paddingVertical: 6, color: '#4f7df3' },
  pagingNo:  { fontSize: 14, marginHorizontal: 12, color: '#2c3e50' },
  disabled: { color: '#bdc3c7' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  modal: { backgroundColor: '#fff', borderRadius: 8, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 14, color: '#2c3e50' },
});
`;
}

function mapTsType(javaType) {
    switch (javaType) {
        case 'String':              return 'string';
        case 'Integer':             return 'number';
        case 'Long':                return 'number';
        case 'Boolean':             return 'boolean';
        case 'LocalDateTime':       return 'string';
        case 'LocalDate':           return 'string';
        case 'java.math.BigDecimal':return 'number';
        default:                    return 'string';
    }
}
