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
