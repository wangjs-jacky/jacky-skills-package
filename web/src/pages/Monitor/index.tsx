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
