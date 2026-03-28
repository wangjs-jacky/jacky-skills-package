import { useState } from 'react'
import { Search, Package } from 'lucide-react'
import SkillCard from './SkillCard'
import type { SkillInfo } from '../../api/client'

interface SkillListProps {
  skills: SkillInfo[]
  onUnlink: (name: string) => void
  onToggleEnv: (name: string, env: string, enable: boolean) => void
  onExport: (name: string) => void
}

export default function SkillList({ skills, onUnlink, onToggleEnv, onExport }: SkillListProps) {
  const [search, setSearch] = useState('')

  const filteredSkills = skills.filter((skill) =>
    skill.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div data-testid="skills-list">
      {/* Search bar */}
      <div data-testid="skills-search-wrapper" className="mb-6">
        <div className="relative group">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors"
          />
          <input
            data-testid="skills-search-input"
            type="text"
            placeholder="Search skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.02] border border-[var(--color-border)]
                       text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]
                       font-mono text-sm focus:outline-none focus:border-[var(--color-primary)]/50
                       focus:bg-white/[0.03] transition-all duration-300"
          />
          <div className="absolute inset-0 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none">
            <div className="absolute inset-0 rounded-xl bg-[var(--color-primary)]/5 blur-xl"></div>
          </div>
        </div>
      </div>

      {/* Skills grid */}
      <div data-testid="skills-grid" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredSkills.map((skill, index) => (
          <div
            key={skill.name}
            className="animate-fade-in"
            style={{ animationDelay: `${Math.min(index * 0.05, 0.5)}s` }}
          >
            <SkillCard skill={skill} onUnlink={onUnlink} onToggleEnv={onToggleEnv} onExport={onExport} />
          </div>
        ))}
      </div>

      {/* Empty state */}
      {filteredSkills.length === 0 && (
        <div data-testid="skills-empty-state" className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-[var(--color-border)] flex items-center justify-center mb-4">
            <Package size={28} className="text-[var(--color-text-muted)]" />
          </div>
          <p className="text-[var(--color-text-muted)] font-mono text-sm">
            No skills found
          </p>
          <p className="text-[var(--color-text-muted)]/60 font-mono text-xs mt-1">
            Try linking one first with <code className="text-[var(--color-primary)]">j-skills link</code>
          </p>
        </div>
      )}
    </div>
  )
}
