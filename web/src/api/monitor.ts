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
