# Monitor Page Design Spec

> 为 j-skills Tauri 桌面应用新增 Monitor 页面，集成 claude-monitor 项目的会话监控能力，可视化展示所有运行中的 Claude Code 会话。

## 概述

在 j-skills 桌面应用中新增 Monitor 页面，通过 HTTP + WebSocket 连接 `localhost:17530` 的 claude-monitor Daemon，实现 Claude Code 会话的实时可视化监控。页面包含监控开关（控制 hooks 注入/移除）、会话卡片网格、事件时间线三大功能区域。

## 架构

### 通信方式

- **前端 → Daemon**：HTTP 直连 `localhost:17530`（不走 Tauri 命令中转）
- **实时更新**：WebSocket 连接 `ws://localhost:17530/ws`
- **Hooks 管理**：Tauri 命令操作 `~/.claude/settings.json`（文件系统操作）
- **Daemon 管理**：Tauri 命令启动/停止 daemon 进程

### 新增 Tauri 命令

文件：`src-tauri/src/commands/monitor.rs`

| 命令 | 功能 | 返回 |
|------|------|------|
| `monitor_check_hooks` | 检查 monitor hooks 是否已注入 | `{ installed: boolean, hooksDirExists: boolean }` |
| `monitor_install_hooks` | 将 monitor hooks 注入到 settings.json | `{ success: boolean }` |
| `monitor_uninstall_hooks` | 从 settings.json 移除 monitor hooks | `{ success: boolean }` |
| `monitor_check_daemon` | 检测 daemon 是否在运行（ping :17530） | `{ running: boolean, pid?: number }` |
| `monitor_start_daemon` | 启动 daemon 进程（通过 `npx @wangjs-jacky/claude-monitor start` 或直接 spawn Node 子进程） | `{ success: boolean, pid?: number }` |
| `monitor_stop_daemon` | 停止 daemon 进程（通过 Unix Socket 发送 shutdown 信号或 SIGTERM） | `{ success: boolean }` |

### Hooks 标识策略

使用 `# monitor: claude-monitor` 标记与 skill hooks（`# skill: xxx`）区分。注入时在每个 command 末尾追加标记，移除时按标记过滤。

## 文件清单

### 新建文件

| 文件 | 说明 |
|------|------|
| `packages/web/src/pages/Monitor/index.tsx` | Monitor 主页面 |
| `packages/web/src/pages/Monitor/SessionCard.tsx` | 会话卡片组件（可展开） |
| `packages/web/src/pages/Monitor/StatusBadge.tsx` | 状态徽章组件 |
| `packages/web/src/pages/Monitor/EventTimeline.tsx` | 事件时间线组件 |
| `packages/web/src/api/monitor.ts` | Monitor API 客户端（HTTP + Tauri） |
| `packages/web/src/hooks/useMonitorWebSocket.ts` | WebSocket 连接 Hook |
| `src-tauri/src/commands/monitor.rs` | Rust Tauri 命令（hooks 管理 + daemon 管理） |

### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `packages/web/src/App.tsx` | 添加 `/monitor` 路由 |
| `packages/web/src/components/Sidebar/index.tsx` | 添加 Monitor 导航项 |
| `src-tauri/src/commands/mod.rs` | 注册 monitor 模块 |
| `src-tauri/src/main.rs` | 注册 monitor 命令 |

## UI 设计

### 页面状态机

页面有 3 个主要状态：

1. **未启用**（Hooks 未注入）：显示开关面板，引导用户启用监控
2. **已启用 - Daemon 离线**：显示开关面板 + "Daemon 未运行" 提示 + 启动按钮
3. **已启用 - Daemon 在线**：显示会话卡片网格 + 事件时间线

### 布局结构（方案 A：卡片网格 + 底部事件流）

```
┌─────────────────────────────────────────────────┐
│  📡 Monitor                                      │
│                                                   │
│  ┌─ 监控控制面板 ──────────────────────────────┐ │
│  │ [● ON/OFF] 启用 Claude 监控                 │ │
│  │ Daemon: ● Running  |  Hooks: ● Injected    │ │
│  │ [Start/Stop Daemon]  [Inject/Remove Hooks]  │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  3 active sessions                                │
│                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ project-a │  │ project-b │  │ project-c │      │
│  │ ⚡ thinking│  │ 💤 idle   │  │ ⚙️ bash   │      │
│  │ 5m 30s    │  │ 12m       │  │ 2m 15s    │      │
│  │ ▸ 展开    │  │ ▸ 展开    │  │ ▸ 展开    │      │
│  └──────────┘  └──────────┘  └──────────┘       │
│                                                   │
│  📋 Events [▾]                                    │
│  12:00:01 ▸ session started  (project-a)          │
│  12:00:15 ▸ tool:Read        (project-c)          │
│  12:00:23 ▸ waiting input    (project-b)          │
└─────────────────────────────────────────────────┘
```

### 组件树

```
MonitorPage/
├── MonitorHeader          — 标题 + 状态指示
│   ├── StatusToggle       — 启用/禁用监控开关
│   ├── DaemonIndicator    — Daemon 在线状态 + 启动/停止
│   └── HooksIndicator     — Hooks 注入状态
├── SessionGrid            — 会话卡片网格
│   └── SessionCard[]      — 单个会话卡片（可展开）
│       ├── StatusBadge    — 状态徽章（带颜色）
│       ├── SessionInfo    — 项目名、终端、运行时间
│       └── SessionDetail  — 展开后：提问/工具/子代理
└── EventTimeline          — 底部可折叠事件流
    └── EventItem[]        — 单个事件条目
```

### SessionCard 设计

**收起状态**：
```
┌─ project-a ─────────────────────┐
│ ⚡ thinking  │ iTerm │ 5m 30s   │
│ Tool: Read                      │
│ ▸ 点击展开                      │
└─────────────────────────────────┘
```

**展开状态**：
```
┌─ project-a ─────────────────────────────────┐
│ ⚡ thinking  │ iTerm │ 5m 30s               │
│ Tool: Read                                  │
│─────────────────────────────────────────────│
│ 📋 Recent Prompts                           │
│   • Implement JWT authentication...          │
│   • Fix memory leak in parser...             │
│                                              │
│ 🔧 Tool Calls (12 total)                    │
│   ✓ Read 120ms  ✓ Grep 450ms  ⏳ Bash...   │
│                                              │
│ 🤖 Subagents (1 active)                     │
│   • general-purpose: Analyzing auth module   │
│─────────────────────────────────────────────│
│ ▸ 收起                                      │
└──────────────────────────────────────────────┘
```

### 状态徽章配色

| 状态 | 颜色 | CSS 变量 | 效果 |
|------|------|----------|------|
| idle | dim gray | `--color-text-muted` | 静态 |
| thinking | amber | `--color-amber` | pulse 动画 |
| executing | cyan/blue | `--color-blue` | 静态 |
| multi_executing | cyan | `--color-blue` | pulse + glow |
| waiting_input | amber | `--color-amber` | pulse 动画 |
| tool_done | dim | `--color-text-muted` | 静态 |
| completed | green | `--color-primary` | 静态 |
| error | red | `--color-red` | pulse 动画 |

### 设计风格

遵循现有 Terminal Noir 主题：
- 深黑背景 `#0a0a0b`，抬升背景 `#131316`
- 霓虹绿主色 `#00ff88`
- 玻璃态卡片效果
- JetBrains Mono 字体用于技术信息
- 网格背景纹理
- fadeIn 入场动画

## 数据流

### 初始化流程

```
页面加载 → monitor_check_hooks (Tauri)
  ├─ 未安装 → 显示"未启用"状态
  └─ 已安装 → monitor_check_daemon (Tauri)
       ├─ 离线 → 显示"已启用，Daemon 离线"状态
       └─ 在线 → HTTP GET /api/sessions + WebSocket 连接
                  → 显示会话卡片 + 事件流
```

### WebSocket 消息处理

| 消息类型 | 处理 |
|----------|------|
| `init` | 初始化会话列表和事件列表 |
| `session_update` | 更新对应会话（增量合并） |
| `session_removed` | 移除会话卡片（fade out 动画） |
| `new_event` | 追加到事件时间线顶部 |

### Hooks 管理流程

```
用户点击开关 ON:
  → monitor_install_hooks (Tauri)
  → monitor_check_daemon (Tauri)
  → 如果 Daemon 离线 → monitor_start_daemon (Tauri)
  → 连接 WebSocket → 显示会话

用户点击开关 OFF:
  → 断开 WebSocket
  → monitor_stop_daemon (Tauri)
  → monitor_uninstall_hooks (Tauri)
  → 显示"未启用"状态
```

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| Daemon 未运行 | 显示友好提示 + "启动 Daemon" 按钮 |
| WebSocket 断开 | 自动重连（3s 间隔），顶部显示"重连中..." |
| Hooks 未安装 | 开关显示 OFF，卡片区域隐藏，显示引导 |
| 无活跃会话 | 空状态插画 + "暂无活跃会话" 提示 |
| settings.json 不存在 | `monitor_install_hooks` 自动创建 |
| hooks 脚本目录不存在 | `monitor_check_hooks` 同时检测目录 |

## 性能考虑

- WebSocket 消息节流：100ms 内合并多次更新
- 事件时间线最多显示 50 条（FIFO）
- 会话卡片展开时才加载详情数据
- 收起时释放详情数据

## 不做的事

- 不在 Monitor 页面编辑 hooks 配置（由 claude-monitor CLI 管理）
- 不重新实现 claude-monitor 的通知功能（已有 Swift 浮窗）
- 不在页面内展示上下文压缩事件的详细信息
- 不实现 kill session 功能（用户未选择）
