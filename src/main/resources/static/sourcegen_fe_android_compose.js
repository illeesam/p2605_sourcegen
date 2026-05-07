/* ===== Source Generator : Frontend (Android — Kotlin + Jetpack Compose) =====
 *  - build.gradle.kts (project)
 *  - app/build.gradle.kts
 *  - app/src/main/AndroidManifest.xml
 *  - app/src/main/java/<pkgPath>/MainActivity.kt              ← Compose 진입점
 *  - app/src/main/java/<pkgPath>/data/<Class>.kt              ← 데이터 클래스
 *  - app/src/main/java/<pkgPath>/data/<Class>ApiService.kt    ← Retrofit
 *  - app/src/main/java/<pkgPath>/ui/<Class>Screen.kt          ← Compose CRUD 화면
 *
 * 의존: gnAuditFields() (sourcegen.js)
 * 빌드 필수: ./gradlew assembleDebug
 */

// ----- 헬퍼 -----
function fmKtType(javaType) {
    switch (javaType) {
        case 'String':              return 'String';
        case 'Integer':             return 'Int';
        case 'Long':                return 'Long';
        case 'Boolean':             return 'Boolean';
        case 'LocalDateTime':       return 'String';   // Retrofit/Gson 기본은 ISO 문자열
        case 'LocalDate':           return 'String';
        case 'java.math.BigDecimal':return 'Double';
        default:                    return 'String';
    }
}

// ----- build.gradle.kts (project root) -----
function gnAdProjectGradleSource() {
    return `// Project-level build.gradle.kts
plugins {
    id("com.android.application")    version "8.7.0" apply false
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.0.21" apply false
}
`;
}

// ----- settings.gradle.kts -----
function gnAdSettingsGradleSource(endpoint) {
    return `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "${endpoint}-android"
include(":app")
`;
}

// ----- app/build.gradle.kts -----
function gnAdAppGradleSource(pkg, className) {
    return `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace   = "${pkg}"
    compileSdk  = 34

    defaultConfig {
        applicationId = "${pkg}"
        minSdk        = 24
        targetSdk     = 34
        versionCode   = 1
        versionName   = "1.0"
    }

    buildFeatures { compose = true }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    // === Compose BOM ===
    implementation(platform("androidx.compose:compose-bom:2024.10.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.activity:activity-compose:1.9.2")

    // === Retrofit + OkHttp ===
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-gson:2.11.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

    // === Coroutines ===
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
}
`;
}

// ----- AndroidManifest.xml -----
function gnAdManifestSource(pkg, className) {
    return `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- 인터넷 권한 -->
    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:label="${className}"
        android:usesCleartextTraffic="true"
        android:theme="@android:style/Theme.Material.Light.NoActionBar">

        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>
`;
}

// ----- MainActivity.kt -----
function gnAdMainActivitySource(pkg, className) {
    return `package ${pkg}

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import ${pkg}.ui.${className}Screen

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize(),
                        color = MaterialTheme.colorScheme.background) {
                    ${className}Screen()
                }
            }
        }
    }
}
`;
}

// ----- data/<Class>.kt (data class) -----
function gnAdDataClassSource(pkg, className, dataCols, hasAudit) {
    const allItemCols = hasAudit ? [...dataCols, ...gnAuditFields()] : dataCols;
    const fields = allItemCols.map((c, i) => {
        const t = fmKtType(c.javaType);
        const comma = i < allItemCols.length - 1 ? ',' : '';
        return `    val ${c.javaName}: ${t}? = null${comma}`;
    }).join('\n');

    return `package ${pkg}.data

/** ${className} 데이터 클래스 — Retrofit/Gson 직렬화 */
data class ${className}(
${fields}
)

/** 페이지 응답 DTO */
data class ${className}PageResponse(
    val pageList: List<${className}> = emptyList(),
    val pageTotalCount: Long = 0,
    val pageNo: Int = 1,
    val pageSize: Int = 10,
    val pageTotalPages: Int = 0
)
`;
}

// ----- data/<Class>ApiService.kt (Retrofit interface + factory) -----
function gnAdApiServiceSource(pkg, endpoint, className, pkCols) {
    const pkParams = pkCols.map(c => `@Path("${c.javaName}") ${c.javaName}: String`).join(', ');
    const pkPath = pkCols.map(c => `{${c.javaName}}`).join('/');

    return `package ${pkg}.data

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*

/** ${className} REST API */
interface ${className}ApiService {

    @GET("${endpoint}/page-list")
    suspend fun selectPageList(@QueryMap params: Map<String, String>): ${className}PageResponse

    @GET("${endpoint}/list")
    suspend fun selectList(@QueryMap params: Map<String, String>): List<${className}>

    @GET("${endpoint}/${pkPath}")
    suspend fun selectOne(${pkParams}): ${className}

    @POST("${endpoint}")
    suspend fun create(@Body req: ${className}): ${className}

    @PUT("${endpoint}/${pkPath}")
    suspend fun update(${pkParams}, @Body req: ${className}): ${className}

    @DELETE("${endpoint}/${pkPath}")
    suspend fun remove(${pkParams})

    @POST("${endpoint}/save-one")
    suspend fun saveOne(@Body req: ${className}): ${className}?

    @POST("${endpoint}/save-list")
    suspend fun saveList(@Body rows: List<${className}>)
}

/** Retrofit 빌더 — 시뮬레이터/에뮬레이터에서는 10.0.2.2 (호스트 PC) 사용 */
object ${className}ApiFactory {
    // Android 에뮬레이터: http://10.0.2.2:8080  /  실디바이스: PC LAN IP
    private const val BASE_URL = "http://10.0.2.2:8080/api/"

    val service: ${className}ApiService by lazy {
        val logger = HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC }
        val client = OkHttpClient.Builder().addInterceptor(logger).build()
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(${className}ApiService::class.java)
    }
}
`;
}

// ----- ui/<Class>Screen.kt (Compose CRUD) -----
function gnAdScreenSource(pkg, endpoint, className, dataCols, pkCols, nonPkCols, hasAudit) {
    const allItemCols = hasAudit ? [...dataCols, ...gnAuditFields()] : dataCols;
    const stringCols = dataCols.filter(c => c.javaType === 'String' && !c.isAudit);
    const formCols = [...pkCols, ...nonPkCols.filter(c => !c.isAudit)];

    const titleField = (allItemCols[1] || allItemCols[0])?.javaName || pkCols[0]?.javaName;
    const subField   = (allItemCols[0])?.javaName || pkCols[0]?.javaName;

    const searchInputs = stringCols.map(c =>
        `                OutlinedTextField(\n` +
        `                    value = search.value["${c.javaName}"] ?: "",\n` +
        `                    onValueChange = { search.value = search.value + ("${c.javaName}" to it) },\n` +
        `                    label = { Text("${c.name}") },\n` +
        `                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)\n` +
        `                )`
    ).join('\n');

    const formInputs = formCols.map(c => {
        const isPk = c.isPk ? 'true' : 'false';
        return `                OutlinedTextField(\n` +
               `                    value = form.value["${c.javaName}"] ?: "",\n` +
               `                    onValueChange = { form.value = form.value + ("${c.javaName}" to it) },\n` +
               `                    label = { Text("${c.name}") },\n` +
               `                    enabled = !(editMode == "update" && ${isPk}),\n` +
               `                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)\n` +
               `                )`;
    }).join('\n');

    const pkArgsForRemove = pkCols.map(c => `r.${c.javaName} ?: ""`).join(', ');
    const pkArgsForUpdate = pkCols.map(c => `form.value["${c.javaName}"] ?: ""`).join(', ');

    const formToReq = formCols.map(c => `        ${c.javaName} = form.value["${c.javaName}"]`).join(',\n');

    return `package ${pkg}.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import ${pkg}.data.${className}
import ${pkg}.data.${className}ApiFactory

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ${className}Screen() {
    val scope = rememberCoroutineScope()
    val api = ${className}ApiFactory.service

    val list  = remember { mutableStateOf<List<${className}>>(emptyList()) }
    val search = remember { mutableStateOf<Map<String, String>>(mapOf()) }
    val pageNo = remember { mutableStateOf(1) }
    val pageSize = remember { mutableStateOf(10) }
    val pageTotalCount = remember { mutableStateOf(0L) }
    val pageTotalPages = remember { mutableStateOf(0) }
    val loading = remember { mutableStateOf(false) }
    val error = remember { mutableStateOf<String?>(null) }

    val showDialog = remember { mutableStateOf(false) }
    val editMode = remember { mutableStateOf("insert") }   // "insert" | "update"
    val form = remember { mutableStateOf<Map<String, String>>(mapOf()) }

    fun searchPage(p: Int) {
        scope.launch {
            loading.value = true
            try {
                val params = (search.value + mapOf("pageNo" to p.toString(), "pageSize" to pageSize.value.toString()))
                    .filterValues { it.isNotEmpty() }
                val res = api.selectPageList(params)
                list.value           = res.pageList
                pageNo.value         = res.pageNo
                pageSize.value       = res.pageSize
                pageTotalCount.value = res.pageTotalCount
                pageTotalPages.value = res.pageTotalPages
            } catch (e: Exception) {
                error.value = e.message
            } finally {
                loading.value = false
            }
        }
    }

    LaunchedEffect(Unit) { searchPage(1) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("${className}") },
                actions = {
                    IconButton(onClick = { searchPage(pageNo.value) }) {
                        Text("⟳")
                    }
                    IconButton(onClick = {
                        form.value = mapOf()
                        editMode.value = "insert"
                        showDialog.value = true
                    }) { Text("+") }
                }
            )
        }
    ) { inner ->
        Column(modifier = Modifier.padding(inner).fillMaxSize()) {

            // === 검색 영역 ===
            Card(modifier = Modifier.padding(8.dp).fillMaxWidth()) {
                Column(modifier = Modifier.padding(12.dp)) {
${searchInputs}
                    Row {
                        Button(onClick = { searchPage(1) }, modifier = Modifier.weight(1f)) {
                            Text("검색")
                        }
                        Spacer(Modifier.width(8.dp))
                        OutlinedButton(
                            onClick = {
                                search.value = mapOf()
                                searchPage(1)
                            },
                            modifier = Modifier.weight(1f)
                        ) { Text("초기화") }
                    }
                }
            }

            // === 메타 ===
            Row(
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp).fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("총 \${pageTotalCount.value}건 / \${pageTotalPages.value}페이지", style = MaterialTheme.typography.bodySmall)
                Spacer(Modifier.weight(1f))
                if (loading.value) CircularProgressIndicator(strokeWidth = 2.dp, modifier = Modifier.size(16.dp))
            }
            error.value?.let { msg ->
                Text("오류: \$msg", color = MaterialTheme.colorScheme.error,
                     modifier = Modifier.padding(horizontal = 12.dp))
            }

            // === 리스트 ===
            LazyColumn(modifier = Modifier.weight(1f)) {
                if (list.value.isEmpty() && !loading.value) {
                    item {
                        Text("데이터 없음", modifier = Modifier.fillMaxWidth().padding(24.dp),
                             textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                    }
                }
                items(list.value) { r ->
                    ListItem(
                        headlineContent = { Text(r.${titleField} ?: "", fontWeight = FontWeight.SemiBold) },
                        supportingContent = { Text(r.${subField} ?: "", style = MaterialTheme.typography.bodySmall) },
                        trailingContent = {
                            Row {
                                TextButton(onClick = {
                                    form.value = mapOf<String, String>(
${formCols.map(c => `                                        "${c.javaName}" to (r.${c.javaName}?.toString() ?: "")`).join(',\n')}
                                    )
                                    editMode.value = "update"
                                    showDialog.value = true
                                }) { Text("수정") }
                                TextButton(onClick = {
                                    scope.launch {
                                        try {
                                            api.remove(${pkArgsForRemove})
                                            searchPage(pageNo.value)
                                        } catch (e: Exception) { error.value = e.message }
                                    }
                                }) { Text("삭제") }
                            }
                        }
                    )
                    HorizontalDivider()
                }
            }

            // === 페이징 ===
            if (pageTotalPages.value > 0) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(8.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = { searchPage(1) }, enabled = pageNo.value > 1) { Text("«") }
                    IconButton(onClick = { searchPage(pageNo.value - 1) }, enabled = pageNo.value > 1) { Text("‹") }
                    Text("\${pageNo.value} / \${pageTotalPages.value}", modifier = Modifier.padding(horizontal = 12.dp))
                    IconButton(onClick = { searchPage(pageNo.value + 1) }, enabled = pageNo.value < pageTotalPages.value) { Text("›") }
                    IconButton(onClick = { searchPage(pageTotalPages.value) }, enabled = pageNo.value < pageTotalPages.value) { Text("»") }
                }
            }
        }

        // === 등록/수정 다이얼로그 ===
        if (showDialog.value) {
            AlertDialog(
                onDismissRequest = { showDialog.value = false },
                title = { Text(if (editMode.value == "insert") "신규 등록" else "수정") },
                text = {
                    Column {
${formInputs}
                    }
                },
                confirmButton = {
                    TextButton(onClick = {
                        scope.launch {
                            try {
                                val req = ${className}(
${formToReq}
                                )
                                if (editMode.value == "insert") {
                                    api.create(req)
                                } else {
                                    api.update(${pkArgsForUpdate}, req)
                                }
                                showDialog.value = false
                                searchPage(pageNo.value)
                            } catch (e: Exception) {
                                error.value = e.message
                            }
                        }
                    }) { Text("저장") }
                },
                dismissButton = {
                    TextButton(onClick = { showDialog.value = false }) { Text("취소") }
                }
            )
        }
    }
}
`;
}
