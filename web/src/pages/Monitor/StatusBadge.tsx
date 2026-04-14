import type { SessionStatus } from '../../api/monitor'

interface StatusBadgeProps {
  status: SessionStatus
  showLabel?: boolean
}

const STATUS_CONFIG: Record<SessionStatus, { label: string; color: string; pulse: boolean }> = {
  idle: { label: '空闲', color: 'var(--color-text-muted)', pulse: false },
  thinking: { label: '思考中', color: 'var(--color-amber)', pulse: true },
  executing: { label: '执行中', color: 'var(--color-blue)', pulse: false },
  multi_executing: { label: '并行执行', color: 'var(--color-blue)', pulse: true },
  waiting_input: { label: '等待输入', color: 'var(--color-amber)', pulse: true },
  tool_done: { label: '工具完成', color: 'var(--color-text-muted)', pulse: false },
  completed: { label: '完成', color: 'var(--color-primary)', pulse: false },
  error: { label: '出错', color: 'var(--color-red)', pulse: true },
}

export default function StatusBadge({ status, showLabel = true }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.idle

  return (
    <span
      data-testid={`status-badge-${status}`}
      className="inline-flex items-center gap-1.5 text-xs"
    >
      <span
        className={`w-2 h-2 rounded-full ${config.pulse ? 'animate-pulse' : ''}`}
        style={{ backgroundColor: config.color, boxShadow: config.pulse ? `0 0 6px ${config.color}` : 'none' }}
      />
      {showLabel && (
        <span className="text-xs" style={{ color: config.color }}>{config.label}</span>
      )}
    </span>
  )
}
