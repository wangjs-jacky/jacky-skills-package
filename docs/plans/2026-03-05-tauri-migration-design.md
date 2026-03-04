# j-skills Tauri 改造设计方案

> 将 j-skills 从 Web 应用改造为 Tauri 桌面应用的设计方案

**日期：** 2026-03-05
**方案选择：** 渐进式改造
**目标平台：** macOS

## 1. 项目概述

### 改造目标

- 将 Web GUI 打包为桌面应用
- 保留 CLI 工具的独立发布
- 用 Rust 重写后端逻辑
- 提供更好的用户体验

### 核心特性

1. **系统托盘支持** - 快速访问和状态显示
2. **应用设置/首选项** - 开机自启动、主题等
3. **文件监控自动同步** - 监控源文件夹变化，自动同步

## 2. 项目结构

### 目录结构

```
jacky-skills-package/
├── src/                      # CLI 核心库（保持不变）
│   ├── lib/
│   │   ├── registry.ts       # Skills 注册表逻辑
│   │   ├── environments.ts   # 环境配置
│   │   └── paths.ts          # 路径工具
│   └── index.ts              # CLI 入口
│
├── packages/
│   ├── web/                  # 前端（保持不变）
│   │   ├── src/
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── server/               # 后端（保留，但标记为 deprecated）
│       ├── src/
│       └── package.json
│
├── src-tauri/                # 🆕 Tauri 后端
│   ├── src/
│   │   ├── main.rs           # 主入口
│   │   ├── lib.rs            # 库入口
│   │   ├── commands/         # Tauri Commands
│   │   │   ├── mod.rs
│   │   │   ├── skills.rs     # Skills API
│   │   │   ├── environments.rs
│   │   │   └── config.rs
│   │   ├── services/         # 业务逻辑
│   │   │   ├── mod.rs
│   │   │   ├── registry.rs   # 注册表操作
│   │   │   ├── linker.rs     # 链接/取消链接
│   │   │   ├── installer.rs  # 安装/卸载
│   │   │   └── watcher.rs    # 文件监控
│   │   ├── models/           # 数据模型
│   │   │   ├── mod.rs
│   │   │   ├── skill.rs
│   │   │   └── config.rs
│   │   └── tray.rs           # 系统托盘
│   ├── Cargo.toml
│   ├── tauri.conf.json       # Tauri 配置
│   └── capabilities/         # 权限配置
│       └── default.json
│
├── package.json              # 根 package.json（更新脚本）
└── pnpm-workspace.yaml
```

### 关键变化

1. **新增 `src-tauri/`**：Rust 后端，实现所有核心逻辑
2. **保留 `src/`**：CLI 工具继续使用 TypeScript
3. **保留 `packages/web/`**：前端基本不变，只改 API 调用方式
4. **保留 `packages/server/`**：标记为 deprecated，后续可删除

## 3. 架构设计

### 整体架构

```
┌─────────────────────────────────────────┐
│          桌面应用 (Tauri)                │
├─────────────────────────────────────────┤
│  React 前端 (packages/web)              │
│  ├─ UI 组件                              │
│  ├─ 状态管理 (Zustand)                  │
│  └─ API 适配层                          │
├─────────────────────────────────────────┤
│  Tauri Runtime                          │
├─────────────────────────────────────────┤
│  Rust 后端 (src-tauri)                  │
│  ├─ Tauri Commands (API 层)             │
│  ├─ Services (业务逻辑)                 │
│  ├─ Models (数据模型)                   │
│  ├─ 系统托盘                            │
│  └─ 文件监控                            │
└─────────────────────────────────────────┘
           ↓ 操作文件系统
┌─────────────────────────────────────────┐
│  文件系统                                │
│  ├─ ~/.j-skills/linked/                 │
│  ├─ ~/.j-skills/registry.json           │
│  ├─ ~/.j-skills/config.json             │
│  └─ Agent 环境目录                       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  CLI 工具 (独立)                         │
│  ├─ src/index.ts (入口)                 │
│  └─ src/lib/ (核心库)                   │
└─────────────────────────────────────────┘
```

### 数据流

1. **前端 → Rust 后端（Tauri Commands）**
   - 使用 `@tauri-apps/api/core` 的 `invoke()` 函数
   - 替代原有的 HTTP API 调用

2. **Rust 后端 ↔ 文件系统**
   - 直接操作文件系统
   - 管理符号链接、注册表、配置

3. **CLI 工具保持独立**
   - 继续使用 TypeScript 实现
   - 直接操作文件系统
   - 与桌面应用共享数据格式

## 4. 核心功能实现

### 4.1 Skills 管理（Rust）

**主要功能：**
- `list_skills()` - 列出所有已链接的 skills
- `get_skill(name)` - 获取单个 skill 详情
- `link_skill(path)` - 链接 skill（支持批量）
- `unlink_skill(name)` - 取消链接
- `install_skill(name, env)` - 安装到指定环境
- `uninstall_skill(name, env)` - 从环境卸载

**关键实现要点：**
- 使用 Rust 标准库的 `std::fs` 操作文件
- 使用 `std::os::unix::fs::symlink` 创建符号链接
- 跨平台兼容：Windows 使用 junction 类型

### 4.2 文件监控自动同步

**实现思路：**
1. 使用 `notify` crate 监控源文件夹
2. 检测新增的 `SKILL.md` 文件
3. 自动链接新 skill
4. 通过 Tauri 事件发送前端通知

**关键依赖：**
```toml
notify = "6"
```

### 4.3 系统托盘

**功能：**
- 显示已链接 skills 数量
- 快速访问：打开主窗口、查看配置
- 状态指示：监控中/已停止

**实现要点：**
- 使用 `tauri::SystemTray` API
- 监听托盘菜单事件
- 动态更新托盘菜单项

### 4.4 应用设置

**存储位置：** `~/.j-skills/config.json`（与 CLI 共享）

**设置项：**
```typescript
interface AppConfig {
  // 现有配置
  defaultEnvironments: string[]
  autoConfirm: boolean
  installMethod: 'copy' | 'symlink'

  // 新增桌面应用配置
  autoLaunch: boolean           // 开机自启动
  sourceFolders: SourceFolder[] // 源文件夹列表
  enableWatcher: boolean        // 启用文件监控
  theme: 'light' | 'dark' | 'system'
}
```

## 5. 前端改造

### API 调用迁移

**创建 API 适配层：**
```typescript
// packages/web/src/api/tauri.ts
import { invoke } from '@tauri-apps/api/core'

export const api = {
  async listSkills(): Promise<SkillInfo[]> {
    return invoke('list_skills')
  },

  async linkSkill(path: string): Promise<{ linked: string[], count: number }> {
    return invoke('link_skill', { path })
  },

  async installSkill(name: string, env: string, global: boolean): Promise<void> {
    return invoke('install_skill', { name, env, global })
  },

  // ... 其他 API
}
```

**环境检测：**
```typescript
// packages/web/src/api/index.ts
import { isTauri } from '@tauri-apps/api/core'

const apiImpl = isTauri()
  ? await import('./tauri')   // Tauri 环境
  : await import('./http')    // Web 环境（开发时）

export const api = apiImpl.api
```

### 新增桌面功能组件

1. **托盘状态指示器** - 显示文件监控状态
2. **设置面板** - 管理桌面应用配置
3. **自动更新通知** - 显示新同步的 skills

## 6. 数据模型与错误处理

### Rust 数据模型

```rust
// Skill 信息
pub struct SkillInfo {
    pub name: String,
    pub path: String,
    pub source: SkillSource,
    pub installed_environments: Option<Vec<String>>,
    pub installed_at: Option<String>,
}

pub enum SkillSource {
    Linked,
    Global,
    Marketplace,
}

// 应用配置
pub struct AppConfig {
    pub default_environments: Vec<String>,
    pub auto_confirm: bool,
    pub install_method: InstallMethod,
    // 桌面应用配置
    pub auto_launch: bool,
    pub source_folders: Vec<SourceFolder>,
    pub enable_watcher: bool,
    pub theme: String,
}
```

### 错误处理策略

**Rust 层：**
- 使用 `thiserror` 定义自定义错误类型
- Tauri Commands 统一返回 `Result<T, String>`
- 错误信息清晰、用户友好

**前端层：**
- 创建 `AppError` 类封装错误
- 使用 `safeInvoke` 包装器统一处理
- 显示用户友好的错误提示

## 7. 开发与构建

### 开发脚本

```json
{
  "scripts": {
    "dev": "pnpm dev:tauri",
    "dev:tauri": "tauri dev",
    "dev:web": "pnpm --filter @wangjs-jacky/j-skills-web dev",

    "build": "pnpm build:all && pnpm build:tauri",
    "build:tauri": "tauri build",
    "build:all": "pnpm build:cli && pnpm build:web",

    "build:macos": "tauri build --target universal-apple-darwin",
    "build:macos-intel": "tauri build --target x86_64-apple-darwin",
    "build:macos-arm": "tauri build --target aarch64-apple-darwin"
  }
}
```

### Tauri 配置要点

- **开发路径：** `http://localhost:5173`
- **构建目录：** `../packages/web/dist`
- **权限：** 文件系统、路径、对话框、Shell
- **打包目标：** dmg、app
- **最低系统版本：** macOS 10.13

### Cargo 依赖

```toml
[dependencies]
tauri = { version = "2", features = ["system-tray"] }
tauri-plugin-dialog = "2"
tauri-plugin-shell = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
anyhow = "1"
thiserror = "1"
notify = "6"
dirs = "5"
```

## 8. 测试与质量保证

### 测试策略

1. **Rust 单元测试**
   - 使用 `#[test]` 和 `#[cfg(test)]`
   - 使用 `tempfile` crate 创建临时测试目录
   - 测试核心业务逻辑

2. **集成测试**
   - 测试完整工作流：链接 -> 安装 -> 卸载 -> 取消链接
   - 测试文件监控功能

3. **前端测试**
   - 使用 Vitest + Testing Library
   - Mock Tauri APIs
   - 测试关键用户流程

### 构建验证清单

- [ ] macOS Intel 构建成功
- [ ] macOS Apple Silicon 构建成功
- [ ] 应用签名正常
- [ ] 符号链接功能正常
- [ ] 文件监控功能正常
- [ ] 系统托盘显示正常
- [ ] 开机自启动功能正常
- [ ] 与 CLI 数据共享正常

## 9. 实施计划

### 阶段划分

| 阶段 | 任务 | 预计工作量 |
|------|------|-----------|
| **阶段 1** | 项目初始化、Tauri 集成 | 2-3 天 |
| **阶段 2** | 核心功能实现 | 5-7 天 |
| **阶段 3** | 桌面特性（托盘、监控、设置） | 3-4 天 |
| **阶段 4** | 前端迁移、UI 优化 | 3-4 天 |
| **阶段 5** | 测试、打包、发布 | 2-3 天 |

**总计：** 约 15-21 天

### 关键里程碑

1. **M1：基础架构** - Tauri 项目运行，能调用 Rust Commands
2. **M2：核心功能** - Skills 的链接/安装/卸载功能完成
3. **M3：桌面特性** - 托盘、监控、设置功能完成
4. **M4：发布准备** - macOS 应用打包完成，可分发

## 10. 风险与挑战

### 技术风险

1. **符号链接跨平台兼容性**
   - 缓解：使用条件编译，Windows 使用 junction

2. **文件监控性能**
   - 缓解：使用高效的 notify crate，限制监控范围

3. **Rust 学习曲线**
   - 缓解：参考 Tauri 官方文档和示例

### 项目风险

1. **CLI 与桌面应用数据一致性**
   - 缓解：共享配置文件格式，添加版本控制

2. **现有功能回归**
   - 缓解：完善测试覆盖，逐步迁移

## 11. 后续优化方向

1. **自动更新功能**
   - 集成 Tauri 自动更新 API

2. **更多平台支持**
   - Windows 和 Linux 版本

3. **性能优化**
   - 缓存机制
   - 异步操作优化

4. **UI/UX 改进**
   - 暗色主题
   - 键盘快捷键
   - 拖拽操作

---

**设计完成日期：** 2026-03-05
**下一步：** 创建详细实施计划
