import { useState } from 'react'
import { AlertTriangle, Loader2, Play, Terminal, Plug, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react'
import type { MonitorApiError, MonitorCheckResult } from '../../api/monitor'

interface DaemonSetupGuideProps {
  initError?: MonitorApiError | null
  consecutiveFailures: number
  starting: boolean
  onStartDaemon: () => Promise<void>
  installingHooks: boolean
  onInstallHooks: () => Promise<void>
  hooksStatus: MonitorCheckResult | null
  onRetry: () => Promise<void>
}

export default function DaemonSetupGuide({
  initError,
  consecutiveFailures,
  starting,
  onStartDaemon,
  installingHooks,
  onInstallHooks,
  hooksStatus,
  onRetry,
}: DaemonSetupGuideProps) {
  const [guideExpanded, setGuideExpanded] = useState(true)

  return (
    <div data-testid="daemon-setup-guide" className="space-y-4 animate-fade-in">
      {/* 错误提示 */}
      {initError && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[var(--color-red)]/10 border border-[var(--color-red)]/20">
          <AlertTriangle size={16} className="text-[var(--color-red)] mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-mono text-[var(--color-red)]">初始化错误</p>
            <p className="text-xs font-mono text-[var(--color-red)]/70 mt-1">{initError.message}</p>
          </div>
        </div>
      )}

      {/* 诊断面板 */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <h3 className="text-sm font-mono font-medium text-[var(--color-text)]">状态诊断</h3>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {/* Daemon 状态 */}
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-[var(--color-red)]" />
              <Terminal size={14} className="text-[var(--color-text-muted)]" />
              <span className="text-sm font-mono text-[var(--color-text)]">Daemon</span>
              <span className="text-xs font-mono text-[var(--color-red)]">Offline</span>
            </div>
            <button
              data-testid="start-daemon-btn"
              onClick={onStartDaemon}
              disabled={starting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-medium
                bg-[var(--color-primary-dim)] border border-[var(--color-primary)]/30 text-[var(--color-primary)]
                hover:bg-[var(--color-primary)]/20 transition-all duration-300
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {starting ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Play size={12} />
              )}
              <span>{starting ? 'Starting...' : 'Start'}</span>
            </button>
          </div>

          {/* Hooks 状态 */}
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className={`w-2 h-2 rounded-full ${hooksStatus?.installed ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-red)]'}`} />
              <Plug size={14} className="text-[var(--color-text-muted)]" />
              <span className="text-sm font-mono text-[var(--color-text)]">Hooks</span>
              <span className={`text-xs font-mono ${hooksStatus?.installed ? 'text-[var(--color-primary)]' : 'text-[var(--color-amber)]'}`}>
                {hooksStatus?.installed ? 'Installed' : hooksStatus ? 'Not installed' : 'Unknown'}
              </span>
            </div>
            {!hooksStatus?.installed && (
              <button
                data-testid="install-hooks-btn"
                onClick={onInstallHooks}
                disabled={installingHooks}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-medium
                  bg-white/[0.02] border border-[var(--color-border)] text-[var(--color-text-muted)]
                  hover:bg-[var(--color-primary-dim)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)]
                  transition-all duration-300
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {installingHooks ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Plug size={12} />
                )}
                <span>{installingHooks ? 'Installing...' : 'Install'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 首次使用指引 */}
      <div className="glass-card rounded-xl overflow-hidden">
        <button
          data-testid="guide-toggle"
          onClick={() => setGuideExpanded(!guideExpanded)}
          className="w-full px-4 py-3 flex items-center gap-2 hover:bg-white/[0.02] transition-colors"
        >
          {guideExpanded ? (
            <ChevronDown size={14} className="text-[var(--color-text-muted)]" />
          ) : (
            <ChevronRight size={14} className="text-[var(--color-text-muted)]" />
          )}
          <h3 className="text-sm font-mono font-medium text-[var(--color-text)]">首次使用指引</h3>
        </button>

        {guideExpanded && (
          <div className="px-4 pb-4 space-y-3 animate-fade-in">
            <div className="space-y-2">
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-[var(--color-primary-dim)] text-[var(--color-primary)] text-xs font-mono flex items-center justify-center flex-shrink-0">
                  1
                </span>
                <div>
                  <p className="text-sm font-mono text-[var(--color-text)]">安装 claude-monitor</p>
                  <div className="mt-1.5 px-3 py-2 rounded-lg bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/10">
                    <code className="text-xs font-mono text-[var(--color-primary)]">
                      npm i -g @wangjs-jacky/claude-monitor
                    </code>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-[var(--color-primary-dim)] text-[var(--color-primary)] text-xs font-mono flex items-center justify-center flex-shrink-0">
                  2
                </span>
                <div>
                  <p className="text-sm font-mono text-[var(--color-text)]">点击上方 "Start" 启动守护进程</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-[var(--color-primary-dim)] text-[var(--color-primary)] text-xs font-mono flex items-center justify-center flex-shrink-0">
                  3
                </span>
                <div>
                  <p className="text-sm font-mono text-[var(--color-text)]">点击 "Install" 注入 Hooks 到 Claude Code</p>
                  <p className="text-xs font-mono text-[var(--color-text-muted)] mt-1">
                    这会让 Claude Code 生命周期事件上报给守护进程
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 轮询状态 */}
      {consecutiveFailures > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/[0.02] border border-[var(--color-border)]">
          <span className="flex items-center gap-2 text-xs font-mono text-[var(--color-text-muted)]">
            <Loader2 size={12} className="animate-spin text-[var(--color-primary)]" />
            后台检测守护进程状态...
          </span>
          <span className="text-[10px] font-mono text-[var(--color-text-muted)] opacity-50">
            已检测 {consecutiveFailures} 次
          </span>
        </div>
      )}

      {/* 手动重试 */}
      <div className="flex justify-center">
        <button
          data-testid="retry-init-btn"
          onClick={onRetry}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-mono text-xs
            text-[var(--color-text-muted)] hover:text-[var(--color-primary)]
            transition-colors"
        >
          <RefreshCw size={12} />
          <span>重新检测</span>
        </button>
      </div>
    </div>
  )
}
