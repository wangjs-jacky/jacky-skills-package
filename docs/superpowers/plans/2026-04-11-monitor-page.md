# Monitor Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 j-skills Tauri 桌面应用中新增 Monitor 页面，集成 claude-monitor 的会话监控能力。

**Architecture:** 前端通过 HTTP + WebSocket 直连 `localhost:17530` 的 claude-monitor Daemon 获取会话数据；通过 Tauri 命令管理 hooks 注入/移除和 daemon 启停。页面采用卡片网格 + 底部事件流布局。

**Tech Stack:** React 18 + TypeScript + Zustand + Tailwind CSS (Terminal Noir) + Tauri v2 (Rust) + WebSocket

**Spec:** `docs/superpowers/specs/2026-04-11-monitor-page-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `packages/web/src/api/monitor.ts` | Monitor API 客户端（HTTP to Daemon + Tauri 命令） |
| Create | `packages/web/src/hooks/useMonitorWebSocket.ts` | WebSocket 连接管理 |
| Create | `packages/web/src/pages/Monitor/StatusBadge.tsx` | 状态徽章组件 |
| Create | `packages/web/src/pages/Monitor/SessionCard.tsx` | 会话卡片（可展开） |
| Create | `packages/web/src/pages/Monitor/EventTimeline.tsx` | 事件时间线 |
| Create | `packages/web/src/pages/Monitor/index.tsx` | Monitor 主页面 |
| Create | `src-tauri/src/commands/monitor.rs` | Rust Tauri 命令 |
| Modify | `src-tauri/src/commands/mod.rs` | 注册 monitor 模块 |
| Modify | `src-tauri/src/lib.rs` | 导出 monitor 命令 |
| Modify | `src-tauri/src/main.rs` | 注册 monitor 命令到 invoke_handler |
| Modify | `packages/web/src/App.tsx` | 添加 `/monitor` 路由 |
| Modify | `packages/web/src/components/Sidebar/index.tsx` | 添加 Monitor 导航项 |

---

### Task 1: Monitor API 客户端

**Files:**
- Create: `packages/web/src/api/monitor.ts`

- [ ] **Step 1: 创建 API 客户端**

创建 `packages/web/src/api/monitor.ts`，定义类型和 API 方法：

```typescript
import ky from 'ky'
import { invoke } from '@tauri-apps/api/core'

// ========== 类型定义 ==========

export type SessionStatus =
  | 'idle'
  | 'thinking'
  | 'executing'
  | 'multi_executing'
  | 'waiting_input'
  | 'tool_done'
  | 'completed'
  | 'error'

export type TerminalType = 'vscode' | 'iterm' | 'warp' | 'terminal' | 'unknown'

export interface Session {
  pid: number
  ppid: number
  terminal: TerminalType
  cwd: string
  project: string
  status: SessionStatus
  startedAt: number
  updatedAt: number
  message?: string
  currentTool?: string
  activeToolsCount?: number
  activeTools?: string[]
  activeSubagentsCount?: number
  activeSubagents?: string[]
}

export interface SessionEvent {
  id: string
  type: 'started' | 'ended' | 'waiting' | 'resumed' | 'killed' | 'subagent_start' | 'subagent_stop' | 'compact' | 'tool_failure'
  pid: number
  project: string
  timestamp: number
  message?: string
}

export interface MonitorCheckResult {
  installed: boolean
  hooksDirExists: boolean
}

export interface DaemonCheckResult {
  running: boolean
  pid?: number
}

export interface MonitorOperationResult {
  success: boolean
}

// ========== Daemon HTTP API ==========

const MONITOR_PORT = 17530
const MONITOR_BASE = `http://localhost:${MONITOR_PORT}`

const monitorHttp = ky.create({
  prefixUrl: MONITOR_BASE,
  timeout: 5000,
  hooks: {
    beforeError: [
      (error) => {
        console.error('[monitor-api]', error.message)
        return error
      },
    ],
  },
})

export const monitorApi = {
  // --- Daemon HTTP ---

  async health(): Promise<boolean> {
    try {
      await monitorHttp.get('api/health')
      return true
    } catch {
      return false
    }
  },

  async getSessions(): Promise<Session[]> {
    try {
      const resp = await monitorHttp.get('api/sessions').json<{ success: boolean; data: Session[] }>()
      return resp.data ?? []
    } catch {
      return []
    }
  },

  async getSession(pid: number): Promise<Session | null> {
    try {
      const resp = await monitorHttp.get(`api/sessions/${pid}`).json<{ success: boolean; data: Session }>()
      return resp.data ?? null
    } catch {
      return null
    }
  },

  async getEvents(): Promise<SessionEvent[]> {
    try {
      const resp = await monitorHttp.get('api/events').json<{ success: boolean; data: SessionEvent[] }>()
      return resp.data ?? []
    } catch {
      return []
    }
  },

  // --- Tauri 命令 ---

  async checkHooks(): Promise<MonitorCheckResult> {
    return invoke<MonitorCheckResult>('monitor_check_hooks')
  },

  async installHooks(): Promise<MonitorOperationResult> {
    return invoke<MonitorOperationResult>('monitor_install_hooks')
  },

  async uninstallHooks(): Promise<MonitorOperationResult> {
    return invoke<MonitorOperationResult>('monitor_uninstall_hooks')
  },

  async checkDaemon(): Promise<DaemonCheckResult> {
    return invoke<DaemonCheckResult>('monitor_check_daemon')
  },

  async startDaemon(): Promise<DaemonCheckResult> {
    return invoke<DaemonCheckResult>('monitor_start_daemon')
  },

  async stopDaemon(): Promise<MonitorOperationResult> {
    return invoke<MonitorOperationResult>('monitor_stop_daemon')
  },
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `cd /Users/jiashengwang/jacky-github/jacky-skills-package && pnpm --filter @wangjs-jacky/j-skills-web typecheck 2>&1 | head -20`

注意：web 包可能没有独立的 typecheck 命令，用 `cd packages/web && npx tsc --noEmit` 验证。

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/api/monitor.ts
git commit -m "feat(monitor): add monitor API client with types and HTTP/Tauri methods"
```

---

### Task 2: WebSocket Hook

**Files:**
- Create: `packages/web/src/hooks/useMonitorWebSocket.ts`

- [ ] **Step 1: 创建 WebSocket Hook**

创建 `packages/web/src/hooks/useMonitorWebSocket.ts`：

```typescript
import { useEffect, useRef, useCallback, useState } from 'react'
import type { Session, SessionEvent } from '../api/monitor'

const MONITOR_WS_URL = 'ws://localhost:17530/ws'
const RECONNECT_INTERVAL = 3000
const MAX_EVENTS = 50

export type ServerMessage =
  | { type: 'init'; sessions: Session[]; events: SessionEvent[] }
  | { type: 'session_update'; session: Session }
  | { type: 'session_removed'; pid: number }
  | { type: 'new_event'; event: SessionEvent }

interface UseMonitorWebSocketOptions {
  enabled: boolean
  onSessionsInit?: (sessions: Session[]) => void
  onSessionUpdate?: (session: Session) => void
  onSessionRemoved?: (pid: number) => void
  onNewEvent?: (event: SessionEvent) => void
}

export function useMonitorWebSocket({
  enabled,
  onSessionsInit,
  onSessionUpdate,
  onSessionRemoved,
  onNewEvent,
}: UseMonitorWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [connected, setConnected] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)

  // 用 ref 持有回调，避免频繁重连
  const callbacksRef = useRef({
    onSessionsInit,
    onSessionUpdate,
    onSessionRemoved,
    onNewEvent,
  })
  callbacksRef.current = {
    onSessionsInit,
    onSessionUpdate,
    onSessionRemoved,
    onNewEvent,
  }

  const connect = useCallback(() => {
    if (!enabled || wsRef.current?.readyState === WebSocket.OPEN) return

    try {
      const ws = new WebSocket(MONITOR_WS_URL)

      ws.onopen = () => {
        setConnected(true)
        setReconnecting(false)
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as ServerMessage
          switch (msg.type) {
            case 'init':
              callbacksRef.current.onSessionsInit?.(msg.sessions)
              msg.events.slice(-MAX_EVENTS).forEach((e) => {
                callbacksRef.current.onNewEvent?.(e)
              })
              break
            case 'session_update':
              callbacksRef.current.onSessionUpdate?.(msg.session)
              break
            case 'session_removed':
              callbacksRef.current.onSessionRemoved?.(msg.pid)
              break
            case 'new_event':
              callbacksRef.current.onNewEvent?.(msg.event)
              break
          }
        } catch (err) {
          console.error('[monitor-ws] Failed to parse message:', err)
        }
      }

      ws.onclose = () => {
        setConnected(false)
        wsRef.current = null
        if (enabled) {
          setReconnecting(true)
          reconnectTimerRef.current = setTimeout(() => {
            connect()
          }, RECONNECT_INTERVAL)
        }
      }

      ws.onerror = () => {
        ws.close()
      }

      wsRef.current = ws
    } catch (err) {
      console.error('[monitor-ws] Connection error:', err)
      if (enabled) {
        setReconnecting(true)
        reconnectTimerRef.current = setTimeout(connect, RECONNECT_INTERVAL)
      }
    }
  }, [enabled])

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setConnected(false)
    setReconnecting(false)
  }, [])

  useEffect(() => {
    if (enabled) {
      connect()
    } else {
      disconnect()
    }
    return disconnect
  }, [enabled, connect, disconnect])

  return { connected, reconnecting }
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `cd /Users/jiashengwang/jacky-github/jacky-skills-package/packages/web && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/hooks/useMonitorWebSocket.ts
git commit -m "feat(monitor): add WebSocket hook with auto-reconnect"
```

---

### Task 3: Rust Tauri 命令（Monitor Hooks + Daemon 管理）

**Files:**
- Create: `src-tauri/src/commands/monitor.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/main.rs`

- [ ] **Step 1: 创建 monitor.rs**

创建 `src-tauri/src/commands/monitor.rs`：

```rust
use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use std::process::Command;

use crate::utils::paths::get_claude_settings_path;
use crate::Result;

const MONITOR_MARKER: &str = "# monitor: claude-monitor";
const MONITOR_HOOKS_DIR: &str = ".claude-monitor/hooks";
const MONITOR_PORT: u16 = 17530;
const MONITOR_DAEMON_URL: &str = "http://localhost:17530/api/health";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MonitorCheckResult {
    pub installed: bool,
    pub hooks_dir_exists: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DaemonCheckResult {
    pub running: bool,
    pub pid: Option<u32>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MonitorOperationResult {
    pub success: bool,
}

fn get_home_dir() -> Result<PathBuf> {
    dirs::home_dir()
        .ok_or_else(|| crate::AppError::InvalidPath("Cannot determine home directory".to_string()))
}

fn get_hooks_dir() -> Result<PathBuf> {
    let home = get_home_dir()?;
    Ok(home.join(MONITOR_HOOKS_DIR))
}

/// Monitor hooks 定义：与 claude-monitor CLI showHooksConfig() 一致
fn get_monitor_hooks_definition() -> serde_json::Value {
    serde_json::json!({
        "SessionStart": [
            { "matcher": "", "hooks": [{ "type": "command", "command": "~/.claude-monitor/hooks/session-start.sh" }] }
        ],
        "SessionEnd": [
            { "matcher": "", "hooks": [{ "type": "command", "command": "~/.claude-monitor/hooks/session-end.sh" }] }
        ],
        "UserPromptSubmit": [
            { "matcher": "", "hooks": [{ "type": "command", "command": "~/.claude-monitor/hooks/prompt-submit.sh" }] }
        ],
        "PreToolUse": [
            { "matcher": "AskUserQuestion", "hooks": [{ "type": "command", "command": "~/.claude-monitor/hooks/waiting-input.sh" }] },
            { "matcher": "", "hooks": [{ "type": "command", "command": "~/.claude-monitor/hooks/tool-start.sh" }] }
        ],
        "PostToolUse": [
            { "matcher": "AskUserQuestion", "hooks": [{ "type": "command", "command": "~/.claude-monitor/hooks/input-answered.sh" }] },
            { "matcher": "", "hooks": [{ "type": "command", "command": "~/.claude-monitor/hooks/tool-end.sh" }] }
        ],
        "PostToolUseFailure": [
            { "matcher": "", "hooks": [{ "type": "command", "command": "~/.claude-monitor/hooks/tool-failure.sh" }] }
        ],
        "Stop": [
            { "matcher": "", "hooks": [{ "type": "command", "command": "~/.claude-monitor/hooks/response-end.sh" }] }
        ],
        "Notification": [
            { "matcher": "", "hooks": [{ "type": "command", "command": "~/.claude-monitor/hooks/notification.sh" }] }
        ],
        "PreCompact": [
            { "matcher": "", "hooks": [{ "type": "command", "command": "~/.claude-monitor/hooks/pre-compact.sh" }] }
        ],
        "SubagentStart": [
            { "matcher": "", "hooks": [{ "type": "command", "command": "~/.claude-monitor/hooks/subagent-start.sh" }] }
        ],
        "SubagentStop": [
            { "matcher": "", "hooks": [{ "type": "command", "command": "~/.claude-monitor/hooks/subagent-stop.sh" }] }
        ]
    })
}

/// 检查 monitor hooks 是否已注入
#[tauri::command]
pub fn monitor_check_hooks() -> Result<MonitorCheckResult> {
    let hooks_dir = get_hooks_dir()?;
    let hooks_dir_exists = hooks_dir.exists();

    let settings_path = get_claude_settings_path()?;
    let installed = if settings_path.exists() {
        let content = fs::read_to_string(&settings_path)?;
        content.contains(MONITOR_MARKER)
    } else {
        false
    };

    Ok(MonitorCheckResult {
        installed,
        hooks_dir_exists,
    })
}

/// 注入 monitor hooks 到 settings.json
#[tauri::command]
pub fn monitor_install_hooks() -> Result<MonitorOperationResult> {
    let settings_path = get_claude_settings_path()?;

    // 确保 settings.json 存在
    if let Some(parent) = settings_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)?;
        }
    }

    // 读取或创建 settings
    let mut settings: serde_json::Value = if settings_path.exists() {
        let content = fs::read_to_string(&settings_path)?;
        serde_json::from_str(&content)?
    } else {
        serde_json::json!({})
    };

    // 获取或创建 hooks 对象
    if settings.get("hooks").is_none() {
        settings["hooks"] = serde_json::json!({});
    }

    let monitor_hooks = get_monitor_hooks_definition();

    // 遍历每个 hook 类型，注入带标记的 command
    if let Some(hooks_obj) = settings["hooks"].as_object_mut() {
        if let Some(monitor_hooks_obj) = monitor_hooks.as_object() {
            for (hook_type, matchers) in monitor_hooks_obj {
                if let Some(matchers_arr) = matchers.as_array() {
                    // 确保该 hook 类型存在
                    if !hooks_obj.contains_key(hook_type) {
                        hooks_obj.insert(hook_type.clone(), serde_json::json!([]));
                    }

                    if let Some(existing_matchers) = hooks_obj[hook_type].as_array_mut() {
                        for matcher_val in matchers_arr {
                            if let Some(m) = matcher_val.as_object() {
                                let matcher_str = m.get("matcher")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("");
                                let hooks_arr = m.get("hooks")
                                    .and_then(|v| v.as_array())
                                    .unwrap_or(&Vec::new());

                                // 添加标记后的 hooks
                                let mut tagged_hooks: Vec<serde_json::Value> = Vec::new();
                                for hook in hooks_arr {
                                    let mut tagged = hook.clone();
                                    if let Some(cmd) = tagged.get_mut("command") {
                                        if let Some(cmd_str) = cmd.as_str() {
                                            let tagged_cmd = format!("{} {}", cmd_str, MONITOR_MARKER);
                                            *cmd = serde_json::Value::String(tagged_cmd);
                                        }
                                    }
                                    tagged_hooks.push(tagged);
                                }

                                // 查找已有 matcher
                                let found = existing_matchers.iter_mut().find(|em| {
                                    em.get("matcher")
                                        .and_then(|v| v.as_str())
                                        .unwrap_or("") == matcher_str
                                });

                                if let Some(existing) = found {
                                    // 合并 hooks（避免重复）
                                    if let Some(existing_hooks) = existing.get_mut("hooks") {
                                        if let Some(eh_arr) = existing_hooks.as_array_mut() {
                                            for th in tagged_hooks {
                                                let exists = eh_arr.iter().any(|h| {
                                                    h.get("command") == th.get("command")
                                                });
                                                if !exists {
                                                    eh_arr.push(th);
                                                }
                                            }
                                        }
                                    }
                                } else {
                                    // 新增 matcher
                                    existing_matchers.push(serde_json::json!({
                                        "matcher": matcher_str,
                                        "hooks": tagged_hooks
                                    }));
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // 写回 settings.json
    let content = serde_json::to_string_pretty(&settings)?;
    fs::write(&settings_path, content)?;

    Ok(MonitorOperationResult { success: true })
}

/// 从 settings.json 移除 monitor hooks
#[tauri::command]
pub fn monitor_uninstall_hooks() -> Result<MonitorOperationResult> {
    let settings_path = get_claude_settings_path()?;

    if !settings_path.exists() {
        return Ok(MonitorOperationResult { success: true });
    }

    let content = fs::read_to_string(&settings_path)?;
    let mut settings: serde_json::Value = serde_json::from_str(&content)?;

    let mut removed = false;

    if let Some(hooks) = settings.get_mut("hooks").and_then(|h| h.as_object_mut()) {
        let hook_types: Vec<String> = hooks.keys().cloned().collect();

        for hook_type in hook_types {
            if let Some(matchers) = hooks.get_mut(&hook_type).and_then(|m| m.as_array_mut()) {
                let mut i = matchers.len();
                while i > 0 {
                    i -= 1;
                    if let Some(hooks_arr) = matchers[i].get_mut("hooks").and_then(|h| h.as_array_mut()) {
                        hooks_arr.retain(|h| {
                            h.get("command")
                                .and_then(|c| c.as_str())
                                .map(|c| !c.contains(MONITOR_MARKER))
                                .unwrap_or(true)
                        });
                        if hooks_arr.is_empty() {
                            matchers.remove(i);
                            removed = true;
                        }
                    }
                }
                if matchers.is_empty() {
                    hooks.remove(&hook_type);
                }
            }
        }
    }

    if removed {
        let content = serde_json::to_string_pretty(&settings)?;
        fs::write(&settings_path, content)?;
    }

    Ok(MonitorOperationResult { success: true })
}

/// 检测 daemon 是否在运行
#[tauri::command]
pub fn monitor_check_daemon() -> Result<DaemonCheckResult> {
    let running = is_daemon_running();
    Ok(DaemonCheckResult {
        running,
        pid: None,
    })
}

fn is_daemon_running() -> bool {
    // 通过 curl 检测 daemon 是否响应（避免引入 HTTP 依赖）
    Command::new("curl")
        .args(["-s", "-o", "/dev/null", "-w", "%{http_code}", "--max-time", "2", MONITOR_DAEMON_URL])
        .output()
        .map(|o| {
            let code = String::from_utf8_lossy(&o.stdout);
            code.trim().starts_with("200")
        })
        .unwrap_or(false)
}

/// 启动 daemon 进程
#[tauri::command]
pub fn monitor_start_daemon() -> Result<DaemonCheckResult> {
    if is_daemon_running() {
        return Ok(DaemonCheckResult { running: true, pid: None });
    }

    // 使用 npx 启动 daemon（后台运行）
    let child = Command::new("npx")
        .args(["@wangjs-jacky/claude-monitor", "start"])
        .spawn();

    match child {
        Ok(_) => {
            // 等待 daemon 启动
            std::thread::sleep(std::time::Duration::from_secs(2));
            let running = is_daemon_running();
            Ok(DaemonCheckResult { running, pid: None })
        }
        Err(e) => {
            eprintln!("Failed to start daemon: {}", e);
            Ok(DaemonCheckResult { running: false, pid: None })
        }
    }
}

/// 停止 daemon 进程
#[tauri::command]
pub fn monitor_stop_daemon() -> Result<MonitorOperationResult> {
    // 通过 Unix Socket 发送停止请求
    let socket_path = get_home_dir()?.join(".claude-monitor").join("monitor.sock");

    if socket_path.exists() {
        // 用 curl 通过 Unix Socket 发送请求
        let _ = Command::new("curl")
            .args([
                "-s",
                "--unix-socket",
                socket_path.to_str().unwrap_or(""),
                "-X", "POST",
                "http://localhost/api/shutdown",
            ])
            .output();
    }

    // 备选：通过 npx stop
    let _ = Command::new("npx")
        .args(["@wangjs-jacky/claude-monitor", "stop"])
        .output();

    Ok(MonitorOperationResult { success: true })
}
```

- [ ] **Step 2: 注册模块**

修改 `src-tauri/src/commands/mod.rs`：

```rust
pub mod skills;
pub mod config;
pub mod monitor;

pub use skills::*;
pub use config::*;
pub use monitor::*;
```

修改 `src-tauri/src/lib.rs`：

```rust
mod error;
mod models;
mod utils;
mod services;
pub mod commands;

pub use error::{AppError, Result};
pub use models::{SkillInfo, SkillSource, SourceFolder, AppConfig, InstallMethod};
pub use utils::*;
pub use services::{ConfigService, Registry, has_skill_hooks, has_skill_hooks_in_settings, merge_skill_hooks, remove_skill_hooks};
pub use commands::AppState;
pub use commands::monitor;
```

修改 `src-tauri/src/main.rs`，在 `invoke_handler` 中添加 monitor 命令：

```rust
.invoke_handler(tauri::generate_handler![
    // ...existing commands...
    j_skills_lib::commands::monitor_check_hooks,
    j_skills_lib::commands::monitor_install_hooks,
    j_skills_lib::commands::monitor_uninstall_hooks,
    j_skills_lib::commands::monitor_check_daemon,
    j_skills_lib::commands::monitor_start_daemon,
    j_skills_lib::commands::monitor_stop_daemon,
])
```

- [ ] **Step 3: 验证 Rust 编译**

Run: `cd /Users/jiashengwang/jacky-github/jacky-skills-package/src-tauri && cargo check 2>&1 | tail -20`
Expected: `Finished dev [unoptimized + debuginfo] target(s)`

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/commands/monitor.rs src-tauri/src/commands/mod.rs src-tauri/src/lib.rs src-tauri/src/main.rs
git commit -m "feat(monitor): add Rust Tauri commands for hooks and daemon management"
```

---

### Task 4: StatusBadge 组件

**Files:**
- Create: `packages/web/src/pages/Monitor/StatusBadge.tsx`

- [ ] **Step 1: 创建 StatusBadge 组件**

创建 `packages/web/src/pages/Monitor/StatusBadge.tsx`：

```typescript
import type { SessionStatus } from '../../api/monitor'

interface StatusBadgeProps {
  status: SessionStatus
  showLabel?: boolean
}

const STATUS_CONFIG: Record<SessionStatus, { label: string; color: string; pulse: boolean }> = {
  idle: { label: '空闲', color: 'var(--color-text-muted)', pulse: false },
  thinking: { label: '思考中', color: 'var(--color-amber)', pulse: true },
  executing: { label: '执行中', color: 'var(--color-blue)', pulse: false },
  multi_executing: { label: '并行执行', color: 'var(--color-blue)', pulse: true },
  waiting_input: { label: '等待输入', color: 'var(--color-amber)', pulse: true },
  tool_done: { label: '工具完成', color: 'var(--color-text-muted)', pulse: false },
  completed: { label: '完成', color: 'var(--color-primary)', pulse: false },
  error: { label: '出错', color: 'var(--color-red)', pulse: true },
}

export default function StatusBadge({ status, showLabel = true }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.idle

  return (
    <span
      data-testid={`status-badge-${status}`}
      className="inline-flex items-center gap-1.5 font-mono text-xs"
    >
      <span
        className={`w-2 h-2 rounded-full ${config.pulse ? 'animate-pulse' : ''}`}
        style={{ backgroundColor: config.color, boxShadow: config.pulse ? `0 0 6px ${config.color}` : 'none' }}
      />
      {showLabel && (
        <span style={{ color: config.color }}>{config.label}</span>
      )}
    </span>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/pages/Monitor/StatusBadge.tsx
git commit -m "feat(monitor): add StatusBadge component with status colors"
```

---

### Task 5: SessionCard 组件

**Files:**
- Create: `packages/web/src/pages/Monitor/SessionCard.tsx`

- [ ] **Step 1: 创建 SessionCard 组件**

创建 `packages/web/src/pages/Monitor/SessionCard.tsx`：

```typescript
import { useState } from 'react'
import { ChevronDown, ChevronRight, Terminal as TerminalIcon, Clock, Wrench, Bot, MessageSquare } from 'lucide-react'
import type { Session } from '../../api/monitor'
import StatusBadge from './StatusBadge'

interface SessionCardProps {
  session: Session
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const TERMINAL_LABELS: Record<string, string> = {
  vscode: 'VSCode',
  iterm: 'iTerm',
  warp: 'Warp',
  terminal: 'Terminal',
  unknown: 'Terminal',
}

export default function SessionCard({ session }: SessionCardProps) {
  const [expanded, setExpanded] = useState(false)
  const duration = Date.now() - session.startedAt

  return (
    <div
      data-testid={`session-card-${session.pid}`}
      className="glass-card rounded-xl overflow-hidden transition-all duration-300 hover:border-[var(--color-primary)]/20"
    >
      {/* 收起/展开的头部 */}
      <button
        data-testid={`session-card-toggle-${session.pid}`}
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors"
      >
        {expanded ? (
          <ChevronDown size={14} className="text-[var(--color-text-muted)] flex-shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-[var(--color-text-muted)] flex-shrink-0" />
        )}

        <StatusBadge status={session.status} />

        <div className="h-3 w-px bg-[var(--color-border)]" />

        <span className="font-mono text-sm font-medium text-[var(--color-text)] truncate">
          {session.project}
        </span>

        <div className="h-3 w-px bg-[var(--color-border)]" />

        <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] font-mono">
          <TerminalIcon size={10} />
          {TERMINAL_LABELS[session.terminal] ?? session.terminal}
        </span>

        <div className="flex-1" />

        <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] font-mono">
          <Clock size={10} />
          {formatDuration(duration)}
        </span>
      </button>

      {/* 当前工具/消息 */}
      {!expanded && session.currentTool && (
        <div className="px-4 pb-2 -mt-1 pl-9">
          <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
            Tool: {session.currentTool}
            {session.activeToolsCount && session.activeToolsCount > 1
              ? ` (+${session.activeToolsCount - 1} more)`
              : ''}
          </span>
        </div>
      )}

      {/* 展开详情 */}
      {expanded && (
        <div data-testid={`session-detail-${session.pid}`} className="border-t border-[var(--color-border)] px-4 py-3 space-y-3 animate-fade-in">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono text-[var(--color-text-muted)]">
            <div>PID: <span className="text-[var(--color-text)]">{session.pid}</span></div>
            <div>Started: <span className="text-[var(--color-text)]">{formatTime(session.startedAt)}</span></div>
            <div>CWD: <span className="text-[var(--color-text)] truncate">{session.cwd}</span></div>
            {session.message && (
              <div>Message: <span className="text-[var(--color-amber)]">{session.message}</span></div>
            )}
          </div>

          {/* 活跃工具 */}
          {(session.activeTools && session.activeTools.length > 0) && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--color-text-muted)] mb-1">
                <Wrench size={10} />
                <span>Active Tools ({session.activeToolsCount ?? session.activeTools.length})</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {session.activeTools.map((tool, i) => (
                  <span key={i} className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--color-blue-dim)] text-[var(--color-blue)] border border-[var(--color-blue)]/20">
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 活跃子代理 */}
          {(session.activeSubagents && session.activeSubagents.length > 0) && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--color-text-muted)] mb-1">
                <Bot size={10} />
                <span>Subagents ({session.activeSubagentsCount ?? session.activeSubagents.length})</span>
              </div>
              <div className="space-y-1">
                {session.activeSubagents.map((agent, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-pulse" />
                    <span className="text-[var(--color-text)]">{agent}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 无活跃任务时的提示 */}
          {!session.currentTool && (!session.activeTools || session.activeTools.length === 0) && (
            <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-text-muted)]">
              <MessageSquare size={10} />
              <span>{session.status === 'idle' ? '等待用户输入...' : '无活跃任务'}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/pages/Monitor/SessionCard.tsx
git commit -m "feat(monitor): add SessionCard component with expand/collapse"
```

---

### Task 6: EventTimeline 组件

**Files:**
- Create: `packages/web/src/pages/Monitor/EventTimeline.tsx`

- [ ] **Step 1: 创建 EventTimeline 组件**

创建 `packages/web/src/pages/Monitor/EventTimeline.tsx`：

```typescript
import { useState } from 'react'
import { ChevronDown, ChevronRight, Activity } from 'lucide-react'
import type { SessionEvent } from '../../api/monitor'

interface EventTimelineProps {
  events: SessionEvent[]
}

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  started: { label: '会话启动', color: 'var(--color-primary)' },
  ended: { label: '会话结束', color: 'var(--color-text-muted)' },
  waiting: { label: '等待输入', color: 'var(--color-amber)' },
  resumed: { label: '已恢复', color: 'var(--color-blue)' },
  killed: { label: '已终止', color: 'var(--color-red)' },
  subagent_start: { label: '子代理启动', color: 'var(--color-blue)' },
  subagent_stop: { label: '子代理结束', color: 'var(--color-text-muted)' },
  compact: { label: '上下文压缩', color: 'var(--color-text-muted)' },
  tool_failure: { label: '工具错误', color: 'var(--color-red)' },
}

function formatEventTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function EventTimeline({ events }: EventTimelineProps) {
  const [collapsed, setCollapsed] = useState(false)

  if (events.length === 0) return null

  return (
    <div data-testid="event-timeline" className="mt-6">
      {/* 标题栏 */}
      <button
        data-testid="event-timeline-toggle"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-white/[0.02] transition-colors text-left"
      >
        {collapsed ? (
          <ChevronRight size={14} className="text-[var(--color-text-muted)]" />
        ) : (
          <ChevronDown size={14} className="text-[var(--color-text-muted)]" />
        )}
        <Activity size={14} className="text-[var(--color-primary)]" />
        <span className="font-mono text-sm font-medium text-[var(--color-text-muted)]">
          Events
        </span>
        <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
          ({events.length})
        </span>
      </button>

      {/* 事件列表 */}
      {!collapsed && (
        <div data-testid="event-timeline-list" className="mt-1 space-y-0.5 max-h-64 overflow-y-auto px-2">
          {events.map((event, index) => {
            const config = EVENT_LABELS[event.type] ?? { label: event.type, color: 'var(--color-text-muted)' }
            return (
              <div
                key={event.id ?? index}
                data-testid={`event-item-${index}`}
                className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-white/[0.02] text-xs font-mono group"
              >
                <span className="text-[var(--color-text-muted)] flex-shrink-0 w-16">
                  {formatEventTime(event.timestamp)}
                </span>
                <span style={{ color: config.color }} className="flex-shrink-0">▸</span>
                <span className="text-[var(--color-text-muted)] flex-shrink-0">
                  {config.label}
                </span>
                <span className="text-[var(--color-text)] truncate">
                  {event.project}
                </span>
                {event.message && (
                  <span className="text-[var(--color-text-muted)] truncate">
                    {event.message}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/pages/Monitor/EventTimeline.tsx
git commit -m "feat(monitor): add EventTimeline component with collapse toggle"
```

---

### Task 7: Monitor 主页面

**Files:**
- Create: `packages/web/src/pages/Monitor/index.tsx`

- [ ] **Step 1: 创建 Monitor 页面**

创建 `packages/web/src/pages/Monitor/index.tsx`：

```typescript
import { useEffect, useState, useCallback } from 'react'
import { Activity, Power, PowerOff, Loader2, WifiOff, Radio } from 'lucide-react'
import { monitorApi, type Session, type SessionEvent } from '../../api/monitor'
import { useMonitorWebSocket } from '../../hooks/useMonitorWebSocket'
import { useStore } from '../../stores'
import SessionCard from './SessionCard'
import EventTimeline from './EventTimeline'

export default function MonitorPage() {
  const { showToast } = useStore()

  // 状态
  const [hooksInstalled, setHooksInstalled] = useState(false)
  const [hooksDirExists, setHooksDirExists] = useState(false)
  const [daemonRunning, setDaemonRunning] = useState(false)
  const [checking, setChecking] = useState(true)
  const [operating, setOperating] = useState(false)

  // 数据
  const [sessions, setSessions] = useState<Session[]>([])
  const [events, setEvents] = useState<SessionEvent[]>([])

  // 监控是否启用（hooks 已注入）
  const enabled = hooksInstalled

  // WebSocket 连接
  const { connected, reconnecting } = useMonitorWebSocket({
    enabled: enabled && daemonRunning,
    onSessionsInit: (s) => setSessions(s),
    onSessionUpdate: (session) => {
      setSessions((prev) => {
        const idx = prev.findIndex((s) => s.pid === session.pid)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = session
          return next
        }
        return [...prev, session]
      })
    },
    onSessionRemoved: (pid) => {
      setSessions((prev) => prev.filter((s) => s.pid !== pid))
    },
    onNewEvent: (event) => {
      setEvents((prev) => [event, ...prev].slice(0, 50))
    },
  })

  // 初始化检查
  useEffect(() => {
    async function check() {
      setChecking(true)
      try {
        const hooksResult = await monitorApi.checkHooks()
        setHooksInstalled(hooksResult.installed)
        setHooksDirExists(hooksResult.hooksDirExists)

        if (hooksResult.installed) {
          const daemonResult = await monitorApi.checkDaemon()
          setDaemonRunning(daemonResult.running)

          if (daemonResult.running) {
            // 初始加载
            const [sessionsData, eventsData] = await Promise.all([
              monitorApi.getSessions(),
              monitorApi.getEvents(),
            ])
            setSessions(sessionsData)
            setEvents(eventsData.slice(-50).reverse())
          }
        }
      } catch (err) {
        console.error('[monitor] Init check failed:', err)
      } finally {
        setChecking(false)
      }
    }
    check()
  }, [])

  // 启用监控
  const handleEnable = useCallback(async () => {
    setOperating(true)
    try {
      const installResult = await monitorApi.installHooks()
      if (!installResult.success) {
        showToast('Hooks 注入失败', 'error')
        return
      }
      setHooksInstalled(true)

      // 启动 daemon
      const daemonResult = await monitorApi.startDaemon()
      setDaemonRunning(daemonResult.running)

      if (daemonResult.running) {
        showToast('监控已启用', 'success')
      } else {
        showToast('Hooks 已注入，但 Daemon 启动失败', 'error')
      }
    } catch (err) {
      showToast('启用监控失败', 'error')
    } finally {
      setOperating(false)
    }
  }, [showToast])

  // 禁用监控
  const handleDisable = useCallback(async () => {
    setOperating(true)
    try {
      // 先停止 daemon
      if (daemonRunning) {
        await monitorApi.stopDaemon()
        setDaemonRunning(false)
      }

      // 移除 hooks
      await monitorApi.uninstallHooks()
      setHooksInstalled(false)
      setSessions([])
      setEvents([])
      showToast('监控已禁用', 'success')
    } catch (err) {
      showToast('禁用监控失败', 'error')
    } finally {
      setOperating(false)
    }
  }, [daemonRunning, showToast])

  // 启动 daemon
  const handleStartDaemon = useCallback(async () => {
    setOperating(true)
    try {
      const result = await monitorApi.startDaemon()
      setDaemonRunning(result.running)
      if (result.running) {
        showToast('Daemon 已启动', 'success')
      } else {
        showToast('Daemon 启动失败，请检查 claude-monitor 是否已安装', 'error')
      }
    } catch (err) {
      showToast('启动 Daemon 失败', 'error')
    } finally {
      setOperating(false)
    }
  }, [showToast])

  // 加载中
  if (checking) {
    return (
      <div data-testid="monitor-loading" className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-lg border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] animate-spin" />
          <div className="absolute inset-0 bg-[var(--color-primary)]/20 blur-xl rounded-lg" />
        </div>
        <p className="text-sm font-mono text-[var(--color-text-muted)] animate-pulse">Checking monitor status...</p>
      </div>
    )
  }

  return (
    <div data-testid="monitor-page" className="relative z-10 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="relative">
            <Activity size={24} className="text-[var(--color-primary)]" />
            <div className="absolute inset-0 text-[var(--color-primary)] blur-lg animate-pulse">
              <Activity size={24} />
            </div>
          </div>
          <h2 className="text-3xl font-bold font-mono tracking-tight">
            <span className="gradient-text">Monitor</span>
          </h2>
        </div>
        <p className="text-[var(--color-text-muted)] font-mono text-sm">
          Visualize your active Claude Code sessions
        </p>
      </div>

      {/* 控制面板 */}
      <div className="mb-6 glass-card rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-4">
          {/* 主开关 */}
          <button
            data-testid="monitor-toggle"
            onClick={enabled ? handleDisable : handleEnable}
            disabled={operating}
            className={`
              relative flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm font-medium
              border transition-all duration-300
              ${enabled
                ? 'bg-[var(--color-primary-dim)] border-[var(--color-primary)]/30 text-[var(--color-primary)]'
                : 'bg-white/[0.02] border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-primary-dim)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)]'
              }
              disabled:opacity-50
            `}
          >
            {operating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : enabled ? (
              <PowerOff size={14} />
            ) : (
              <Power size={14} />
            )}
            <span>{enabled ? 'Disable Monitor' : 'Enable Monitor'}</span>
          </button>

          {/* 状态指示 */}
          <div className="flex items-center gap-4 text-xs font-mono text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${hooksInstalled ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-red)]'}`} />
              Hooks: {hooksInstalled ? 'Injected' : 'Not injected'}
            </span>

            {enabled && (
              <span className="flex items-center gap-1.5">
                {daemonRunning ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
                    Daemon: Running
                  </>
                ) : reconnecting ? (
                  <>
                    <Loader2 size={10} className="animate-spin" />
                    Reconnecting...
                  </>
                ) : (
                  <>
                    <WifiOff size={10} />
                    Daemon: Offline
                  </>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Daemon 离线时的启动按钮 */}
        {enabled && !daemonRunning && (
          <div className="flex items-center gap-3">
            <button
              data-testid="start-daemon-btn"
              onClick={handleStartDaemon}
              disabled={operating}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs border border-[var(--color-amber)]/30 bg-[var(--color-amber-dim)] text-[var(--color-amber)] hover:border-[var(--color-amber)]/50 transition-all disabled:opacity-50"
            >
              <Radio size={12} />
              Start Daemon
            </button>
            <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
              Make sure claude-monitor is installed: npx @wangjs-jacky/claude-monitor init
            </span>
          </div>
        )}

        {/* Hooks 目录不存在时的提示 */}
        {!hooksDirExists && (
          <div className="text-[10px] font-mono text-[var(--color-amber)]">
            Hooks directory not found. Run: npx @wangjs-jacky/claude-monitor init
          </div>
        )}
      </div>

      {/* 会话区域 */}
      {enabled && daemonRunning && (
        <>
          {/* 统计 */}
          <div data-testid="monitor-stats" className="flex items-center gap-4 mb-4 px-4 py-2 rounded-xl bg-white/[0.02] border border-[var(--color-border)]">
            <span className="flex items-center gap-2 text-sm font-mono text-[var(--color-text-muted)]">
              <Activity size={14} className="text-[var(--color-primary)]" />
              <span className="text-[var(--color-text)]">{sessions.length}</span> active sessions
            </span>
            {connected && (
              <>
                <div className="h-3 w-px bg-[var(--color-border)]" />
                <span className="flex items-center gap-1.5 text-xs font-mono text-[var(--color-text-muted)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-pulse" />
                  WebSocket connected
                </span>
              </>
            )}
          </div>

          {/* 会话卡片网格 */}
          {sessions.length > 0 ? (
            <div data-testid="session-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {sessions.map((session) => (
                <SessionCard key={session.pid} session={session} />
              ))}
            </div>
          ) : (
            <div data-testid="no-sessions" className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-16 h-16 rounded-full bg-[var(--color-primary-dim)] flex items-center justify-center">
                <Activity size={24} className="text-[var(--color-primary)] opacity-50" />
              </div>
              <p className="text-sm font-mono text-[var(--color-text-muted)]">
                No active sessions
              </p>
              <p className="text-xs font-mono text-[var(--color-text-muted)] opacity-50">
                Start a new Claude Code session to see it here
              </p>
            </div>
          )}

          {/* 事件时间线 */}
          <EventTimeline events={events} />
        </>
      )}

      {/* 未启用状态 */}
      {!enabled && (
        <div data-testid="monitor-disabled" className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-20 h-20 rounded-full bg-[var(--color-primary-dim)] flex items-center justify-center border border-[var(--color-primary)]/20">
            <Activity size={32} className="text-[var(--color-primary)] opacity-40" />
          </div>
          <p className="text-lg font-mono text-[var(--color-text-muted)]">
            Monitor is disabled
          </p>
          <p className="text-sm font-mono text-[var(--color-text-muted)] opacity-60 max-w-md text-center">
            Enable monitoring to track all your Claude Code sessions in real-time. This will inject hooks into your Claude Code settings and start the monitoring daemon.
          </p>
          <button
            data-testid="enable-monitor-btn"
            onClick={handleEnable}
            disabled={operating}
            className="mt-2 flex items-center gap-2 px-6 py-2.5 rounded-lg font-mono text-sm font-medium border border-[var(--color-primary)]/40 bg-[var(--color-primary-dim)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 hover:border-[var(--color-primary)]/60 transition-all disabled:opacity-50"
          >
            {operating ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
            Enable Monitor
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/pages/Monitor/index.tsx
git commit -m "feat(monitor): add Monitor page with toggle, session grid, and event timeline"
```

---

### Task 8: 路由 + Sidebar 集成

**Files:**
- Modify: `packages/web/src/App.tsx`
- Modify: `packages/web/src/components/Sidebar/index.tsx`

- [ ] **Step 1: 添加路由**

修改 `packages/web/src/App.tsx`：

在现有 import 后添加 Monitor 页面 import，在 Routes 中添加路由：

```typescript
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import SkillsPage from './pages/Skills'
import DevelopPage from './pages/Develop'
import SettingsPage from './pages/Settings'
import MonitorPage from './pages/Monitor'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<SkillsPage />} />
        <Route path="/skills" element={<SkillsPage />} />
        <Route path="/develop" element={<DevelopPage />} />
        <Route path="/monitor" element={<MonitorPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Layout>
  )
}

export default App
```

- [ ] **Step 2: 添加 Sidebar 导航项**

修改 `packages/web/src/components/Sidebar/index.tsx`：

在 import 中添加 `Activity` 图标（来自 lucide-react），在 navItems 数组中添加 Monitor 项：

```typescript
import { Package, Code, Settings, Terminal, Activity } from 'lucide-react'

const navItems = [
  { to: '/skills', icon: Package, label: 'Skills', description: 'Manage skills' },
  { to: '/develop', icon: Code, label: 'Develop', description: 'Create new' },
  { to: '/monitor', icon: Activity, label: 'Monitor', description: 'Track sessions' },
  { to: '/settings', icon: Settings, label: 'Settings', description: 'Configure' },
]
```

- [ ] **Step 3: 验证前端编译**

Run: `cd /Users/jiashengwang/jacky-github/jacky-skills-package/packages/web && npx tsc --noEmit 2>&1 | tail -10`
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/App.tsx packages/web/src/components/Sidebar/index.tsx
git commit -m "feat(monitor): add Monitor route and sidebar navigation"
```

---

### Task 9: 集成验证

**Files:** 无新文件

- [ ] **Step 1: 验证 Rust 编译**

Run: `cd /Users/jiashengwang/jacky-github/jacky-skills-package/src-tauri && cargo check 2>&1 | tail -5`
Expected: `Finished dev`

- [ ] **Step 2: 验证前端编译**

Run: `cd /Users/jiashengwang/jacky-github/jacky-skills-package/packages/web && npx tsc --noEmit 2>&1 | tail -5`
Expected: 无错误

- [ ] **Step 3: 启动 Dev 模式验证**

Run: `cd /Users/jiashengwang/jacky-github/jacky-skills-package && pnpm dev 2>&1 &`

验证要点：
1. Sidebar 显示 Monitor 导航项
2. 点击进入 `/monitor` 页面
3. 页面正常渲染（未启用状态显示开启按钮）
4. 点击 Enable Monitor 能调用 Tauri 命令（可能需要 daemon 安装）

- [ ] **Step 4: Final commit**

如有集成修复，提交：
```bash
git add -A
git commit -m "feat(monitor): complete Monitor page integration"
```
