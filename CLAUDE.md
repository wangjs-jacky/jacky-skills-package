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

## 交付与验收规范

> 每次完成功能特性开发或 BUG 修复类工作时，除代码改动外，**必须在回复末尾补充「验收方式」**，明确告知用户如何验证该工作已正确生效。

### 验收方式应包含的内容

1. **验证步骤**：按顺序列出操作步骤（如启动命令、点击路径、输入示例）
2. **预期结果**：每个步骤对应的正确表现是什么
3. **边界检查**：如有必要，说明需验证的边界场景或回归点
4. **已知限制**：若存在暂时无法覆盖的场景，需主动说明

### 示例（功能特性）

```
### 验收方式
1. 启动 `pnpm tauri dev`
2. 在 Monitor 页面观察 MSG 栏
3. 在另一终端启动 `claude` 并让其执行 `Bash: ls -la`
4. 预期：MSG 栏实时显示 `$ ls -la` 而非仅 "Bash"
```

### 示例（BUG 修复）

```
### 验收方式
1. 复现原问题：删除 skills 目录中的某个 skill，再打开 Skills 页面
2. 预期：页面不再报错，而是自动清理失效项并弹出 toast 提示
3. 边界：确认正常 skill 的加载不受影响
```

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

#### 当前方案：npx 管理

```
Rust (monitor.rs)
  └─ Command::new("npx").args(["@wangjs-jacky/claude-monitor", "start"])
       └─ npx 从 npm 缓存启动 node daemon.js
```

**已知问题**：

| 问题 | 原因 |
|------|------|
| daemon 版本与源码不一致 | npx 缓存旧版本，重启后仍运行旧代码 |
| `/api/discover` 返回 404 | 旧缓存版本缺少新端点 |
| 首次启动慢 | 需要下载 npm 包 |
| 依赖用户环境 | 要求 node + npm 已安装 |

#### 目标方案：Node.js SEA + Tauri Sidecar

```
jacky-claude-monitor
  └─ npm run build:sea → claude-monitor-daemon (单文件二进制，内嵌 Node.js 运行时)
       └─ 复制到 src-tauri/binaries/claude-monitor-daemon-aarch64-apple-darwin
            └─ Tauri 打包时自动包含在 .app 内

Rust (monitor.rs)
  └─ tauri::api::process::Command::new_sidecar("claude-monitor-daemon").spawn()
```

**迁移步骤**：

1. 在 `jacky-claude-monitor` 添加 `build:sea` 脚本（Node.js SEA 编译）
2. 配置 Tauri sidecar：`tauri.conf.json` → `"externalBin": ["binaries/claude-monitor-daemon"]`
3. Rust 层改用 Tauri sidecar API 管理进程（替代 `npx` + `curl`）
4. npm 包 `@wangjs-jacky/claude-monitor` 继续维护，供 CLI-only 用户使用

**方案对比**：

| 维度 | 当前（npx） | 目标（SEA Sidecar） |
|------|------------|-------------------|
| 版本管理 | npx 缓存，可能过期 | 随 App 打包，始终一致 |
| 启动速度 | 首次需下载，~3-5s | 本地二进制，~100ms |
| 环境依赖 | node + npm | 无（Node.js 内嵌） |
| 分发方式 | npm registry | DMG/App 内置 |
| 调试流程 | 修改 → build → kill → npx start | 修改 → build:sea → 复制 → 重启 App |
| CLI 用户 | npx 直接用 | npm 包独立维护 |

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

### 调试与开发流程

Monitor 功能跨三个代码层（daemon / Rust / 前端），每层的热更新机制不同：

| 修改位置 | 是否需要重新编译 | 热更新方式 |
|----------|-----------------|-----------|
| **前端** `web/src/` | 否（`pnpm tauri dev` 时 Vite HMR 自动生效） | 保存即生效，刷新页面或切换路由即可 |
| **Rust** `src-tauri/src/` | **是**（Cargo 重新编译） | `pnpm tauri dev` 会自动检测 `.rs` 改动并重编译 |
| **Daemon** `jacky-claude-monitor/` | **是**（需构建 + 重启 + npm 发布） | 见下方流程 |

#### Daemon 开发流程

修改 `jacky-claude-monitor` 后必须完成以下步骤才能生效：

```bash
cd ~/jacky-github/jacky-claude-monitor

# 1. 构建
npm run build

# 2. 停掉旧 daemon（PID 可在 Monitor 页面查看）
kill $(lsof -t -i :17530)

# 3. 用本地构建启动（开发调试用）
node dist/daemon.js

# 4. 验证
curl --noproxy '*' -s http://127.0.0.1:17530/api/health
```

**正式发布时**还需要 npm publish + 重启 daemon 使 npx 缓存更新：

```bash
# 升级版本号（package.json）
# npm publish --access public
# 重启 daemon（从 npx 拉取新版本）
kill $(lsof -t -i :17530)
npx @wangjs-jacky/claude-monitor start
```

#### 常见陷阱

| 问题 | 原因 | 解决 |
|------|------|------|
| `/api/discover` 返回 404 | daemon 是从旧版 npx 缓存启动的，新端点未包含在旧版中 | 重启 daemon，确保从最新版本启动 |
| 前端改动不生效 | 未使用 `pnpm tauri dev`，或用浏览器直接访问 localhost | 必须在 Tauri App 内测试，浏览器无 `invoke` |
| Daemon 启动后端口仍不可达 | 旧进程未完全退出，端口被占用 | `kill $(lsof -t -i :17530)` 等待 2 秒再启动 |
| 会话假关闭后不重新出现 | daemon 未升级到 ≥0.1.4（缺少 `ensureSessionExists` 自动注册） | 更新 daemon 到最新版 |

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
