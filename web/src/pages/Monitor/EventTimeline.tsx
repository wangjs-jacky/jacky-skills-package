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

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
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

      {/* 事件列表 — 带时间线连接器 */}
      <div className="relative pl-3 max-h-64 overflow-y-auto">
        {/* 垂直连接线 */}
        <div
          className="absolute left-[5px] top-2 bottom-2 w-px"
          style={{ background: 'linear-gradient(to bottom, rgba(0, 212, 255, 0.25), rgba(0, 212, 255, 0.05))' }}
        />
        <div data-testid="event-timeline-list" className="space-y-0.5">
          {events.map((event, index) => {
            const config = EVENT_LABELS[event.type] ?? { label: event.type, color: 'var(--color-text-muted)' }
            return (
              <div
                key={`${event.id ?? 'evt'}-${index}`}
                data-testid={`event-item-${index}`}
                className="flex items-center gap-3 px-3 py-1.5 rounded-md text-xs font-mono relative"
                style={{ background: 'rgba(255,255,255,0.01)' }}
              >
                {/* 时间线圆点 */}
                <span
                  className="absolute left-[-6px] w-[5px] h-[5px] rounded-full z-10"
                  style={{ backgroundColor: config.color, boxShadow: `0 0 4px ${config.color}` }}
                />
                {/* 绝对时间 */}
                <span className="text-[var(--color-text-muted)] flex-shrink-0 w-14">
                  {formatEventTime(event.timestamp)}
                </span>
                {/* 相对时间 */}
                <span className="text-[var(--color-text-muted)] flex-shrink-0 w-10 opacity-50 text-[10px]">
                  {formatRelativeTime(event.timestamp)}
                </span>
                {/* 事件类型 */}
                <span className="flex-shrink-0" style={{ color: config.color }}>
                  {config.label}
                </span>
                <span className="h-2.5 w-px bg-[var(--color-border)]" />
                {/* 项目名 */}
                <span className="text-[var(--color-text)] truncate">
                  {event.project}
                </span>
                {/* 消息 */}
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
    </div>
  )
}
