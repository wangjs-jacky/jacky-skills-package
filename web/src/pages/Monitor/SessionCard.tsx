import type { Session } from '../../api/monitor'

interface SessionCardProps {
  session: Session
  onKill?: (pid: number) => void
  killing?: boolean
  onActivate?: (session: Session) => void
  activating?: boolean
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

const TERMINAL_LABELS: Record<string, string> = {
  vscode: 'VSCode',
  cursor: 'Cursor',
  iterm: 'iTerm',
  warp: 'Warp',
  terminal: 'Terminal',
  unknown: 'Terminal',
}

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

// 工具类别 → MSG 颜色映射
const TOOL_MSG_STYLES: Record<string, string> = {
  AskUserQuestion: 'var(--color-amber)',
  Bash: 'var(--color-blue)',
  Edit: 'var(--color-primary)',
  Write: 'var(--color-primary)',
  Read: 'var(--color-blue)',
  Grep: 'var(--color-blue)',
  Glob: 'var(--color-blue)',
  LSP: 'var(--color-blue)',
  TodoWrite: 'var(--color-text-secondary)',
  TaskCreate: 'var(--color-text-secondary)',
  TaskUpdate: 'var(--color-text-secondary)',
}

// 缩短路径显示：替换 home 目录，只保留最后两级
function shortenPath(path?: string): string {
  if (!path) return ''
  return path.replace(/^\/Users\/[^/]+/, '~').split('/').slice(-2).join('/')
}

// 从工具输入中提取可读的详情文本
function extractToolDetail(tool: string, input?: Record<string, unknown>): string {
  if (!input) return tool

  switch (tool) {
    case 'Bash': {
      const cmd = (input.command as string) || ''
      const firstLine = cmd.split('\n')[0].slice(0, 80)
      return `$ ${firstLine}`
    }
    case 'Read':
      return `→ ${shortenPath(input.file_path as string)}`
    case 'Edit':
    case 'Write':
      return `✎ ${shortenPath(input.file_path as string)}`
    case 'Grep':
      return `⊕ ${(input.pattern as string) || ''}`
    case 'Glob':
      return `⊞ ${(input.pattern as string) || ''}`
    case 'Agent':
      return `Agent: ${(input.prompt as string || '').slice(0, 60)}`
    default:
      return tool
  }
}

interface MsgStatus {
  label: string
  color: string
  visible: boolean
}

function deriveMessageStatus(session: Session): MsgStatus {
  const { status, currentTool, currentToolInput, activeSubagents, currentSubagentDescriptions, plan, message } = session

  // 优先级 1: AskUserQuestion
  if (status === 'waiting_input' || currentTool === 'AskUserQuestion') {
    const question = currentToolInput?.question as string || message || 'AskUserQuestion'
    return { label: question, color: 'var(--color-amber)', visible: true }
  }

  // 优先级 2: Plan 模式
  if (plan && (status === 'thinking' || status === 'executing' || status === 'multi_executing')) {
    return { label: `Plan ${plan.current}/${plan.total}`, color: 'var(--color-blue)', visible: true }
  }

  // 优先级 3: SubAgent 活跃（带描述）
  if (activeSubagents && activeSubagents.length > 0) {
    const display = activeSubagents
      .slice(0, 2)
      .map((agentType, i) => {
        const desc = currentSubagentDescriptions?.[i]
        // 如果描述和类型相同或描述就是类型名，只显示类型
        if (!desc || desc === agentType) return agentType
        return `${agentType}: ${desc.slice(0, 40)}`
      })
      .join(', ')
    const suffix = activeSubagents.length > 2 ? ` +${activeSubagents.length - 2}` : ''
    return { label: `SubAgent ${display}${suffix}`, color: 'var(--color-primary)', visible: true }
  }

  // 优先级 4: 当前工具（含输入详情）
  if (currentTool) {
    const detail = extractToolDetail(currentTool, currentToolInput)
    return { label: detail, color: TOOL_MSG_STYLES[currentTool] ?? 'var(--color-blue)', visible: true }
  }

  // 优先级 5: 原始消息
  if (message) {
    return { label: message, color: 'var(--color-amber)', visible: true }
  }

  // 优先级 6: 状态推导
  if (status === 'thinking') {
    return { label: 'Thinking...', color: 'var(--color-amber)', visible: true }
  }
  if (status === 'executing' || status === 'multi_executing') {
    return { label: 'Executing...', color: 'var(--color-blue)', visible: true }
  }

  return { label: '', color: 'var(--color-text-muted)', visible: false }
}

// 所有行内元素统一 14px 行高，保证图标+文字基线对齐
const LH = '14px'

export default function SessionCard({ session, onKill, killing, onActivate, activating }: SessionCardProps) {
  const duration = Date.now() - session.startedAt
  const style = STATUS_STYLES[session.status] ?? STATUS_STYLES.idle
  const isCompleted = session.status === 'completed'
  const msgStatus = deriveMessageStatus(session)
  const hasDetails = session.cwd || msgStatus.visible

  // 整个卡片可点击跳转（仅非 unknown 终端且未在激活中）
  const canActivate = !!onActivate && session.terminal !== 'unknown' && !activating

  // 完成态文字样式
  const completedStyle: React.CSSProperties = isCompleted
    ? { textDecoration: 'line-through', textDecorationColor: 'rgba(255,255,255,0.2)', opacity: 0.7 }
    : {}

  return (
    <div
      data-testid={`session-card-${session.pid}`}
      className={`group rounded-[10px] overflow-hidden transition-all duration-300
        hover:shadow-[0_4px_24px_rgba(0,0,0,0.4)]
        hover:scale-[1.005]
        ${canActivate ? 'cursor-pointer' : ''}
      `}
      style={{
        background: 'var(--color-bg-card)',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: style.borderColor,
        borderLeftWidth: 2,
        borderLeftColor: style.color,
        // hover 时左侧边框发光
        '--hover-glow': `0 0 12px ${style.color}`,
      } as React.CSSProperties}
      onMouseEnter={(e) => {
        const el = e.currentTarget
        el.style.borderLeftColor = style.color
        el.style.boxShadow = `0 0 16px ${style.color}33, inset 0 0 30px ${style.color}08`
        el.style.background = `${style.color}08`
        el.style.borderLeftColor = style.color
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.boxShadow = 'none'
        el.style.background = 'var(--color-bg-card)'
      }}
      onClick={() => canActivate && onActivate!(session)}
    >
      {/* ========== 主行 ========== */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* 状态图标 — 统一 14×14 容器 */}
        <span className="w-[14px] h-[14px] flex items-center justify-center flex-shrink-0">
          {isCompleted ? (
            <span
              className="w-[14px] h-[14px] rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(0, 255, 136, 0.15)' }}
            >
              <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6L5 8.5L9.5 3.5" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          ) : (
            <span
              className={`w-[7px] h-[7px] rounded-full ${style.pulse ? 'animate-pulse' : ''}`}
              style={{
                backgroundColor: style.color,
                boxShadow: style.pulse ? `0 0 6px ${style.color}` : 'none',
              }}
            />
          )}
        </span>

        {/* 状态文字 */}
        <span
          className="font-mono text-[11px] font-semibold flex-shrink-0"
          style={{ color: style.color, lineHeight: LH }}
        >
          {style.label}
        </span>

        <span className="h-[14px] w-px bg-[var(--color-border)] flex-shrink-0" />

        {/* 项目名 */}
        <span
          className="font-mono text-[11px] font-medium text-[var(--color-text)] truncate max-w-[200px]"
          style={{ lineHeight: LH, ...completedStyle }}
        >
          {session.project}
        </span>

        <span className="h-[14px] w-px bg-[var(--color-border)] flex-shrink-0" />

        {/* 终端 */}
        <span
          className="font-mono text-[11px] text-[var(--color-text-muted)] flex-shrink-0"
          style={{ lineHeight: LH, ...completedStyle }}
        >
          {TERMINAL_LABELS[session.terminal] ?? session.terminal}
        </span>

        <span className="h-[14px] w-px bg-[var(--color-border)] flex-shrink-0" />

        {/* PID */}
        <span
          className="font-mono text-[11px] text-[var(--color-text-muted)] flex-shrink-0"
          style={{ lineHeight: LH, ...completedStyle }}
        >
          PID {session.pid}
        </span>

        <span className="h-[14px] w-px bg-[var(--color-border)] flex-shrink-0" />

        {/* 运行时长 */}
        <span
          className="font-mono text-[11px] text-[var(--color-text-secondary)] flex-shrink-0"
          style={{ lineHeight: LH, ...completedStyle }}
        >
          {formatDuration(duration)}
        </span>

        {/* 活跃工具 */}
        {session.activeTools && session.activeTools.length > 0 ? (
          <>
            <span className="h-[14px] w-px bg-[var(--color-border)] flex-shrink-0" />
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {session.activeTools.slice(0, 3).map((tool, i) => (
                <span
                  key={i}
                  className="px-2 rounded text-[9px] font-mono text-[var(--color-blue)]"
                  style={{
                    lineHeight: LH,
                    background: 'rgba(0, 212, 255, 0.12)',
                    border: '1px solid rgba(0, 212, 255, 0.15)',
                  }}
                >
                  {tool}
                </span>
              ))}
            </div>
          </>
        ) : session.status === 'idle' ? (
          <>
            <span className="h-[14px] w-px bg-[var(--color-border)] flex-shrink-0" />
            <span
              className="px-2 rounded text-[9px] font-mono text-[var(--color-text-muted)]"
              style={{
                lineHeight: LH,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--color-border)',
              }}
            >
              等待用户输入...
            </span>
          </>
        ) : null}

        <div className="flex-1" />

        {/* 子代理数量 */}
        {(session.activeSubagentsCount ?? 0) > 0 && (
          <span
            className="flex items-center gap-1 px-2 rounded text-[10px] font-mono text-[var(--color-primary)] flex-shrink-0"
            style={{
              lineHeight: LH,
              background: 'rgba(0, 255, 136, 0.12)',
              border: '1px solid rgba(0, 255, 136, 0.15)',
            }}
          >
            <span>🤖</span>
            <span className="font-semibold">{session.activeSubagentsCount ?? session.activeSubagents?.length ?? 0}</span>
          </span>
        )}

        {/* 关闭按钮 — 始终可见，hover 变红 */}
        {onKill && (
          <button
            data-testid={`session-kill-${session.pid}`}
            onClick={(e) => { e.stopPropagation(); onKill(session.pid) }}
            disabled={killing}
            className="flex items-center gap-1 px-2 rounded text-[10px] font-mono text-[var(--color-text-muted)]
              hover:text-[var(--color-red)] transition-all duration-200 disabled:opacity-50 flex-shrink-0
              opacity-40 hover:opacity-100"
            style={{ lineHeight: LH, border: '1px solid var(--color-border)' }}
            title="关闭此会话进程"
          >
            <span>✕</span>
            <span>{killing ? '关闭中...' : '关闭'}</span>
          </button>
        )}
      </div>

      {/* ========== Plan 区块 ========== */}
      {session.plan && (
        <div
          data-testid={`session-plan-${session.pid}`}
          className="border-t border-[var(--color-border)] px-4 py-3"
        >
          {/* 标题行 */}
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-[11px] font-bold text-[var(--color-text)]" style={{ lineHeight: LH }}>
              PLAN
            </span>
            <span className="font-mono text-[11px] text-[var(--color-primary)]" style={{ lineHeight: LH }}>
              {session.plan.current}/{session.plan.total}
            </span>
          </div>

          {/* 进度条 */}
          <div
            className="w-full rounded-full overflow-hidden mb-3"
            style={{ height: '3px', background: 'rgba(255,255,255,0.06)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(session.plan.current / session.plan.total) * 100}%`,
                background: 'var(--color-primary)',
              }}
            />
          </div>

          {/* 步骤列表 — 带时间线连接 */}
          <div className="relative">
            {session.plan.steps.length > 1 && (
              <div
                className="absolute left-[6px] top-[10px] bottom-[10px] w-px"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              />
            )}
            <div className="flex flex-col gap-1.5">
              {session.plan.steps.map((step) => {
              const isDone = step.status === 'completed'
              const isActive = step.status === 'in_progress'

              return (
                <div key={step.id} className="flex items-center gap-2">
                  {/* 步骤状态图标 — 统一 14×14 容器 */}
                  <span
                    className="w-[14px] h-[14px] flex items-center justify-center flex-shrink-0 relative z-10"
                    style={{ background: 'var(--color-bg-card)' }}
                  >
                    {isDone ? (
                      // 已完成：绿色勾
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 6L5 8.5L9.5 3.5" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : isActive ? (
                      // 进行中：蓝色脉冲点
                      <span
                        className="w-[6px] h-[6px] rounded-full animate-pulse"
                        style={{ backgroundColor: 'var(--color-blue)' }}
                      />
                    ) : (
                      // 待执行：暗淡圆点
                      <span
                        className="w-[6px] h-[6px] rounded-full"
                        style={{ backgroundColor: 'var(--color-text-muted)', opacity: 0.3 }}
                      />
                    )}
                  </span>

                  {/* 步骤文字 — 完成的任务有划线 */}
                  <span
                    className="font-mono text-[11px] flex-1"
                    style={{
                      lineHeight: LH,
                      color: step.status === 'pending' ? 'var(--color-text-muted)' : 'var(--color-text)',
                      textDecoration: isDone ? 'line-through' : 'none',
                      textDecorationColor: isDone ? 'rgba(255,255,255,0.2)' : undefined,
                      opacity: isDone ? 0.6 : step.status === 'pending' ? 0.4 : 1,
                    }}
                  >
                    {step.title}
                  </span>

                  {/* 步骤耗时 */}
                  {step.duration && (
                    <span
                      className="font-mono text-[10px] flex-shrink-0"
                      style={{ lineHeight: LH, color: 'var(--color-text-muted)' }}
                    >
                      {step.duration}
                    </span>
                  )}
                </div>
              )
            })}
            </div>
          </div>
        </div>
      )}

      {/* ========== 详情子行 ========== */}
      {hasDetails && (
        <div
          data-testid={`session-detail-${session.pid}`}
          className="border-t border-[var(--color-border)] flex items-center gap-6 px-4 py-2.5"
          style={{ opacity: isCompleted ? 0.6 : 1 }}
        >
          {/* CWD */}
          {session.cwd && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="font-mono text-[10px] text-[var(--color-text-muted)]" style={{ lineHeight: LH }}>CWD</span>
              <span
                className="font-mono text-[10px] text-[var(--color-text-secondary)] truncate max-w-[260px]"
                style={{ lineHeight: LH, ...completedStyle }}
              >
                {session.cwd.replace(/^\/Users\/[^/]+/, '~')}
              </span>
            </div>
          )}

          {/* MSG -- 实时状态 */}
          {msgStatus.visible && (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-mono text-[10px] text-[var(--color-text-muted)] flex-shrink-0" style={{ lineHeight: LH }}>MSG</span>
              <span
                className="font-mono text-[10px] truncate"
                style={{ lineHeight: LH, color: msgStatus.color, ...completedStyle }}
              >
                {msgStatus.label}
              </span>
            </div>
          )}

          {/* AGENTS */}
          {session.activeSubagents && session.activeSubagents.length > 0 && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="font-mono text-[10px] text-[var(--color-text-muted)]" style={{ lineHeight: LH }}>AGENTS</span>
              <span className="w-[5px] h-[5px] rounded-full bg-[var(--color-primary)]" />
              <span
                className="font-mono text-[10px] text-[var(--color-text)] truncate max-w-[300px]"
                style={{ lineHeight: LH, ...completedStyle }}
              >
                {(session.currentSubagentDescriptions || session.activeSubagents)
                  .slice(0, 2)
                  .map((desc, i) => {
                    const agentType = session.activeSubagents![i]
                    if (!desc || desc === agentType) return agentType
                    return `${agentType}: ${desc.slice(0, 30)}`
                  })
                  .join(', ')}
                {(session.currentSubagentDescriptions || session.activeSubagents).length > 2 && ' +'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
