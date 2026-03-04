import { useState } from 'react'
import { Search } from 'lucide-react'
import SkillCard from './SkillCard'
import type { SkillInfo } from '../../api/client'

interface SkillListProps {
  skills: SkillInfo[]
  onUnlink: (name: string) => void
  onToggleEnv: (name: string, env: string, enable: boolean) => void
}

export default function SkillList({ skills, onUnlink, onToggleEnv }: SkillListProps) {
  const [search, setSearch] = useState('')

  const filteredSkills = skills.filter((skill) =>
    skill.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="mb-4">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSkills.map((skill) => (
          <SkillCard key={skill.name} skill={skill} onUnlink={onUnlink} onToggleEnv={onToggleEnv} />
        ))}
      </div>
      {filteredSkills.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No skills found. Try linking one first.
        </div>
      )}
    </div>
  )
}
