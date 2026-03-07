# L1-L8 门控检查详解

## 概述

**web-to-tauri-migration-loop** 是一个渐进式迁移方法论，通过 8 个门控检查确保迁移质量。每个门控都是一个质量关卡，必须全部通过才能完成迁移。

## 门控检查清单

```txt
Loop Progress
- [ ] L1 Contract defined (request/response/error)
- [ ] L2 Rust command exists and registered
- [ ] L3 Frontend domain API wired to adapter
- [ ] L4 Tauri runtime uses invoke path only (no silent HTTP fallback)
- [ ] L5 Unit tests added (TS + Rust as needed)
- [ ] L6 Smoke e2e for critical path passed
- [ ] L7 Build gates passed (cargo check + web build)
- [ ] L8 Docs/changelog updated for real behavior
```

---

## L1: Contract defined (request/response/error)

### 📋 目标
定义清晰的 API 契约，确保前后端对接口的理解一致。

### ✅ 具体做法

#### 1. 定义请求格式
```typescript
// packages/web/src/api/types.ts
export interface SkillInfo {
  name: string
  path: string
  source: 'linked' | 'global' | 'marketplace'
  installedEnvironments?: string[]
  installedAt?: string
}

export interface LinkSkillRequest {
  path: string  // skill 文件夹路径
}

export interface LinkSkillResponse {
  linked: string[]  // 成功链接的 skill 名称列表
  count: number     // 链接数量
}
```

#### 2. 定义响应格式
```typescript
export interface ApiResponse<T = unknown> {
  success: boolean
  data: T
  error: string | null
}
```

#### 3. 定义错误类型
```rust
// src-tauri/src/error.rs
#[derive(Debug, Error)]
pub enum AppError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Skill not found: {0}")]
    SkillNotFound(String),

    #[error("Invalid path: {0}")]
    InvalidPath(String),

    #[error("Registry error: {0}")]
    Registry(String),
}
```

### 🎯 检查点
- [ ] 所有 API 方法都有明确的类型定义
- [ ] 请求和响应格式文档化
- [ ] 错误情况都被考虑和定义
- [ ] TypeScript 和 Rust 类型名称对齐（使用 camelCase）

### 📝 示例：link_skill API 契约

**请求**:
```typescript
{
  path: string  // skill 文件夹的绝对路径
}
```

**成功响应**:
```typescript
{
  success: true,
  data: {
    linked: ["skill-1", "skill-2"],
    count: 2
  },
  error: null
}
```

**错误响应**:
```typescript
{
  success: false,
  data: null,
  error: "Path does not exist: /invalid/path"
}
```

---

## L2: Rust command exists and registered

### 📋 目标
在 Rust 后端实现 Tauri Command，并正确注册到应用中。

### ✅ 具体做法

#### 1. 创建 Command 函数
```rust
// src-tauri/src/commands/skills.rs
#[tauri::command]
pub async fn link_skill(
    path: String,
    state: State<'_, AppState>
) -> Result<Vec<String>, String> {
    // 1. 验证路径
    let skill_path = Path::new(&path);
    if !skill_path.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    // 2. 创建符号链接
    let linked_dir = get_linked_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&linked_dir).map_err(|e| e.to_string())?;

    // 3. 注册到 Registry
    let mut registry = state.registry.lock().map_err(|e| e.to_string())?;
    registry.register(skill_info).map_err(|e| e.to_string())?;

    Ok(linked_names)
}
```

#### 2. 注册到 generate_handler!
```rust
// src-tauri/src/main.rs
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            j_skills_lib::commands::list_skills,
            j_skills_lib::commands::link_skill,      // ← 注册
            j_skills_lib::commands::unlink_skill,
            j_skills_lib::commands::get_config,
            // ... 其他 commands
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

#### 3. 添加状态管理
```rust
// src-tauri/src/commands/mod.rs
pub struct AppState {
    pub registry: Mutex<Registry>,
}

// 在 main.rs 中初始化
let registry = Registry::load().expect("Failed to load registry");
tauri::Builder::default()
    .manage(AppState {
        registry: Mutex::new(registry),
    })
```

### 🎯 检查点
- [ ] Command 函数使用 `#[tauri::command]` 宏
- [ ] 返回类型是 `Result<T, String>` 或实现了 Serialize
- [ ] 在 `generate_handler![]` 中注册
- [ ] State 正确注入和管理
- [ ] 错误处理完善，返回有意义的错误消息

### ⚠️ 常见错误
```rust
// ❌ 错误：未注册
#[tauri::command]
pub async fn my_command() -> Result<String, String> {
    Ok("Hello".to_string())
}
// 忘记在 generate_handler![] 中注册

// ✅ 正确：注册并使用
.invoke_handler(tauri::generate_handler![
    my_command,  // ← 必须注册
])
```

---

## L3: Frontend domain API wired to adapter

### 📋 目标
前端通过领域 API 层调用，而不是直接使用 invoke 或 fetch。

### ✅ 具体做法

#### 1. 创建 Domain API 层
```typescript
// packages/web/src/api/client.ts
export const skillsApi = {
  async list(): Promise<ApiResponse<SkillInfo[]>> {
    if (isTauriEnv()) {
      return safeTauriInvoke<SkillInfo[]>('list_skills')
    }
    return api.get('skills').json<ApiResponse<SkillInfo[]>>()
  },

  async link(skillPath: string): Promise<ApiResponse<LinkSkillResponse>> {
    if (isTauriEnv()) {
      const result = await safeTauriInvoke<string[]>('link_skill', { path: skillPath })
      if (result.success && result.data) {
        return {
          success: true,
          data: { linked: result.data, count: result.data.length },
          error: null
        }
      }
      return { success: false, data: null as any, error: result.error }
    }
    return api.post('skills/link', { json: { path: skillPath } })
      .json<ApiResponse<LinkSkillResponse>>()
  }
}
```

#### 2. 环境检测
```typescript
function isTauriEnv(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  const runtime = window as Window & {
    __TAURI__?: unknown
    __TAURI_INTERNALS__?: unknown
  }

  return Boolean(runtime.__TAURI__ || runtime.__TAURI_INTERNALS__)
}
```

#### 3. 在组件中使用
```typescript
// ❌ 错误：直接调用 invoke
import { invoke } from '@tauri-apps/api/core'

const skills = await invoke('list_skills')

// ✅ 正确：通过 Domain API
import { skillsApi } from '@/api/client'

const response = await skillsApi.list()
if (response.success) {
  setSkills(response.data)
}
```

### 🎯 检查点
- [ ] 所有 API 调用都通过 Domain API 层
- [ ] 没有组件直接调用 `invoke` 或 `fetch`
- [ ] 环境检测逻辑正确
- [ ] API 响应格式统一（ApiResponse）

### 📐 架构图
```
React 组件
    ↓
Domain API (skillsApi, configApi)
    ↓
Transport Adapter (Tauri invoke / HTTP fetch)
    ↓
Backend (Rust Commands / Express Server)
```

---

## L4: Tauri runtime uses invoke path only (no silent HTTP fallback)

### 📋 目标
在 Tauri 环境中，如果 invoke 失败，应该快速失败，而不是静默回退到 HTTP。

### ✅ 具体做法

#### 1. Fail-Fast 实现
```typescript
// packages/web/src/api/client.ts
async function safeTauriInvoke<T>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<ApiResponse<T>> {
  try {
    const result = await invoke<T>(cmd, args)
    return { success: true, data: result, error: null }
  } catch (err) {
    console.error(`Tauri command ${cmd} failed:`, err)
    // ❌ 不要这样做：
    // return api.get(...).json()

    // ✅ 正确：返回错误，不回退
    return { success: false, data: null as T, error: String(err) }
  }
}
```

#### 2. 环境检测时的 Fail-Fast
```typescript
export const skillsApi = {
  async list(): Promise<ApiResponse<SkillInfo[]>> {
    if (isTauriEnv()) {
      // 在 Tauri 环境中，只能用 invoke
      return safeTauriInvoke<SkillInfo[]>('list_skills')
      // ❌ 不能这样：
      // try {
      //   return await safeTauriInvoke(...)
      // } catch {
      //   return api.get(...)  // 静默回退到 HTTP
      // }
    }
    // 在 Web 环境中，使用 HTTP
    return api.get('skills').json<ApiResponse<SkillInfo[]>>()
  }
}
```

#### 3. 测试 Fail-Fast 行为
```typescript
// packages/web/src/api/__tests__/runtime-selection.test.ts
it('should NOT fallback to HTTP when in Tauri environment', async () => {
  // 模拟 Tauri 环境
  Object.defineProperty(window, '__TAURI__', {
    value: {},
    writable: true,
    configurable: true,
  })

  const invokeSpy = vi.fn().mockRejectedValue(new Error('Tauri error'))
  vi.mock('@tauri-apps/api/core', () => ({
    invoke: invokeSpy,
  }))

  const fetchSpy = vi.fn()
  vi.stubGlobal('fetch', fetchSpy)

  const { skillsApi } = await import('../client')
  const result = await skillsApi.list()

  // 验证：即使 Tauri 失败，也不应该回退到 HTTP
  expect(result.success).toBe(false)
  expect(fetchSpy).not.toHaveBeenCalled()  // ← 关键检查点
})
```

### 🎯 检查点
- [ ] Tauri 环境中 invoke 失败时，不会调用 HTTP API
- [ ] 错误消息清晰，便于调试
- [ ] 有测试验证 Fail-Fast 行为
- [ ] 没有静默回退逻辑

### ⚠️ 为什么禁止静默回退？

**问题场景**:
```
1. 用户在 Tauri 应用中点击按钮
2. invoke 调用失败（可能是 Command 未注册）
3. 代码静默回退到 HTTP API
4. HTTP API 调用成功
5. 用户看到功能正常
6. 但实际上 Tauri 后端根本没有工作！
```

**后果**:
- Tauri 后端问题被掩盖
- 发布到生产环境后才发现问题
- 用户无法享受原生性能优势
- 调试困难

**正确做法**:
```typescript
// ✅ Fail-Fast：立即报错
try {
  const result = await invoke('my_command')
  return result
} catch (error) {
  console.error('Tauri command failed:', error)
  throw error  // ← 抛出错误，让开发者知道
}
```

---

## L5: Unit tests added (TS + Rust as needed)

### 📋 目标
添加多层测试，包括 TypeScript 契约测试和 Rust 命令测试。

### ✅ 具体做法

#### 1. TypeScript 契约测试
```typescript
// packages/web/src/api/__tests__/runtime-selection.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('API Contract Tests', () => {
  beforeEach(() => {
    // 重置环境
    delete (window as any).__TAURI__
    delete (window as any).__TAURI_INTERNALS__
  })

  it('should return SkillInfo[] for list_skills', async () => {
    const mockSkills: SkillInfo[] = [
      {
        name: 'test-skill',
        path: '/tmp/test-skill',
        source: 'linked',
        installedEnvironments: ['claude-code']
      }
    ]

    Object.defineProperty(window, '__TAURI__', { value: {} })
    vi.mock('@tauri-apps/api/core', () => ({
      invoke: vi.fn().mockResolvedValue(mockSkills)
    }))

    const { skillsApi } = await import('../client')
    const result = await skillsApi.list()

    expect(result.success).toBe(true)
    expect(result.data).toEqual(mockSkills)
    expect(result.data[0]).toHaveProperty('name')
    expect(result.data[0]).toHaveProperty('path')
    expect(result.data[0]).toHaveProperty('source')
  })
})
```

#### 2. Rust 命令测试
```rust
// src-tauri/tests/skills_smoke.rs
use tempfile::TempDir;
use j_skills_lib::{Registry, SkillInfo, SkillSource};

#[test]
fn test_registry_register_skill() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let j_skills_dir = temp_dir.path().join(".j-skills");
    fs::create_dir_all(&j_skills_dir).expect("Failed to create .j-skills dir");

    std::env::set_var("J_SKILLS_DIR", j_skills_dir.to_str().unwrap());

    let mut registry = Registry::load().expect("Failed to load registry");

    let skill = SkillInfo {
        name: "test-skill".to_string(),
        path: "/tmp/test-skill".to_string(),
        source: SkillSource::Linked,
        installed_environments: None,
        installed_at: None,
    };

    registry.register(skill.clone()).expect("Failed to register skill");

    let loaded = registry.get_skill("test-skill").expect("Skill not found");
    assert_eq!(loaded.name, "test-skill");
    assert_eq!(loaded.source, SkillSource::Linked);

    std::env::remove_var("J_SKILLS_DIR");
}
```

#### 3. 运行测试
```bash
# TypeScript 测试
cd packages/web
pnpm test

# Rust 测试
cd src-tauri
cargo test
```

### 🎯 检查点
- [ ] TypeScript 契约测试覆盖所有 API 方法
- [ ] Rust 单元测试覆盖核心逻辑
- [ ] 测试可以独立运行（不依赖其他服务）
- [ ] 测试覆盖正常和错误情况

### 📊 测试金字塔
```
        E2E Tests (少量)
       /              \
    Integration Tests (适量)
   /                    \
Unit Tests (大量)
```

---

## L6: Smoke e2e for critical path passed

### 📋 目标
添加端到端烟雾测试，验证关键路径可以正常工作。

### ✅ 具体做法

#### 1. 配置 Playwright
```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'pnpm dev:web',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
```

#### 2. 编写烟雾测试
```typescript
// e2e/tauri-smoke.spec.ts
import { test, expect } from '@playwright/test'

test.describe('j-skills Web App Smoke Tests', () => {
  test('App should load and show title', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const title = await page.title()
    expect(title).toContain('j-skills')
  })

  test('should render main UI components', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const rootElement = await page.locator('#root')
    await expect(rootElement).toBeVisible()
  })

  test('should detect environment correctly', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const envCheck = await page.evaluate(() => {
      const hasTauri = typeof (window as any).__TAURI__ !== 'undefined'
      const hasTauriInternals = typeof (window as any).__TAURI_INTERNALS__ !== 'undefined'

      return {
        isTauri: hasTauri || hasTauriInternals,
        isWeb: !hasTauri && !hasTauriInternals
      }
    })

    expect(envCheck.isWeb).toBe(true)
  })
})
```

#### 3. 运行 E2E 测试
```bash
# 运行测试
pnpm test:e2e

# UI 模式调试
pnpm test:e2e:ui

# 查看报告
open playwright-report/index.html
```

### 🎯 检查点
- [ ] 应用能成功启动
- [ ] 主要 UI 元素可见
- [ ] 环境检测正确
- [ ] 页面导航正常
- [ ] 至少有 2-3 个关键路径测试

### 📝 烟雾测试策略
```
最小化关键路径：
1. 应用启动 → 验证窗口
2. 列出 skills → 读路径验证
3. 链接 skill → 写路径验证
```

---

## L7: Build gates passed (cargo check + web build)

### 📋 目标
确保所有代码可以成功编译和构建。

### ✅ 具体做法

#### 1. Rust 编译检查
```bash
# 检查 Rust 代码
cd src-tauri
cargo check

# 输出示例：
#     Checking j-skills v0.1.0
#     Finished dev [unoptimized + debuginfo] target(s) in 2.34s
```

#### 2. 前端构建检查
```bash
# 构建前端
pnpm build:web

# 输出示例：
# > tsc && vite build
# ✓ 1486 modules transformed.
# dist/index.html                   0.46 kB
# dist/assets/index-xxx.css        18.85 kB
# dist/assets/index-xxx.js        223.92 kB
# ✓ built in 1.28s
```

#### 3. 完整构建
```bash
# 构建 Tauri 应用
pnpm build:tauri

# 或构建特定平台
pnpm build:macos-arm
```

#### 4. CI 集成
```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Check Rust
        run: cargo check --manifest-path src-tauri/Cargo.toml

      - name: Build web
        run: pnpm build:web

      - name: Run tests
        run: pnpm test
```

### 🎯 检查点
- [ ] `cargo check` 无错误
- [ ] `pnpm build:web` 成功
- [ ] `pnpm build:tauri` 成功
- [ ] 生成的应用可以运行
- [ ] CI 流水线通过

### ⚠️ 常见构建问题

**问题 1: TypeScript 编译错误**
```bash
src/api/__tests__/test.ts(5,65): error TS2307: Cannot find module 'vitest'
```
**解决方案**: 将测试文件移出 src 目录，或配置 tsconfig.json 排除

**问题 2: Rust 目标缺失**
```bash
error[E0463]: can't find crate for `std`
= note: the `aarch64-apple-darwin` target may not be installed
```
**解决方案**: `rustup target add aarch64-apple-darwin`

**问题 3: Tauri 配置错误**
```bash
Error: "allowlist" is deprecated in Tauri v2
```
**解决方案**: 迁移到新的配置格式

---

## L8: Docs/changelog updated for real behavior

### 📋 目标
文档和变更日志反映实际行为，而不是计划或期望的行为。

### ✅ 具体做法

#### 1. 更新 README
```markdown
# j-skills

## Desktop App

j-skills is available as a native desktop application powered by Tauri.

### Installation

Download the latest release for your platform:
- [macOS (Apple Silicon)](https://github.com/wangjs-jacky/jacky-skills-package/releases)
- [macOS (Intel)](https://github.com/wangjs-jacky/jacky-skills-package/releases)

### Build from Source

\`\`\`bash
pnpm install
pnpm build:macos-arm
\`\`\`

### Features

- Native desktop experience
- System tray integration
- File watcher for automatic skill syncing
- Offline support
```

#### 2. 创建 CHANGELOG
```markdown
# Changelog

## [0.2.0] - 2026-03-07

### Added
- Tauri desktop application for macOS
- Native system tray integration
- File watcher for automatic skill syncing
- Desktop settings (auto-launch, theme, etc.)
- Rust backend for better performance

### Changed
- Migrated from Express backend to Rust (Tauri Commands)
- API calls now use Tauri IPC instead of HTTP

### Technical
- Added src-tauri directory with Rust implementation
- Created API adapter layer for Tauri/Web compatibility
- Implemented core services in Rust (Registry, Config, Linker)

## [0.1.0] - 2026-02-13

### Added
- Initial release
- CLI tool for skill management
- Web GUI with React
- Express backend server
```

#### 3. 更新 API 文档
```markdown
## API Reference

### Environment Detection

The API automatically detects the runtime environment:

\`\`\`typescript
import { skillsApi } from '@wangjs-jacky/j-skills-web'

// Works in both Tauri and Web environments
const response = await skillsApi.list()

if (response.success) {
  console.log('Skills:', response.data)
} else {
  console.error('Error:', response.error)
}
\`\`\`

### Available Methods

#### skillsApi.list()
- **Returns**: `Promise<ApiResponse<SkillInfo[]>>`
- **Tauri**: Calls `invoke('list_skills')`
- **Web**: Calls `GET /api/skills`

#### skillsApi.link(path: string)
- **Parameters**: `path` - absolute path to skill folder
- **Returns**: `Promise<ApiResponse<LinkSkillResponse>>`
- **Tauri**: Calls `invoke('link_skill', { path })`
- **Web**: Calls `POST /api/skills/link`
```

### 🎯 检查点
- [ ] README 描述了实际功能和安装步骤
- [ ] CHANGELOG 记录了所有重要变更
- [ ] API 文档反映了真实的调用方式
- [ ] 文档中没有"TODO"或"计划中"的内容
- [ ] 截图和示例代码是最新的

### 📝 文档更新清单
- [ ] README.md
- [ ] README_CN.md
- [ ] CHANGELOG.md
- [ ] API 文档
- [ ] 架构图
- [ ] 故障排除指南
- [ ] 开发指南

---

## 总结

### 门控检查关系图

```
L1: Contract defined
    ↓ (定义接口)
L2: Rust command exists
    ↓ (实现后端)
L3: Frontend adapter wired
    ↓ (连接前后端)
L4: Fail-fast guard
    ↓ (确保可靠性)
L5: Unit tests
    ↓ (验证逻辑)
L6: Smoke e2e
    ↓ (验证集成)
L7: Build gates
    ↓ (验证构建)
L8: Docs updated
    ↓ (文档化)
✅ Migration Complete!
```

### 为什么需要这些门控？

1. **L1-L3**: 确保架构正确，前后端对齐
2. **L4**: 防止隐藏问题，快速失败
3. **L5-L6**: 多层测试保障质量
4. **L7**: 确保可以发布
5. **L8**: 确保用户和开发者知道如何使用

### 迁移完成标准

所有门控检查（L1-L8）都通过后，才能认为迁移完成：
- ✅ 架构清晰（L1-L3）
- ✅ 行为正确（L4）
- ✅ 质量保障（L5-L6）
- ✅ 可以发布（L7）
- ✅ 文档完善（L8）
