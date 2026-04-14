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
  if (events.length === 0) return null

  return (
    <div data-testid="event-timeline">
      {/* 标题栏 */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[var(--color-blue)] text-sm">◈</span>
        <span className="font-mono text-xs font-semibold text-[var(--color-text-secondary)] tracking-[2px]">
          EVENTS
        </span>
        <span
          className="flex items-center px-2 py-[2px] rounded text-[10px] font-mono font-semibold text-[var(--color-blue)]"
          style={{ background: 'rgba(0, 212, 255, 0.12)' }}
        >
          {events.length}
        </span>
      </div>

      {/* 事件列表 */}
      <div data-testid="event-timeline-list" className="space-y-0.5 max-h-64 overflow-y-auto">
        {events.map((event, index) => {
          const config = EVENT_LABELS[event.type] ?? { label: event.type, color: 'var(--color-text-muted)' }
          return (
            <div
              key={`${event.id ?? 'evt'}-${index}`}
              data-testid={`event-item-${index}`}
              className="flex items-center gap-3 px-3 py-1.5 rounded-md text-xs font-mono"
              style={{ background: 'rgba(255,255,255,0.01)' }}
            >
              <span className="text-[var(--color-text-muted)] flex-shrink-0 w-14">
                {formatEventTime(event.timestamp)}
              </span>
              <span style={{ color: config.color }} className="flex-shrink-0">▸</span>
              <span className="flex-shrink-0" style={{ color: config.color }}>
                {config.label}
              </span>
              <span className="h-2.5 w-px bg-[var(--color-border)]" />
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
    </div>
  )
}
