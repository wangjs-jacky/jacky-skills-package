import { X } from 'lucide-react'
import type { Session } from '../../api/monitor'

interface SessionCardProps {
  session: Session
  onKill?: (pid: number) => void
  killing?: boolean
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

// 状态颜色映射 — 左边框 + 状态点 + 状态文字
const STATUS_STYLES: Record<string, { color: string; label: string; pulse: boolean; borderColor: string }> = {
  idle: { color: 'var(--color-text-muted)', label: '空闲', pulse: false, borderColor: 'var(--color-border)' },
  thinking: { color: 'var(--color-amber)', label: '思考中', pulse: true, borderColor: 'rgba(255, 184, 0, 0.15)' },
  executing: { color: 'var(--color-blue)', label: '执行中', pulse: false, borderColor: 'rgba(0, 212, 255, 0.15)' },
  multi_executing: { color: 'var(--color-blue)', label: '并行执行', pulse: true, borderColor: 'rgba(0, 212, 255, 0.15)' },
  waiting_input: { color: 'var(--color-amber)', label: '等待输入', pulse: true, borderColor: 'rgba(255, 184, 0, 0.15)' },
  tool_done: { color: 'var(--color-text-muted)', label: '工具完成', pulse: false, borderColor: 'var(--color-border)' },
  completed: { color: 'var(--color-primary)', label: '完成', pulse: false, borderColor: 'rgba(0, 255, 136, 0.15)' },
  error: { color: 'var(--color-red)', label: '出错', pulse: true, borderColor: 'rgba(255, 71, 87, 0.15)' },
}

export default function SessionCard({ session, onKill, killing }: SessionCardProps) {
  const duration = Date.now() - session.startedAt
  const style = STATUS_STYLES[session.status] ?? STATUS_STYLES.idle
  const hasDetails = session.cwd || session.message || (session.activeSubagents && session.activeSubagents.length > 0)

  return (
    <div
      data-testid={`session-card-${session.pid}`}
      className="rounded-[10px] overflow-hidden transition-all duration-300"
      style={{
        background: 'var(--color-bg-card)',
        border: `1px solid ${style.borderColor}`,
        borderLeftWidth: 2,
        borderLeftColor: style.color,
      }}
    >
      {/* 主行 — 横向排列所有信息 */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* 状态点 */}
        <span
          className={`w-[7px] h-[7px] rounded-full flex-shrink-0 ${style.pulse ? 'animate-pulse' : ''}`}
          style={{
            backgroundColor: style.color,
            boxShadow: style.pulse ? `0 0 6px ${style.color}` : 'none',
          }}
        />

        {/* 状态文字 */}
        <span className="font-mono text-[11px] font-semibold flex-shrink-0" style={{ color: style.color }}>
          {style.label}
        </span>

        <span className="h-3.5 w-px bg-[var(--color-border)]" />

        {/* 项目名 */}
        <span className="font-mono text-xs font-medium text-[var(--color-text)] truncate max-w-[200px]">
          {session.project}
        </span>

        <span className="h-3.5 w-px bg-[var(--color-border)]" />

        {/* 终端 */}
        <span className="font-mono text-[11px] text-[var(--color-text-muted)] flex-shrink-0">
          {TERMINAL_LABELS[session.terminal] ?? session.terminal}
        </span>

        <span className="h-3.5 w-px bg-[var(--color-border)]" />

        {/* PID */}
        <span className="font-mono text-[11px] text-[var(--color-text-muted)] flex-shrink-0">
          PID {session.pid}
        </span>

        <span className="h-3.5 w-px bg-[var(--color-border)]" />

        {/* 启动时间 */}
        <span className="font-mono text-[11px] text-[var(--color-text-muted)] flex-shrink-0">
          {formatTime(session.startedAt)}
        </span>

        <span className="h-3.5 w-px bg-[var(--color-border)]" />

        {/* 运行时长 */}
        <span className="font-mono text-[11px] text-[var(--color-text-secondary)] flex-shrink-0">
          {formatDuration(duration)}
        </span>

        <span className="h-3.5 w-px bg-[var(--color-border)]" />

        {/* 活跃工具标签 */}
        {session.activeTools && session.activeTools.length > 0 ? (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {session.activeTools.slice(0, 3).map((tool, i) => (
              <span
                key={i}
                className="px-2 py-[3px] rounded text-[9px] font-mono text-[var(--color-blue)]"
                style={{
                  background: 'rgba(0, 212, 255, 0.12)',
                  border: '1px solid rgba(0, 212, 255, 0.15)',
                }}
              >
                {tool}
              </span>
            ))}
          </div>
        ) : session.status === 'idle' ? (
          <span
            className="flex items-center gap-1 px-2 py-[3px] rounded text-[9px] font-mono text-[var(--color-text-muted)]"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--color-border)',
            }}
          >
            等待用户输入...
          </span>
        ) : null}

        {/* 弹性间隔 */}
        <div className="flex-1" />

        {/* 子代理数量 */}
        {(session.activeSubagentsCount ?? 0) > 0 && (
          <span
            className="flex items-center gap-1 px-2 py-[3px] rounded text-[10px] font-mono text-[var(--color-primary)] flex-shrink-0"
            style={{
              background: 'rgba(0, 255, 136, 0.12)',
              border: '1px solid rgba(0, 255, 136, 0.15)',
            }}
          >
            <span>🤖</span>
            <span className="font-semibold">{session.activeSubagentsCount ?? session.activeSubagents?.length ?? 0}</span>
          </span>
        )}

        {/* 关闭按钮 */}
        {onKill && (
          <button
            data-testid={`session-kill-${session.pid}`}
            onClick={() => onKill(session.pid)}
            disabled={killing}
            className="flex items-center gap-1 px-2 py-[3px] rounded text-[10px] font-mono text-[var(--color-text-muted)]
              hover:text-[var(--color-red)] transition-colors duration-200 disabled:opacity-50 flex-shrink-0"
            style={{ border: '1px solid var(--color-border)' }}
            title="关闭此会话进程"
          >
            <span>✕</span>
            <span>{killing ? '关闭中...' : '关闭'}</span>
          </button>
        )}
      </div>

      {/* 详情子行 */}
      {hasDetails && (
        <div
          data-testid={`session-detail-${session.pid}`}
          className="border-t border-[var(--color-border)] flex items-center gap-6 px-4 py-2.5"
        >
          {/* CWD */}
          {session.cwd && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="font-mono text-[10px] text-[var(--color-text-muted)]">CWD</span>
              <span className="font-mono text-[10px] text-[var(--color-text-secondary)] truncate max-w-[260px]">
                {session.cwd.replace(/^\/Users\/[^/]+/, '~')}
              </span>
            </div>
          )}

          {/* MSG */}
          {session.message && (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-mono text-[10px] text-[var(--color-text-muted)] flex-shrink-0">MSG</span>
              <span className="font-mono text-[10px] text-[var(--color-amber)] truncate">
                {session.message}
              </span>
            </div>
          )}

          {/* AGENTS */}
          {session.activeSubagents && session.activeSubagents.length > 0 && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="font-mono text-[10px] text-[var(--color-text-muted)]">AGENTS</span>
              <span className="w-[5px] h-[5px] rounded-full bg-[var(--color-primary)]" />
              <span className="font-mono text-[10px] text-[var(--color-text)]">
                {session.activeSubagents.join(', ')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
