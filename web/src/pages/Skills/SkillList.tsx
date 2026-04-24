import { useState, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Search, Package } from 'lucide-react'
import SkillCard from './SkillCard'
import type { SkillInfo, EnvironmentInfo } from '../../api/client'

interface SkillListProps {
  skills: SkillInfo[]
  environments: EnvironmentInfo[]
  onUnlink?: (name: string) => void
  onToggleEnv: (name: string, env: string, enable: boolean) => void
  onExport?: (name: string) => void
  onViewContent: (name: string) => void
  onRemove?: (name: string) => void
  isExternal?: boolean
}

export default function SkillList({ skills, environments, onUnlink, onToggleEnv, onExport, onViewContent, onRemove, isExternal }: SkillListProps) {
  const [search, setSearch] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  const filteredSkills = useMemo(() =>
    skills.filter((skill) =>
      skill.name.toLowerCase().includes(search.toLowerCase())
    ),
    [skills, search]
  )

  // 将 skills 按 2 列分组为行
  const rows = useMemo(() => {
    const result: SkillInfo[][] = []
    for (let i = 0; i < filteredSkills.length; i += 2) {
      result.push(filteredSkills.slice(i, i + 2))
    }
    return result
  }, [filteredSkills])

  // 使用 useVirtualizer，找到 Layout 的 <main> 滚动容器
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => listRef.current?.closest('main') ?? null,
    estimateSize: () => 260,
    overscan: 5,
  })

  const virtualItems = virtualizer.getVirtualItems()

  // 计算可见区域前后的空白占位高度
  const spaceBefore = virtualItems.length > 0 ? virtualItems[0].start : 0
  const spaceAfter = virtualItems.length > 0
    ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
    : 0

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

      {/* Virtualized skills grid — 使用 spacer 占位代替 absolute 定位 */}
      {rows.length > 0 && (
        <div ref={listRef} data-testid="skills-grid">
          {/* 顶部占位：撑起未渲染的上半部分 */}
          {spaceBefore > 0 && <div style={{ height: spaceBefore }} />}

          {virtualItems.map((virtualRow) => {
            const rowSkills = rows[virtualRow.index]

            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                className="grid grid-cols-2 gap-4 mb-4"
              >
                {rowSkills.map((skill) => (
                  <SkillCard
                    key={skill.name}
                    skill={skill}
                    environments={environments}
                    onUnlink={onUnlink}
                    onToggleEnv={onToggleEnv}
                    onExport={onExport}
                    onViewContent={onViewContent}
                    onRemove={onRemove}
                    isExternal={isExternal}
                  />
                ))}
                {/* 最后一行只有 1 个 skill 时补空占位保持对齐 */}
                {rowSkills.length === 1 && <div />}
              </div>
            )
          })}

          {/* 底部占位：撑起未渲染的下半部分 */}
          {spaceAfter > 0 && <div style={{ height: spaceAfter }} />}
        </div>
      )}

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
