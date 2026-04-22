import { useEffect, useState, useCallback, useRef } from 'react'
import { Loader2, WifiOff, Bell, BellOff, AlertCircle } from 'lucide-react'
import { monitorApi, type Session, type SessionEvent, type MonitorConfig, type MonitorCheckResult, type MonitorApiError, type TerminalType, type ToolCall, type SubagentCall } from '../../api/monitor'
import { useMonitorWebSocket } from '../../hooks/useMonitorWebSocket'
import { useDaemonHealth } from '../../hooks/useDaemonHealth'
import { useStore } from '../../stores'
import SessionCard from './SessionCard'
import EventTimeline from './EventTimeline'
import DaemonSetupGuide from './DaemonSetupGuide'

// ========== 状态机 ==========

type MonitorPhase =
  | { type: 'loading' }
  | { type: 'ready' }
  | { type: 'error'; error: MonitorApiError }
  | { type: 'daemon_offline' }

export default function MonitorPage() {
  const { showToast } = useStore()

  // 状态机
  const [phase, setPhase] = useState<MonitorPhase>({ type: 'loading' })
  const [daemonRunning, setDaemonRunning] = useState(false)

  // 数据
  const [sessions, setSessions] = useState<Session[]>([])
  const [events, setEvents] = useState<SessionEvent[]>([])
  const [floatingWindowEnabled, setFloatingWindowEnabled] = useState(false)
  const [hooksStatus, setHooksStatus] = useState<MonitorCheckResult | null>(null)

  // 操作中状态
  const [toggling, setToggling] = useState(false)
  const [startingDaemon, setStartingDaemon] = useState(false)
  const [installingHooks, setInstallingHooks] = useState(false)
  const [killingPid, setKillingPid] = useState<number | null>(null)
  const [activatingPid, setActivatingPid] = useState<number | null>(null)
  // 用 ref 跟踪激活状态，避免成为 useCallback 依赖导致重渲染风暴
  const activatingPidRef = useRef<number | null>(null)

  // 扩展安装缓存（终端类型 → 是否已安装），由初始化预检填充
  const extensionCacheRef = useRef<Record<string, boolean>>({})

  // 已忽略的会话 PID — 使用 Zustand 全局 store，面板切换不丢失
  const { monitorIgnoredPids, addIgnoredPid, isIgnoredPid, cleanExpiredIgnoredPids } = useStore()

  // 过滤掉已忽略的会话（清理过期条目）
  const filterIgnoredSessions = useCallback((sessions: Session[]): Session[] => {
    cleanExpiredIgnoredPids()
    return sessions.filter((s) => !isIgnoredPid(s.pid))
  }, [cleanExpiredIgnoredPids, isIgnoredPid])

  // 初始化错误（传递给 DaemonSetupGuide）
  const [initError, setInitError] = useState<MonitorApiError | null>(null)

  // WebSocket 连接（守护进程运行时自动连接）
  const { connected, reconnecting, lastError: wsError } = useMonitorWebSocket({
    enabled: daemonRunning,
    onSessionsInit: (s) => {
      const filtered = filterIgnoredSessions(s)
      setSessions(filtered)
      correctTerminalTypes(filtered)
    },
    onSessionUpdate: (session) => {
      setSessions((prev) => {
        const idx = prev.findIndex((s) => s.pid === session.pid)
        if (idx >= 0) {
          const next = [...prev]
          const existing = next[idx]
          // 如果子代理数量减少，清除描述缓存避免类型与描述错位
          const shouldClearSubagentDescs =
            session.activeSubagents &&
            existing.currentSubagentDescriptions &&
            session.activeSubagents.length < existing.currentSubagentDescriptions.length
          next[idx] = {
            ...existing,
            ...session,
            currentSubagentDescriptions: shouldClearSubagentDescs
              ? undefined
              : existing.currentSubagentDescriptions,
          }
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
    onToolStart: (sessionId, toolCall) => {
      setSessions((prev) => {
        const idx = prev.findIndex((s) => s.pid === sessionId)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = { ...next[idx], currentToolInput: toolCall.input }
          return next
        }
        return prev
      })
    },
    onToolEnd: (sessionId) => {
      setSessions((prev) => {
        const idx = prev.findIndex((s) => s.pid === sessionId)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = { ...next[idx], currentToolInput: undefined }
          return next
        }
        return prev
      })
    },
    onSubagentStart: (sessionId, subagent) => {
      setSessions((prev) => {
        const idx = prev.findIndex((s) => s.pid === sessionId)
        if (idx >= 0) {
          const next = [...prev]
          const existing = next[idx].currentSubagentDescriptions ?? []
          next[idx] = { ...next[idx], currentSubagentDescriptions: [...existing, subagent.description] }
          return next
        }
        return prev
      })
    },
    onError: (error) => {
      console.error('[monitor] WebSocket error:', error)
    },
    onReconnected: () => {
      showToast('WebSocket 已重新连接', 'success')
    },
  })

  // ========== 数据加载 ==========

  // 修正 daemon 上报的终端类型（Cursor 被误报为 VSCode）
  const correctTerminalTypes = useCallback(async (sessions: Session[]) => {
    const idePids = sessions
      .filter((s) => (s.terminal === 'vscode' || s.terminal === 'cursor') && s.pid)
      .map((s) => s.pid)
    if (idePids.length === 0) return
    try {
      const detected = await monitorApi.detectTerminals(idePids)
      if (Object.keys(detected).length > 0) {
        setSessions((prev) =>
          prev.map((s) => detected[s.pid] ? { ...s, terminal: detected[s.pid] as TerminalType } : s)
        )
      }
    } catch { /* 静默忽略 */ }
  }, [])

  const loadDaemonData = useCallback(async (showErrors = true) => {
    const results = await Promise.allSettled([
      monitorApi.getSessions(),
      monitorApi.getEvents(),
      monitorApi.getConfig(),
      monitorApi.checkHooks(),
    ])

    // Sessions
    if (results[0].status === 'fulfilled') {
      const r = results[0].value
      if (r.ok) {
        const filtered = filterIgnoredSessions(r.data)
        setSessions(filtered)
        correctTerminalTypes(filtered)
      } else if (showErrors) {
        showToast(`加载会话失败: ${r.error.message}`, 'error')
      }
    }

    // Events
    if (results[1].status === 'fulfilled') {
      const r = results[1].value
      if (r.ok) {
        setEvents(r.data.slice(-50).reverse())
      } else if (showErrors) {
        showToast(`加载事件失败: ${r.error.message}`, 'error')
      }
    }

    // Config
    if (results[2].status === 'fulfilled') {
      const r = results[2].value
      if (r.ok) {
        setFloatingWindowEnabled(r.data.floatingWindow.enabled)
      }
    }

    // Hooks
    if (results[3].status === 'fulfilled') {
      const r = results[3].value
      if (r.ok) {
        setHooksStatus(r.data)
      }
    }
  }, [showToast])

  /**
   * 触发 daemon 扫描已运行但未追踪的 Claude Code 会话
   * 发现新会话时自动刷新前端数据
   */
  const discoverSessions = useCallback(async (silent = false) => {
    const result = await monitorApi.discoverSessions()
    if (result.ok && result.data.length > 0) {
      if (!silent) showToast(`发现 ${result.data.length} 个未追踪的 Claude 终端`, 'success')
      // 发现新会话后刷新数据
      await loadDaemonData()
    }
  }, [showToast, loadDaemonData])

  // ========== 健康检查 ==========

  const { consecutiveFailures, checkNow } = useDaemonHealth({
    enabled: phase.type === 'daemon_offline' || (phase.type === 'ready' && !daemonRunning),
    onOnline: async () => {
      setDaemonRunning(true)
      setPhase({ type: 'ready' })
      await discoverSessions()
      await loadDaemonData(false)
      showToast('守护进程已上线', 'success')
    },
    onOffline: () => {
      setDaemonRunning(false)
      setPhase({ type: 'daemon_offline' })
    },
  })

  // ========== 初始化 ==========

  const init = useCallback(async () => {
    setPhase({ type: 'loading' })
    setInitError(null)

    // 步骤1：检查 daemon
    const daemonResult = await monitorApi.checkDaemon()
    if (!daemonResult.ok) {
      setInitError(daemonResult.error)
      setPhase({ type: 'error', error: daemonResult.error })
      return
    }

    if (!daemonResult.data.running) {
      // 并行加载 hooks 状态和 config
      const [hooksResult, configResult] = await Promise.all([
        monitorApi.checkHooks(),
        monitorApi.getConfig(),
      ])
      if (hooksResult.ok) setHooksStatus(hooksResult.data)
      if (configResult.ok) setFloatingWindowEnabled(configResult.data.floatingWindow.enabled)

      setPhase({ type: 'daemon_offline' })
      return
    }

    // 步骤2：daemon 在线，先扫描历史终端再加载数据
    setDaemonRunning(true)
    await discoverSessions(true)
    await loadDaemonData()

    // 步骤2.5：自动安装 hooks（daemon 在线但 hooks 未安装时静默注入）
    // hooks 注入后，已运行的 Claude Code 下次触发事件时也会生效
    const hooksResult = await monitorApi.checkHooks()
    if (hooksResult.ok && !hooksResult.data.installed) {
      const installResult = await monitorApi.installHooks()
      if (installResult.ok && installResult.data.success) {
        setHooksStatus({ installed: true, hooksDirExists: true })
        // hooks 安装后重新扫描，捕获所有正在运行的 Claude Code
        await discoverSessions(true)
        await loadDaemonData()
      }
    } else if (hooksResult.ok) {
      setHooksStatus(hooksResult.data)
    }

    setPhase({ type: 'ready' })

    // 步骤3：后台预检 IDE 扩展（填充前端 + Rust 双重缓存）
    const ideTerminals = ['vscode', 'cursor']
    ideTerminals.forEach((t) => {
      monitorApi.checkTerminalExtension(t)
        .then((r) => {
          if (r.ok) extensionCacheRef.current[t] = r.data.installed
        })
        .catch(() => {})
    })
  }, [loadDaemonData, discoverSessions])

  useEffect(() => {
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ========== 操作 ==========

  const handleStartDaemon = useCallback(async () => {
    setStartingDaemon(true)
    try {
      const result = await monitorApi.startDaemon()
      if (result.ok && result.data.running) {
        setDaemonRunning(true)
        // daemon 启动后会自动扫描，但这里再触发一次确保前端拿到最新数据
        await discoverSessions(true)
        await loadDaemonData()
        // 自动安装 hooks
        const hooksResult = await monitorApi.checkHooks()
        if (hooksResult.ok && !hooksResult.data.installed) {
          const installResult = await monitorApi.installHooks()
          if (installResult.ok && installResult.data.success) {
            setHooksStatus({ installed: true, hooksDirExists: true })
            await discoverSessions(true)
            await loadDaemonData()
          }
        }
        setPhase({ type: 'ready' })
        showToast('守护进程已启动', 'success')
        // 后台预检 IDE 扩展
        ;['vscode', 'cursor'].forEach((t) => {
          monitorApi.checkTerminalExtension(t)
            .then((r) => {
              if (r.ok) extensionCacheRef.current[t] = r.data.installed
            })
            .catch(() => {})
        })
      } else if (result.ok && !result.data.running) {
        showToast('启动失败：daemon 仍未响应，请确认已安装 claude-monitor', 'error')
      } else if (!result.ok) {
        showToast(`启动失败: ${result.error.message}`, 'error')
      }
    } catch {
      showToast('启动守护进程失败', 'error')
    } finally {
      setStartingDaemon(false)
    }
  }, [loadDaemonData, showToast, discoverSessions])

  const handleInstallHooks = useCallback(async () => {
    setInstallingHooks(true)
    try {
      const result = await monitorApi.installHooks()
      if (result.ok && result.data.success) {
        setHooksStatus({ installed: true, hooksDirExists: true })
        showToast('Hooks 安装成功', 'success')
      } else if (!result.ok) {
        showToast(`Hooks 安装失败: ${result.error.message}`, 'error')
      } else {
        showToast('Hooks 安装失败', 'error')
      }
    } catch {
      showToast('Hooks 安装失败', 'error')
    } finally {
      setInstallingHooks(false)
    }
  }, [showToast])

  const handleToggleFloatingWindow = useCallback(async () => {
    setToggling(true)
    try {
      const newConfig: MonitorConfig = {
        floatingWindow: { enabled: !floatingWindowEnabled },
      }
      const result = await monitorApi.setConfig(newConfig)
      if (result.ok) {
        setFloatingWindowEnabled(!floatingWindowEnabled)
        showToast(
          floatingWindowEnabled ? '悬浮弹窗已关闭' : '悬浮弹窗已开启',
          'success',
        )
      } else {
        showToast('切换悬浮弹窗失败', 'error')
      }
    } catch {
      showToast('切换悬浮弹窗失败', 'error')
    } finally {
      setToggling(false)
    }
  }, [floatingWindowEnabled, showToast])

  const handleKillSession = useCallback(async (pid: number) => {
    setKillingPid(pid)
    try {
      const result = await monitorApi.killSession(pid)
      if (result.ok) {
        addIgnoredPid(pid)
        setSessions((prev) => prev.filter((s) => s.pid !== pid))
        showToast('会话已关闭', 'success')
      } else {
        showToast(`关闭会话失败: ${result.error.message}`, 'error')
      }
    } catch {
      showToast('关闭会话失败', 'error')
    } finally {
      setKillingPid(null)
    }
  }, [showToast])

  const handleActivateSession = useCallback(async (session: Session) => {
    // 用 ref 防止重复点击（不作为 useCallback 依赖，避免重渲染风暴）
    if (activatingPidRef.current !== null) return
    activatingPidRef.current = session.pid
    setActivatingPid(session.pid)

    // 安全超时：即使 Rust invoke 阻塞，也能重置状态避免 UI 卡死
    const safetyTimeout = setTimeout(() => {
      activatingPidRef.current = null
      setActivatingPid(null)
    }, 8000)

    try {
      const isIde = session.terminal === 'vscode' || session.terminal === 'cursor'

      // 乐观跳转：缓存为 true 时直接跳转，缓存为 false/undefined 时也尝试跳转
      // 扩展可能已被用户手动安装，不应仅凭缓存拦截
      const result = await monitorApi.activateTerminal(session.terminal, session.project, session.ppid, session.cwd)
      if (result.ok && result.data.success) {
        extensionCacheRef.current[session.terminal] = true
        showToast('已跳转到终端窗口', 'success')
      } else if (!result.ok) {
        // 跳转失败：IDE 终端提示安装扩展，非 IDE 终端显示错误
        if (isIde) {
          const terminalLabel = session.terminal === 'vscode' ? 'VSCode' : 'Cursor'
          showToast(
            `跳转失败，需要安装 focus-terminal 扩展才能精准跳转 ${terminalLabel} 终端`,
            'warning',
            {
              action: {
                label: '安装',
                onClick: async () => {
                  const installResult = await monitorApi.installTerminalExtension(session.terminal)
                  if (installResult.ok && installResult.data.success) {
                    extensionCacheRef.current[session.terminal] = true
                    showToast(`${terminalLabel} 扩展安装成功`, 'success')
                  } else {
                    const msg = installResult.ok ? installResult.data.message : installResult.error.message
                    showToast(`安装失败: ${msg}`, 'error')
                  }
                },
              },
            },
          )
        } else {
          showToast(`跳转失败: ${result.error.message}`, 'error')
        }
      }
    } finally {
      clearTimeout(safetyTimeout)
      activatingPidRef.current = null
      setActivatingPid(null)
    }
  }, [showToast])

  // ========== 渲染 ==========

  // 加载态
  if (phase.type === 'loading') {
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

  // 初始化错误态
  if (phase.type === 'error') {
    return (
      <div data-testid="monitor-error" className="relative z-10 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" style={{ boxShadow: '0 0 8px rgba(0,255,136,0.4)' }} />
            <span className="font-mono text-lg font-bold tracking-[3px] text-[var(--color-text)]">MONITOR</span>
            <span className="h-4 w-px bg-[rgba(255,255,255,0.1)]" />
            <span className="font-mono text-xs text-[var(--color-text-muted)]">Claude Code Session Tracker</span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-16 h-16 rounded-full bg-[var(--color-red)]/10 flex items-center justify-center">
            <AlertCircle size={24} className="text-[var(--color-red)]" />
          </div>
          <p className="text-sm font-mono text-[var(--color-red)]">初始化失败</p>
          <p className="text-xs font-mono text-[var(--color-text-muted)]">{phase.error.message}</p>
          <button
            onClick={init}
            className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-lg font-mono text-xs
              bg-[var(--color-primary-dim)] border border-[var(--color-primary)]/30 text-[var(--color-primary)]
              hover:bg-[var(--color-primary)]/20 transition-all duration-300"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  // Daemon 离线态
  if (phase.type === 'daemon_offline' || !daemonRunning) {
    return (
      <div data-testid="monitor-page" className="relative z-10 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" style={{ boxShadow: '0 0 8px rgba(0,255,136,0.4)' }} />
            <span className="font-mono text-lg font-bold tracking-[3px] text-[var(--color-text)]">MONITOR</span>
            <span className="h-4 w-px bg-[rgba(255,255,255,0.1)]" />
            <span className="font-mono text-xs text-[var(--color-text-muted)]">Claude Code Session Tracker</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--color-text-muted)]">
              <WifiOff size={10} />
              Daemon: Offline
            </span>
          </div>
        </div>

        <DaemonSetupGuide
          initError={initError}
          consecutiveFailures={consecutiveFailures}
          starting={startingDaemon}
          onStartDaemon={handleStartDaemon}
          installingHooks={installingHooks}
          onInstallHooks={handleInstallHooks}
          hooksStatus={hooksStatus}
          onRetry={async () => {
            const online = await checkNow()
            if (online) {
              setDaemonRunning(true)
              setPhase({ type: 'ready' })
              await discoverSessions()
              await loadDaemonData()
              showToast('守护进程已上线', 'success')
            }
          }}
        />
      </div>
    )
  }

  // 正常态 (phase.type === 'ready' && daemonRunning)

  // 统计计算
  const totalSubagents = sessions.reduce((sum, s) => sum + (s.activeSubagentsCount ?? s.activeSubagents?.length ?? 0), 0)
  const totalActiveTools = sessions.reduce((sum, s) => sum + (s.activeToolsCount ?? s.activeTools?.length ?? 0), 0)

  return (
    <div
      data-testid="monitor-page"
      className="relative z-10 animate-fade-in"
      style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span
            className="w-2 h-2 rounded-full bg-[var(--color-primary)] flex-shrink-0"
            style={{ boxShadow: '0 0 8px rgba(0,255,136,0.4)' }}
          />
          <span className="font-mono text-lg font-bold tracking-[3px] text-[var(--color-text)]">MONITOR</span>
          <span className="h-4 w-px bg-[rgba(255,255,255,0.1)]" />
          <span className="font-mono text-xs text-[var(--color-text-muted)]">Claude Code Session Tracker</span>
        </div>

        <div className="flex items-center gap-4">
          {/* 连接状态 — 合并 WebSocket + Daemon */}
          <span
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono text-[var(--color-primary)]"
            style={{
              background: 'rgba(0, 255, 136, 0.12)',
              border: '1px solid rgba(0, 255, 136, 0.15)',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-pulse" />
            {connected ? 'LIVE' : 'ONLINE'}
          </span>

          {/* 悬浮弹窗开关 */}
          <button
            data-testid="floating-window-toggle"
            onClick={handleToggleFloatingWindow}
            disabled={toggling}
            className={`
              flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono
              border transition-all duration-300
              ${floatingWindowEnabled
                ? 'bg-[var(--color-primary-dim)] border-[var(--color-primary)]/30 text-[var(--color-primary)]'
                : 'bg-white/[0.03] border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-primary-dim)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)]'
              }
              disabled:opacity-50
            `}
          >
            {toggling ? (
              <Loader2 size={10} className="animate-spin" />
            ) : floatingWindowEnabled ? (
              <span>🔔</span>
            ) : (
              <span>🔕</span>
            )}
            <span>悬浮弹窗: {floatingWindowEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* 重连中 */}
          {reconnecting && (
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--color-amber)]">
              <Loader2 size={10} className="animate-spin" />
              Reconnecting...
            </span>
          )}

          {/* WS 错误 */}
          {wsError && (
            <span className="text-[10px] font-mono text-[var(--color-amber)]">{wsError}</span>
          )}
        </div>
      </div>

      {/* Stats Bar — 独立卡片式设计 */}
      <div data-testid="monitor-stats" className="grid grid-cols-3 gap-3 mb-5">
        {/* Sessions */}
        <div
          className="relative overflow-hidden rounded-xl px-4 py-3"
          style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-2xl font-bold text-[var(--color-primary)]">{sessions.length}</div>
              <div className="font-mono text-[10px] text-[var(--color-text-muted)] tracking-wider mt-0.5">ACTIVE SESSIONS</div>
            </div>
            <span className="text-xl opacity-40">⚡</span>
          </div>
          <div
            className="absolute bottom-0 left-0 right-0 h-[1px]"
            style={{ background: 'linear-gradient(90deg, var(--color-primary), transparent)' }}
          />
        </div>

        {/* Subagents */}
        <div
          className="relative overflow-hidden rounded-xl px-4 py-3"
          style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-2xl font-bold text-[var(--color-blue)]">{totalSubagents}</div>
              <div className="font-mono text-[10px] text-[var(--color-text-muted)] tracking-wider mt-0.5">SUBAGENTS</div>
            </div>
            <span className="text-xl opacity-40">🤖</span>
          </div>
          <div
            className="absolute bottom-0 left-0 right-0 h-[1px]"
            style={{ background: 'linear-gradient(90deg, var(--color-blue), transparent)' }}
          />
        </div>

        {/* Active Tools */}
        <div
          className="relative overflow-hidden rounded-xl px-4 py-3"
          style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-2xl font-bold text-[var(--color-amber)]">{totalActiveTools}</div>
              <div className="font-mono text-[10px] text-[var(--color-text-muted)] tracking-wider mt-0.5">ACTIVE TOOLS</div>
            </div>
            <span className="text-xl opacity-40">🔧</span>
          </div>
          <div
            className="absolute bottom-0 left-0 right-0 h-[1px]"
            style={{ background: 'linear-gradient(90deg, var(--color-amber), transparent)' }}
          />
        </div>
      </div>

      {/* Sessions Section */}
      <div className="mb-6">
        {/* Section Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[var(--color-primary)] text-sm">◉</span>
          <span className="font-mono text-xs font-semibold text-[var(--color-text-secondary)] tracking-[2px]">SESSIONS</span>
          {sessions.length > 0 && (
            <span
              className="flex items-center px-2 py-[2px] rounded text-[10px] font-mono font-semibold text-[var(--color-primary)]"
              style={{ background: 'rgba(0, 255, 136, 0.12)' }}
            >
              {sessions.length}
            </span>
          )}
        </div>

        {/* Session Rows — 全宽行式布局 */}
        {sessions.length > 0 ? (
          <div data-testid="session-grid" className="flex flex-col gap-2">
            {sessions.map((session) => (
              <SessionCard
                key={session.pid}
                session={session}
                onKill={handleKillSession}
                killing={killingPid === session.pid}
                onActivate={handleActivateSession}
                activating={activatingPid === session.pid}
              />
            ))}
          </div>
        ) : (
          <div data-testid="no-sessions" className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-16 h-16 rounded-full bg-[var(--color-primary-dim)] flex items-center justify-center">
              <span className="text-2xl opacity-50">⚡</span>
            </div>
            <p className="text-sm font-mono text-[var(--color-text-muted)]">
              No active sessions
            </p>
            <p className="text-xs font-mono text-[var(--color-text-muted)] opacity-50">
              Start a new Claude Code session to see it here
            </p>
          </div>
        )}
      </div>

      {/* 事件时间线 */}
      <EventTimeline events={events} />
    </div>
  )
}
