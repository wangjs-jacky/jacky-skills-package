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
