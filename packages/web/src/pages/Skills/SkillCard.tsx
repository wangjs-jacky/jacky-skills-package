import { Package, Trash2 } from 'lucide-react'
import type { SkillInfo } from '../../api/client'

interface SkillCardProps {
  skill: SkillInfo
  onUnlink: (name: string) => void
}

export default function SkillCard({ skill, onUnlink }: SkillCardProps) {
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
      {skill.installedEnvironments && skill.installedEnvironments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {skill.installedEnvironments.map((env) => (
            <span
              key={env}
              className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs"
            >
              {env}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
