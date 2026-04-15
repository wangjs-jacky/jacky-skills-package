# j-skills 工作区指南

## 项目概述

j-skills 是一个 Agent Skills 管理工具，采用 pnpm Monorepo 结构：

```
jacky-skills-package/
├── packages/
│   ├── cli/              → @wangjs-jacky/j-skills（npm 发布）
│   │   ├── src/          → CLI 源码（commands + lib）
│   │   ├── bin/          → CLI 入口脚本
│   │   ├── tests/        → CLI 单元测试
│   │   ├── tsup.config.ts
│   │   ├── vitest.config.ts
│   │   └── package.json
│   └── focus-terminal/   → jackywjs.focus-terminal（VSCode/Cursor 扩展，VSIX 发布）
│       ├── src/          → 扩展源码（URI Handler + PID 匹配）
│       ├── icon.png      → 扩展图标
│       └── package.json
├── web/                  → Tauri 前端（React，不发布）
│   ├── src/              → 页面、组件、API、hooks
│   └── package.json
├── src-tauri/            → Tauri 后端（Rust）
├── tests/
│   ├── integration/      → 跨包集成测试（Rust ↔ Node.js 一致性）
│   └── bdd/cases/        → BDD 用例定义
├── docs/reference/       → 开发文档
├── pencil/               → Pencil 设计稿（.pen 文件 + 导出图片）
├── skills/               → 内置 skill
└── scripts/              → 工具脚本
```

## 常用命令

```bash
# CLI 开发（watch 模式）
pnpm dev:cli

# CLI 构建
pnpm build:cli

# 扩展构建 & 打包
pnpm build:extension
pnpm package:extension

# 运行 CLI 测试
pnpm --filter @wangjs-jacky/j-skills test

# 运行根级集成测试
pnpm test:integration

# 运行所有测试
pnpm test

# 类型检查
pnpm typecheck
```

## 关键文件

| 功能 | 路径 |
|-----|------|
| CLI 入口 | `packages/cli/src/index.ts` |
| CLI 命令 | `packages/cli/src/commands/*.ts` |
| CLI 核心库 | `packages/cli/src/lib/*.ts` |
| 环境定义 | `packages/cli/src/lib/environments.ts`（35+ IDE） |
| Hooks 合并 | `packages/cli/src/lib/hooks.ts` |
| 前端页面 | `web/src/pages/` |
| 前端 API | `web/src/api/` |
| Tauri 配置 | `src-tauri/tauri.conf.json` |
| Rust 命令 | `src-tauri/src/commands/*.rs` |
| 终端聚焦扩展 | `packages/focus-terminal/src/extension.ts` |

## 文档导航

| 文档 | 路径 |
|------|------|
| 测试策略 | `docs/reference/testing.md` |
| BDD 用例库 | `docs/reference/test-cases.md` |
| Mock 方案 | `docs/reference/test-mock-guide.md` |
| 开发调试构建 | `docs/reference/dev-debug-build.md` |
| Hooks 合并机制 | `docs/reference/hooks-merge.md` |
| Changelog 规范 | `docs/reference/changelog-guide.md` |
| Troubleshooting | `docs/reference/troubleshooting.md` |

## 测试

**优先级：单元测试 > 集成测试 > BDD 驱动**

- CLI 单元测试：`packages/cli/tests/`（vitest）
- 根级集成测试：`tests/integration/`（Rust ↔ Node.js 环境定义一致性校验）
- BDD 用例定义：`tests/bdd/cases/`

## 发布

| 包 | 标签格式 | 产物 |
|----|----------|------|
| CLI (npm) | `v*` | `@wangjs-jacky/j-skills` |
| 扩展 (VSIX) | `focus-terminal-v*` | `focus-terminal-*.vsix` |

```bash
# CLI 发布
cd packages/cli && npm publish

# 扩展发布（推 tag 触发 CI）
git tag focus-terminal-v0.1.0 && git push origin focus-terminal-v0.1.0
```

## Monitor 集成架构

### 概述

j-skills 桌面端集成了 [claude-monitor](https://github.com/wangjs-jacky/jacky-claude-monitor)（`@wangjs-jacky/claude-monitor`），用于监控 Claude Code 会话状态。

### 架构方案：Tauri Sidecar

**方案决策**：采用 Sidecar 方式集成，将 claude-monitor daemon 编译为独立可执行文件，随 Tauri App 打包分发。

```
Tauri App
├── Rust 层（monitor.rs）
│   ├── hooks 注入/卸载  → 操控 ~/.claude/settings.json
│   ├── 配置管理         → ~/.config/j-skills/monitor-config.json
│   └── 进程管理         → 启动/停止/检测 sidecar 进程
├── Sidecar（claude-monitor-daemon）
│   ├── HTTP API         → localhost:17530/api/*（会话管理、事件查询）
│   ├── WebSocket        → ws://localhost:17530/ws（实时推送）
│   └── 会话状态管理      → 内存存储，僵尸检测
└── 前端（Monitor 页面）
    ├── invoke()         → 调用 Rust 命令（hooks 管理）
    ├── HTTP (ky)        → 直接请求 daemon 获取会话数据
    └── WebSocket        → 实时接收状态更新
```

### 当前状态与迁移路径

**当前**：Rust 层通过 `npx @wangjs-jacky/claude-monitor start/stop` 管理独立 Node.js 进程。

**迁移目标**：

1. 使用 Node.js SEA（Single Executable Application）将 daemon 编译为独立二进制
2. 配置 Tauri sidecar 打包：
   ```json
   // src-tauri/tauri.conf.json
   { "bundle": { "externalBin": ["binaries/claude-monitor-daemon"] } }
   ```
3. Rust 层改用 Tauri sidecar API 管理进程生命周期（替代 `npx` + `curl`）
4. npm 包 `@wangjs-jacky/claude-monitor` 继续维护，供 CLI-only 用户使用

### 各层职责边界

| 层 | 职责 | 技术 |
|----|------|------|
| **Rust** | hooks 注入/卸载、配置读写、sidecar 进程管理 | Tauri Command + serde_json |
| **Sidecar (daemon)** | HTTP/WebSocket 服务、会话状态管理、僵尸检测 | Node.js → SEA 编译为二进制 |
| **Shell hooks** | 捕获 Claude Code 生命周期事件，上报给 daemon | bash + curl (UDS Socket) |
| **Swift 悬浮窗** | macOS 原生桌面通知 | Swift/Cocoa |
| **前端 Monitor 页面** | UI 展示、用户操作入口 | React + ky + WebSocket |

### 不变的组件

以下组件与语言无关，Sidecar 迁移不影响：
- `~/.claude-monitor/hooks/*.sh`（13 个 shell 脚本）
- `~/.claude-monitor/claude-float-window`（Swift 编译的二进制）
- daemon 的 HTTP/WebSocket API 接口保持兼容

### 相关文件

| 功能 | 路径 |
|------|------|
| Rust monitor 命令 | `src-tauri/src/commands/monitor.rs` |
| 前端 Monitor API | `web/src/api/monitor.ts` |
| Monitor 页面 | `web/src/pages/Monitor/index.tsx` |
| WebSocket hook | `web/src/hooks/useMonitorWebSocket.ts` |
| claude-monitor 源码 | `jacky-github/jacky-claude-monitor/` |
| monitoring skill | `jacky-github/jacky-skills/plugins/monitoring/claude-monitor/` |
| 终端聚焦扩展 | `packages/focus-terminal/`（VSIX，配合 activate_terminal 使用） |

## Pencil 设计稿

UI 改版前使用 [Pencil](https://pencil.design/) 工具在 `pencil/` 目录下制作设计稿，确认布局和视觉方案后再编码实现。

### 目录结构

```
pencil/
├── *.pen           → Pencil 设计源文件
└── export/         → 导出的 PNG 图片
```

### 设计规范

- **工具**：通过 MCP `pencil` 工具操作 `.pen` 文件，禁止用 Read/Grep 读取
- **配色**：Terminal Noir 深色主题（`$bg: #0a0a0b`、`$accent-green: #00ff88`、`$accent-blue: #00d4ff`、`$accent-amber: #ffb800`）
- **字体**：JetBrains Mono（等宽/技术元素）、DM Sans（正文）
- **布局原则**：全宽行式布局优先，避免多列卡片导致文字换行/截断

### 现有设计稿

| 设计稿 | 文件 | 说明 |
|--------|------|------|
| Monitor 面板 | `pencil/monitor.pen` | 会话监控页重设计：2列卡片→全宽行式布局 |

## 外部文档

- [Tauri 官方文档](https://tauri.app/)
- [Tauri Sidecar 文档](https://tauri.app/v1/guides/building/sidecar/)
- [Node.js SEA 文档](https://nodejs.org/api/single-executable-applications.html)
- [项目 README](./README.md)
