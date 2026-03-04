import { Package, Trash2 } from 'lucide-react'
import type { SkillInfo } from '../../api/client'

interface SkillCardProps {
  skill: SkillInfo
  onUnlink: (name: string) => void
  onToggleEnv: (name: string, env: string, enable: boolean) => void
}

// 支持的环境列表
const SUPPORTED_ENVS = [
  { id: 'claude-code', label: 'Claude Code' },
  { id: 'cursor', label: 'Cursor' },
]

export default function SkillCard({ skill, onUnlink, onToggleEnv }: SkillCardProps) {
  const installedEnvs = skill.installedEnvironments || []

  return (
    <div className="border border-[var(--color-border)] rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Package size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-medium">{skill.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {skill.source}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUnlink(skill.name)}
            className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg text-red-600"
            title="Unlink"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 truncate">
        {skill.path}
      </div>

      {/* 环境切换按钮 */}
      <div className="mt-4 flex flex-wrap gap-2">
        {SUPPORTED_ENVS.map((env) => {
          const isInstalled = installedEnvs.includes(env.id)
          return (
            <button
              key={env.id}
              onClick={() => onToggleEnv(skill.name, env.id, !isInstalled)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isInstalled
                  ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {env.label}: {isInstalled ? 'ON' : 'OFF'}
            </button>
          )
        })}
      </div>
    </div>
  )
}
