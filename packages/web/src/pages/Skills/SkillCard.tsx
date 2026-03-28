import { Package, Trash2, Terminal, MousePointer2, Download } from 'lucide-react'
import type { SkillInfo } from '../../api/client'

interface SkillCardProps {
  skill: SkillInfo
  onUnlink: (name: string) => void
  onToggleEnv: (name: string, env: string, enable: boolean) => void
  onExport: (name: string) => void
}

// 支持的环境列表
const SUPPORTED_ENVS = [
  { id: 'claude-code', label: 'Claude Code', icon: Terminal },
  { id: 'cursor', label: 'Cursor', icon: MousePointer2 },
]

// 根据技能名生成颜色
function getSkillColor(name: string): { bg: string; border: string; text: string } {
  const colors = [
    { bg: 'var(--color-primary-dim)', border: 'var(--color-primary)/30', text: 'var(--color-primary)' },
    { bg: 'var(--color-blue-dim)', border: 'var(--color-blue)/30', text: 'var(--color-blue)' },
    { bg: 'var(--color-amber-dim)', border: 'var(--color-amber)/30', text: 'var(--color-amber)' },
  ]
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
  return colors[index]
}

export default function SkillCard({ skill, onUnlink, onToggleEnv, onExport }: SkillCardProps) {
  const installedEnvs = skill.installedEnvironments || []
  const colorScheme = getSkillColor(skill.name)

  return (
    <div data-testid={`skill-card-${skill.name}`} className="group relative glass-card rounded-xl overflow-hidden transition-all duration-300 hover:border-white/10 noise-overlay">
      {/* Gradient accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, transparent, ${colorScheme.text.replace('var(', '').replace(')', '')}, transparent)`,
          opacity: 0.6
        }}
      ></div>

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Icon */}
            <div
              className="flex-shrink-0 w-11 h-11 rounded-lg flex items-center justify-center border"
              style={{
                background: colorScheme.bg,
                borderColor: colorScheme.border
              }}
            >
              <Package size={20} style={{ color: colorScheme.text }} />
            </div>

            {/* Title & Source */}
            <div className="min-w-0">
              <h3 className="font-mono font-semibold text-[var(--color-text)] truncate">
                {skill.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider"
                  style={{
                    background: colorScheme.bg,
                    color: colorScheme.text,
                    border: `1px solid ${colorScheme.border}`
                  }}
                >
                  {skill.source}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              data-testid={`skill-export-btn-${skill.name}`}
              onClick={() => onExport(skill.name)}
              className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-blue)] hover:bg-[var(--color-blue-dim)] transition-all duration-200"
              title="Export"
            >
              <Download size={16} />
            </button>
            <button
              data-testid={`skill-unlink-btn-${skill.name}`}
              onClick={() => onUnlink(skill.name)}
              className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-red)] hover:bg-[var(--color-red-dim)] transition-all duration-200"
              title="Unlink"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Path */}
        <div className="mt-4 px-3 py-2 rounded-lg bg-black/30 border border-[var(--color-border)]">
          <p className="text-xs font-mono text-[var(--color-text-muted)] truncate">
            {skill.path}
          </p>
        </div>

        {/* Source Folder */}
        {skill.sourceFolder && (
          <div className="mt-2 text-xs text-[var(--color-text-muted)]">
            <span className="opacity-60">From: </span>
            <span className="font-mono">{skill.sourceFolder}</span>
          </div>
        )}

        {/* Environment toggles */}
        <div className="mt-4 flex flex-wrap gap-2">
          {SUPPORTED_ENVS.map((env) => {
            const isInstalled = installedEnvs.includes(env.id)
            const Icon = env.icon

            return (
              <button
                key={env.id}
                data-testid={`skill-env-toggle-${skill.name}-${env.id}`}
                onClick={() => onToggleEnv(skill.name, env.id, !isInstalled)}
                className={`
                  relative flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono
                  transition-all duration-300 border
                  ${isInstalled
                    ? 'bg-[var(--color-primary-dim)] border-[var(--color-primary)]/40 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20'
                    : 'bg-white/[0.02] border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-white/[0.05] hover:text-[var(--color-text)]'
                  }
                `}
              >
                <Icon size={14} />
                <span>{env.label}</span>
                {/* Status indicator */}
                <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] ${
                  isInstalled
                    ? 'bg-[var(--color-primary)]/30 text-[var(--color-primary)]'
                    : 'bg-white/5 text-[var(--color-text-muted)]'
                }`}>
                  {isInstalled ? 'ON' : 'OFF'}
                </span>

                {/* Glow effect when active */}
                {isInstalled && (
                  <div className="absolute inset-0 rounded-lg bg-[var(--color-primary)]/10 animate-pulse-glow"></div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Hover corner accent */}
      <div className="absolute top-0 right-0 w-20 h-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div
          className="absolute top-0 right-0 w-full h-full"
          style={{
            background: `radial-gradient(circle at top right, ${colorScheme.bg}, transparent 70%)`
          }}
        ></div>
      </div>
    </div>
  )
}
