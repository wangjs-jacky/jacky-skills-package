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

export type TerminalType = 'vscode' | 'cursor' | 'iterm' | 'warp' | 'terminal' | 'unknown'

export interface PlanStep {
  id: string
  title: string
  status: 'completed' | 'in_progress' | 'pending'
  duration?: string
}

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
  plan?: {
    current: number
    total: number
    steps: PlanStep[]
  }
  // 增强字段：由前端从 WebSocket tool_start/subagent_start 事件合并
  currentToolInput?: Record<string, unknown>
  currentSubagentDescriptions?: string[]
}

// ========== 增强功能：过程监控类型 ==========

export interface ToolCall {
  id: string
  sessionId: number
  tool: string
  input: Record<string, unknown>
  status: 'pending' | 'success' | 'error'
  startedAt: number
  completedAt?: number
  duration?: number
  error?: string
}

export interface SubagentCall {
  id: string
  sessionId: number
  agentType: string
  description: string
  status: 'running' | 'completed' | 'error'
  startedAt: number
  completedAt?: number
  duration?: number
  error?: string
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

export interface MonitorConfig {
  floatingWindow: {
    enabled: boolean
  }
}

export interface ExtensionCheckResult {
  installed: boolean
}

export interface ExtensionInstallResult {
  success: boolean
  message: string
}

// ========== Tauri fetch 代理类型 ==========

interface FetchResult {
  ok: boolean
  status: number
  data: unknown
}

// ========== 错误类型 ==========

export type MonitorErrorType = 'network' | 'timeout' | 'daemon_offline' | 'unknown'

export interface MonitorApiError {
  type: MonitorErrorType
  message: string
  raw?: unknown
}

export type MonitorApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: MonitorApiError }

function classifyError(err: unknown): MonitorApiError {
  if (err instanceof Error) {
    const msg = err.message
    if (msg.includes('timeout') || msg.includes('Timeout') || msg.includes('timed out')) {
      return { type: 'timeout', message: '请求超时', raw: err }
    }
    if (msg.includes('Failed to fetch') || msg.includes('ECONNREFUSED') || msg.includes('fetch failed')) {
      return { type: 'network', message: '无法连接到守护进程', raw: err }
    }
    return { type: 'unknown', message: msg, raw: err }
  }
  return { type: 'unknown', message: String(err) }
}

function okResult<T>(data: T): MonitorApiResult<T> {
  return { ok: true, data }
}

function errResult<T>(err: unknown): MonitorApiResult<T> {
  return { ok: false, error: classifyError(err) }
}

// ========== 通用 fetch 代理 ==========

async function daemonFetch<T>(method: string, path: string): Promise<MonitorApiResult<T>> {
  try {
    const result = await invoke<FetchResult>('monitor_fetch', {
      params: { method, path },
    })
    if (result.ok) {
      return okResult(result.data as T)
    }
    return errResult<T>(new Error(`HTTP ${result.status}`))
  } catch (err) {
    return errResult<T>(err)
  }
}

async function daemonFetchWithExtract<T>(
  method: string,
  path: string,
  extractor: (data: unknown) => T,
  fallback: T,
): Promise<MonitorApiResult<T>> {
  try {
    const result = await invoke<FetchResult>('monitor_fetch', {
      params: { method, path },
    })
    if (result.ok) {
      return okResult(extractor(result.data) ?? fallback)
    }
    return errResult<T>(new Error(`HTTP ${result.status}`))
  } catch (err) {
    return errResult<T>(err)
  }
}

// ========== API ==========

export const monitorApi = {
  // --- Daemon HTTP（通过 Tauri 代理） ---

  async health(): Promise<MonitorApiResult<boolean>> {
    return daemonFetch('GET', '/api/health')
  },

  async getSessions(): Promise<MonitorApiResult<Session[]>> {
    return daemonFetchWithExtract(
      'GET', '/api/sessions',
      (d) => (d as { data: Session[] })?.data ?? [],
      [],
    )
  },

  async getSession(pid: number): Promise<MonitorApiResult<Session | null>> {
    return daemonFetchWithExtract(
      'GET', `/api/sessions/${pid}`,
      (d) => (d as { data: Session })?.data ?? null,
      null,
    )
  },

  async getEvents(): Promise<MonitorApiResult<SessionEvent[]>> {
    return daemonFetchWithExtract(
      'GET', '/api/events',
      (d) => (d as { data: SessionEvent[] })?.data ?? [],
      [],
    )
  },

  /**
   * 手动触发进程发现：扫描并注册已运行但未追踪的 Claude Code 会话
   */
  async discoverSessions(): Promise<MonitorApiResult<Session[]>> {
    return daemonFetchWithExtract(
      'POST', '/api/discover',
      (d) => (d as { data: Session[] })?.data ?? [],
      [],
    )
  },

  async killSession(pid: number): Promise<MonitorApiResult<null>> {
    try {
      const result = await invoke<FetchResult>('monitor_fetch', {
        params: { method: 'DELETE', path: `/api/sessions/${pid}` },
      })
      if (result.ok) {
        return okResult(null)
      }
      return errResult<null>(new Error(`HTTP ${result.status}`))
    } catch (err) {
      return errResult<null>(err)
    }
  },

  // --- Tauri 命令 ---

  async checkHooks(): Promise<MonitorApiResult<MonitorCheckResult>> {
    try {
      const result = await invoke<MonitorCheckResult>('monitor_check_hooks')
      return okResult(result)
    } catch (err) {
      return errResult<MonitorCheckResult>(err)
    }
  },

  async installHooks(): Promise<MonitorApiResult<MonitorOperationResult>> {
    try {
      const result = await invoke<MonitorOperationResult>('monitor_install_hooks')
      return okResult(result)
    } catch (err) {
      return errResult<MonitorOperationResult>(err)
    }
  },

  async uninstallHooks(): Promise<MonitorApiResult<MonitorOperationResult>> {
    try {
      const result = await invoke<MonitorOperationResult>('monitor_uninstall_hooks')
      return okResult(result)
    } catch (err) {
      return errResult<MonitorOperationResult>(err)
    }
  },

  async checkDaemon(): Promise<MonitorApiResult<DaemonCheckResult>> {
    try {
      const result = await invoke<DaemonCheckResult>('monitor_check_daemon')
      return okResult(result)
    } catch (err) {
      return errResult<DaemonCheckResult>(err)
    }
  },

  async startDaemon(): Promise<MonitorApiResult<DaemonCheckResult>> {
    try {
      const result = await invoke<DaemonCheckResult>('monitor_start_daemon')
      return okResult(result)
    } catch (err) {
      return errResult<DaemonCheckResult>(err)
    }
  },

  async stopDaemon(): Promise<MonitorApiResult<MonitorOperationResult>> {
    try {
      const result = await invoke<MonitorOperationResult>('monitor_stop_daemon')
      return okResult(result)
    } catch (err) {
      return errResult<MonitorOperationResult>(err)
    }
  },

  // --- 配置 ---

  async getConfig(): Promise<MonitorApiResult<MonitorConfig>> {
    try {
      const result = await invoke<MonitorConfig>('monitor_get_config')
      return okResult(result)
    } catch (err) {
      return errResult<MonitorConfig>(err)
    }
  },

  async setConfig(config: MonitorConfig): Promise<MonitorApiResult<MonitorConfig>> {
    try {
      const result = await invoke<MonitorConfig>('monitor_set_config', { config })
      return okResult(result)
    } catch (err) {
      return errResult<MonitorConfig>(err)
    }
  },

  // --- 终端窗口激活 ---

  async activateTerminal(terminal: TerminalType, project: string, pid?: number, cwd?: string): Promise<MonitorApiResult<MonitorOperationResult>> {
    try {
      const result = await invoke<MonitorOperationResult>('activate_terminal', {
        params: { terminal, project, pid: pid ?? null, cwd: cwd ?? null },
      })
      return okResult(result)
    } catch (err) {
      return errResult<MonitorOperationResult>(err)
    }
  },

  // --- 扩展管理 ---

  async checkTerminalExtension(terminal: string): Promise<MonitorApiResult<ExtensionCheckResult>> {
    try {
      const result = await invoke<ExtensionCheckResult>('check_terminal_extension', { terminal })
      return okResult(result)
    } catch (err) {
      return errResult<ExtensionCheckResult>(err)
    }
  },

  async installTerminalExtension(terminal: string): Promise<MonitorApiResult<ExtensionInstallResult>> {
    try {
      const result = await invoke<ExtensionInstallResult>('install_terminal_extension', { terminal })
      return okResult(result)
    } catch (err) {
      return errResult<ExtensionInstallResult>(err)
    }
  },
}
