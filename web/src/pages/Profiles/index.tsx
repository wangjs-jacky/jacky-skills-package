import { useEffect, useState, useCallback, useRef } from 'react'
import { useStore } from '../../stores'
import { profilesApi, type ProfileInfo, type ConflictGroup } from '../../api/client'
import { Layers, Plus, Trash2, Star, X, Zap, AlertTriangle, Loader2, Package, Pencil, Search, ChevronsRight } from 'lucide-react'

const STORAGE_KEY = 'j-skills-profiles-panel-width'
const DEFAULT_WIDTH = 320
const MIN_EXPANDED = 200
const COLLAPSED_WIDTH = 48

function loadPanelState(): { width: number; collapsed: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { width: DEFAULT_WIDTH, collapsed: false }
}

function savePanelState(state: { width: number; collapsed: boolean }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export default function ProfilesPage() {
  const { profiles, skills, config, activeProfile, setActiveProfile, showToast, loadProfiles } = useStore()
  const [selectedProfile, setSelectedProfile] = useState<ProfileInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [conflicts, setConflicts] = useState<ConflictGroup[]>([])
  const [conflictResolution, setConflictResolution] = useState<Record<string, string>>({})
  const [switching, setSwitching] = useState(false)
  const [showSwitchLoading, setShowSwitchLoading] = useState(false)
  const [editingField, setEditingField] = useState<'name' | 'description' | null>(null)
  const [editValue, setEditValue] = useState('')

  // ── 拖拽面板状态 ──
  const [panelState, setPanelState] = useState(loadPanelState)
  const dragging = useRef(false)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(0)
  const startedCollapsed = useRef(false)
  // 拖拽中的实时宽度（拖拽结束后才 commit 到 panelState）
  const [dragWidth, setDragWidth] = useState<number | null>(null)

  // ── 搜索状态 (2.1) ──
  const [skillSearch, setSkillSearch] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    await loadProfiles()
    if (!selectedProfile) {
      const active = useStore.getState().profiles.find(p => p.isActive)
      if (active) setSelectedProfile(active)
    }
    setLoading(false)
  }

  // ── 拖拽事件处理 ──
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    dragStartX.current = e.clientX
    dragStartWidth.current = panelState.collapsed ? COLLAPSED_WIDTH : panelState.width
    startedCollapsed.current = panelState.collapsed
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
    // 进入拖拽态，用 dragWidth 接管宽度
    setDragWidth(dragStartWidth.current)
  }, [panelState])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const delta = e.clientX - dragStartX.current
      const newWidth = Math.max(COLLAPSED_WIDTH, dragStartWidth.current + delta)
      setDragWidth(newWidth)
    }

    const handleMouseUp = () => {
      if (!dragging.current) return
      dragging.current = false
      document.body.style.userSelect = ''
      document.body.style.cursor = ''

      setDragWidth(currentDrag => {
        if (currentDrag === null) return null
        const finalWidth = currentDrag

        setPanelState(() => {
          // 从折叠态向右拖开 → 展开到至少 DEFAULT_WIDTH
          if (startedCollapsed.current && finalWidth > COLLAPSED_WIDTH + 30) {
            const width = Math.max(DEFAULT_WIDTH, finalWidth)
            const newState = { width, collapsed: false }
            savePanelState(newState)
            return newState
          }
          // 从展开态向左拖窄 → snap 折叠
          if (!startedCollapsed.current && finalWidth < MIN_EXPANDED) {
            const newState = { width: COLLAPSED_WIDTH, collapsed: true }
            savePanelState(newState)
            return newState
          }
          // 正常范围
          const newState = { width: Math.max(MIN_EXPANDED, finalWidth), collapsed: false }
          savePanelState(newState)
          return newState
        })
        return null // 退出拖拽态
      })
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  // (1.4) 折叠态点击图标 → 选中并展开
  const handleCollapsedClick = useCallback((p: ProfileInfo) => {
    setSelectedProfile(p)
    setConflicts([])
    const prevState = loadPanelState()
    const expandWidth = prevState.width < MIN_EXPANDED ? DEFAULT_WIDTH : prevState.width
    const newState = { width: expandWidth, collapsed: false }
    setPanelState(newState)
    savePanelState(newState)
  }, [])

  async function handleCreate() {
    if (!newName.trim()) return
    const res = await profilesApi.create({ name: newName.trim(), description: newDesc.trim() || undefined })
    if (res.success) {
      showToast(`Profile "${newName}" created`, 'success')
      setShowCreate(false); setNewName(''); setNewDesc('')
      await loadProfiles(); setSelectedProfile(res.data)
    } else showToast(res.error || 'Create failed', 'error')
  }

  async function handleDelete(name: string) {
    const res = await profilesApi.delete(name)
    if (res.success) {
      showToast(`Profile "${name}" deleted`, 'success')
      if (selectedProfile?.name === name) setSelectedProfile(null)
      await loadProfiles()
    } else showToast(res.error || 'Delete failed', 'error')
    setShowDeleteConfirm(null)
  }

  async function handleSetActive(name: string) {
    const res = await profilesApi.setActive(name)
    if (res.success) { setActiveProfile(res.data); showToast(`Activated "${name}"`, 'success'); await loadProfiles() }
    else showToast(res.error || 'Activate failed', 'error')
  }

  async function handleToggleSkill(skillName: string) {
    if (!selectedProfile) return
    const isInProfile = selectedProfile.skills.include.includes(skillName)
    const res = isInProfile
      ? await profilesApi.removeSkill(selectedProfile.name, skillName)
      : await profilesApi.addSkill(selectedProfile.name, skillName)
    if (res.success) { setSelectedProfile(res.data); await loadProfiles() }
    else showToast(res.error || 'Update failed', 'error')
  }

  async function handleSaveEdit() {
    if (!selectedProfile || !editingField || !editValue.trim()) { setEditingField(null); return }
    if (editingField === 'name') {
      if (editValue.trim() === selectedProfile.name) { setEditingField(null); return }
      const res = await profilesApi.rename(selectedProfile.name, editValue.trim())
      if (res.success) { setSelectedProfile(res.data); await loadProfiles(); showToast('Renamed', 'success') }
      else showToast(res.error || 'Rename failed', 'error')
    } else {
      const res = await profilesApi.update(selectedProfile.name, { description: editValue.trim() })
      if (res.success) { setSelectedProfile(res.data); await loadProfiles(); showToast('Updated', 'success') }
      else showToast(res.error || 'Update failed', 'error')
    }
    setEditingField(null)
  }

  async function handleSelectAll() {
    if (!selectedProfile) return
    const toAdd = skills.filter(s => !selectedProfile.skills.include.includes(s.name)).map(s => s.name)
    for (const name of toAdd) {
      const res = await profilesApi.addSkill(selectedProfile.name, name)
      if (res.success) setSelectedProfile(res.data)
    }
    await loadProfiles()
  }

  async function handleDeselectAll() {
    if (!selectedProfile) return
    const toRemove = [...selectedProfile.skills.include]
    for (const name of toRemove) {
      const res = await profilesApi.removeSkill(selectedProfile.name, name)
      if (res.success) setSelectedProfile(res.data)
    }
    await loadProfiles()
  }

  async function handleSwitch() {
    if (!selectedProfile) return
    const envs = config.defaultEnvironments || []
    if (envs.length === 0) { showToast('No default environments configured. Go to Settings first.', 'warning'); return }
    setSwitching(true); setShowSwitchLoading(false); setConflicts([])
    // 延迟 300ms 后才显示 loading 弹窗，避免快速完成时闪烁
    const timer = setTimeout(() => setShowSwitchLoading(true), 300)
    const res = await profilesApi.switchProfile(
      selectedProfile.name, envs, false,
      Object.keys(conflictResolution).length > 0 ? conflictResolution : undefined
    )
    clearTimeout(timer)
    setShowSwitchLoading(false)
    if (res.success) {
      if (res.data.conflicts.length > 0 && Object.keys(conflictResolution).length === 0) setConflicts(res.data.conflicts)
      const hasFails = res.data.failed.length > 0
      showToast(
        hasFails
          ? `Switched with errors: ${res.data.failed.length} failed`
          : `Switched: ${res.data.installed.length} installed, ${res.data.uninstalled.length} uninstalled`,
        hasFails ? 'warning' : 'success'
      )
      await loadProfiles()
      const updated = useStore.getState().profiles.find(p => p.name === selectedProfile.name)
      if (updated) setSelectedProfile(updated)
    } else showToast(res.error || 'Switch failed', 'error')
    setSwitching(false)
  }

  // (2.2) 搜索过滤
  const filteredSkills = skillSearch.trim()
    ? skills.filter(s =>
        s.name.toLowerCase().includes(skillSearch.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(skillSearch.toLowerCase()))
      )
    : skills

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 text-[var(--color-primary)] animate-spin" /></div>

  // 拖拽中用 dragWidth，否则用 panelState
  const isCollapsed = dragWidth === null && panelState.collapsed
  const currentPanelWidth = dragWidth !== null
    ? Math.max(COLLAPSED_WIDTH, dragWidth)
    : (panelState.collapsed ? COLLAPSED_WIDTH : Math.max(MIN_EXPANDED, panelState.width))

  return (
    <div className="h-full flex overflow-hidden">
      {/* 左侧 Profile 列表 — 可拖拽宽度 */}
      <div
        className="border-r border-[var(--color-border)] flex flex-col shrink-0 overflow-hidden"
        style={{ width: currentPanelWidth, transition: dragWidth !== null ? 'none' : 'width 0.2s ease' }}
      >
        {/* 标题栏 */}
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Layers size={18} className="text-[var(--color-primary)] shrink-0" />
            {!isCollapsed && (
              <>
                <h2 className="font-mono font-bold text-sm">Profiles</h2>
                <span className="text-[10px] text-[var(--color-text-muted)] font-mono">{profiles.length}</span>
              </>
            )}
          </div>
          {!isCollapsed && (
            <button onClick={() => setShowCreate(true)} className="p-1.5 rounded-md hover:bg-white/5 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"><Plus size={16} /></button>
          )}
        </div>

        {/* 折叠态：展开按钮 */}
        {isCollapsed && (
          <div className="flex justify-center py-2">
            <button
              onClick={() => {
                const prevState = loadPanelState()
                const expandWidth = prevState.width < MIN_EXPANDED ? DEFAULT_WIDTH : prevState.width
                const newState = { width: expandWidth, collapsed: false }
                setPanelState(newState)
                savePanelState(newState)
              }}
              className="p-1.5 rounded-md hover:bg-[var(--color-primary-dim)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
              title="Expand panel"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        )}

        {/* Profile 列表 */}
        <div className={`flex-1 ${isCollapsed ? 'overflow-hidden' : 'overflow-y-auto'} p-2 space-y-1`}>
          {profiles.length === 0 && !isCollapsed && (
            <div className="text-center py-12 text-[var(--color-text-muted)] text-sm">
              <Layers size={32} className="mx-auto mb-3 opacity-30" />
              <p>No profiles yet</p><p className="text-xs mt-1">Click + to create one</p>
            </div>
          )}
          {profiles.map((p) => (
            isCollapsed ? (
              // (1.5) 折叠态：仅图标，点击展开
              <button
                key={p.name}
                onClick={() => handleCollapsedClick(p)}
                className={`w-full flex justify-center py-2.5 rounded-lg transition-all relative group/collapse ${selectedProfile?.name === p.name ? 'bg-[var(--color-primary-dim)]' : 'hover:bg-white/[0.03]'}`}
                title={p.name}
              >
                {selectedProfile?.name === p.name && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[var(--color-primary)] rounded-r-full" />}
                {p.isActive ? <Star size={16} className="text-[var(--color-amber)] fill-[var(--color-amber)]" /> : <Star size={16} className="text-[var(--color-text-muted)] opacity-40" />}
                <span className="absolute left-full ml-2 px-2 py-1 rounded bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[11px] font-mono whitespace-nowrap opacity-0 group-hover/collapse:opacity-100 transition-opacity pointer-events-none z-10">{p.name}</span>
              </button>
            ) : (
              // 展开态：完整列表项
              <button key={p.name} onClick={() => { setSelectedProfile(p); setConflicts([]) }}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all group relative ${selectedProfile?.name === p.name ? 'bg-[var(--color-primary-dim)] text-[var(--color-primary)]' : 'hover:bg-white/[0.03] text-[var(--color-text)]'}`}>
                {selectedProfile?.name === p.name && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[var(--color-primary)] rounded-r-full" />}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    {p.isActive ? <Star size={14} className="text-[var(--color-amber)] shrink-0 fill-[var(--color-amber)]" /> : <Star size={14} className="text-[var(--color-text-muted)] shrink-0 opacity-40" />}
                    <span className="font-medium text-sm truncate">{p.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--color-text-muted)] shrink-0">{p.skillCount}</span>
                </div>
                {p.description && <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 truncate pl-[22px]">{p.description}</p>}
              </button>
            )
          ))}
        </div>
      </div>

      {/* 拖拽把手 */}
      <div
        className="w-2 shrink-0 cursor-col-resize group/handle relative flex items-center justify-center"
        onMouseDown={handleMouseDown}
      >
        {/* 中间装饰线 */}
        <div className="w-[3px] h-8 rounded-full bg-[var(--color-border)] group-hover/handle:bg-[var(--color-primary)]/50 group-hover/handle:h-12 transition-all duration-200" />
        {/* hover 时左右发光 */}
        <div className="absolute inset-y-0 -left-px w-1 bg-gradient-to-r from-transparent to-[var(--color-primary)]/0 group-hover/handle:to-[var(--color-primary)]/10 transition-all duration-200" />
        <div className="absolute inset-y-0 -right-px w-1 bg-gradient-to-l from-transparent to-[var(--color-primary)]/0 group-hover/handle:to-[var(--color-primary)]/10 transition-all duration-200" />
      </div>

      {/* 右侧详情 */}
      <div className="flex-1 overflow-y-auto">
        {!selectedProfile ? (
          <div className="flex items-center justify-center h-full text-[var(--color-text-muted)]">
            <div className="text-center"><Layers size={40} className="mx-auto mb-4 opacity-20" /><p className="text-sm">Select a profile</p></div>
          </div>
        ) : (
          <div className="p-6 max-w-2xl">
            {/* 头部 */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {editingField === 'name' ? (
                    <input value={editValue} onChange={e => setEditValue(e.target.value)}
                      onBlur={handleSaveEdit} onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                      autoFocus className="text-xl font-bold font-mono bg-[var(--color-bg)] border border-[var(--color-primary)]/50 rounded px-2 py-0.5 focus:outline-none w-full max-w-xs" />
                  ) : (
                    <h2 onClick={() => { setEditingField('name'); setEditValue(selectedProfile.name) }}
                      className="text-xl font-bold font-mono cursor-pointer hover:text-[var(--color-primary)] transition-colors group/name flex items-center gap-1.5">
                      {selectedProfile.name}
                      <Pencil size={12} className="opacity-0 group-hover/name:opacity-40 transition-opacity" />
                    </h2>
                  )}
                  {selectedProfile.isActive && (
                    <span className="group/active relative px-2 py-0.5 text-[10px] font-mono rounded-full bg-[var(--color-amber)]/15 text-[var(--color-amber)] border border-[var(--color-amber)]/30 cursor-help">
                      Active
                      <span className="absolute left-0 top-full mt-1 px-2 py-1 rounded bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[10px] font-mono text-[var(--color-text-muted)] whitespace-nowrap opacity-0 group-hover/active:opacity-100 transition-opacity pointer-events-none z-10">
                        Switch Now uses this profile
                      </span>
                    </span>
                  )}
                </div>
                {editingField === 'description' ? (
                  <input value={editValue} onChange={e => setEditValue(e.target.value)}
                    onBlur={handleSaveEdit} onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                    autoFocus className="mt-1 w-full bg-[var(--color-bg)] border border-[var(--color-primary)]/50 rounded px-2 py-1 text-sm text-[var(--color-text-muted)] focus:outline-none" />
                ) : (
                  <p onClick={() => { setEditingField('description'); setEditValue(selectedProfile.description || '') }}
                    className="text-sm text-[var(--color-text-muted)] mt-1 cursor-pointer hover:text-[var(--color-text)] transition-colors flex items-center gap-1 group/desc">
                    {selectedProfile.description || <span className="italic opacity-50">Add description...</span>}
                    <Pencil size={10} className="opacity-0 group-hover/desc:opacity-50 transition-opacity" />
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!selectedProfile.isActive && (
                  <button onClick={() => handleSetActive(selectedProfile.name)} className="px-3 py-1.5 text-xs rounded-md border border-[var(--color-amber)]/30 text-[var(--color-amber)] hover:bg-[var(--color-amber)]/10 transition-colors flex items-center gap-1"><Star size={12} /> Activate</button>
                )}
                {selectedProfile.name !== 'default' && (
                  <button onClick={() => setShowDeleteConfirm(selectedProfile.name)} className="p-1.5 rounded-md hover:bg-[var(--color-red)]/10 text-[var(--color-text-muted)] hover:text-[var(--color-red)] transition-colors"><Trash2 size={14} /></button>
                )}
              </div>
            </div>

            {/* Checkbox Skill 列表 */}
            <div className="border border-[var(--color-border)] rounded-lg mb-6">
              <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package size={14} className="text-[var(--color-primary)]" />
                  <span className="text-sm font-medium">Skills</span>
                  <span className="text-[10px] font-mono text-[var(--color-text-muted)]">{selectedProfile.skills.include.length} / {skills.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleSelectAll} className="text-[10px] font-mono text-[var(--color-primary)] hover:underline">Select All</button>
                  <span className="text-[var(--color-text-muted)] text-[10px]">|</span>
                  <button onClick={handleDeselectAll} className="text-[10px] font-mono text-[var(--color-text-muted)] hover:underline">Deselect All</button>
                </div>
              </div>
              {/* 搜索框独立行 */}
              <div className="px-4 py-2 border-b border-[var(--color-border)]">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                  <input
                    value={skillSearch}
                    onChange={e => setSkillSearch(e.target.value)}
                    placeholder="Search skills..."
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 pl-8 py-1.5 text-xs font-mono text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]/50 placeholder:text-[var(--color-text-muted)]/50"
                  />
                  {skillSearch && (
                    <button onClick={() => setSkillSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-[40vh] overflow-y-auto divide-y divide-[var(--color-border)]">
                {filteredSkills.map((skill) => {
                  const checked = selectedProfile.skills.include.includes(skill.name)
                  return (
                    <label key={skill.name} className="flex items-center gap-3 px-4 py-2 hover:bg-white/[0.02] cursor-pointer">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${checked ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-[var(--color-text-muted)]/40'}`}>
                        {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <input type="checkbox" checked={checked} onChange={() => handleToggleSkill(skill.name)} className="sr-only" />
                      <span className="text-sm font-mono flex-1">{skill.name}</span>
                      {skill.description && <span className="text-[11px] text-[var(--color-text-muted)] truncate max-w-[200px]">{skill.description}</span>}
                    </label>
                  )
                })}
                {filteredSkills.length === 0 && skillSearch && (
                  <div className="p-6 text-center text-[var(--color-text-muted)] text-sm">No skills match your search</div>
                )}
                {skills.length === 0 && (
                  <div className="p-6 text-center text-[var(--color-text-muted)] text-sm">No skills in registry</div>
                )}
              </div>
            </div>

            {/* 一键切换 */}
            <div className="border border-[var(--color-border)] rounded-lg">
              <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-[var(--color-amber)]" />
                  <span className="text-sm font-medium">Switch to this Profile</span>
                </div>
                <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                  {config.defaultEnvironments?.length || 0} envs
                </span>
              </div>
              <div className="p-4 space-y-3">
                <button onClick={handleSwitch} disabled={switching}
                  className="w-full py-2.5 rounded-md text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed bg-[var(--color-primary-dim)] text-[var(--color-primary)] border border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/20 transition-colors">
                  {switching ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                  {switching ? 'Switching...' : 'Switch Now'}
                </button>
                <p className="text-[10px] font-mono text-[var(--color-text-muted)] text-center">
                  Applies to: {(config.defaultEnvironments || []).join(', ') || 'none configured'}
                </p>

                {/* 冲突解决 */}
                {conflicts.length > 0 && (
                  <div className="p-3 rounded-md bg-[var(--color-amber)]/5 border border-[var(--color-amber)]/30">
                    <div className="flex items-center gap-2 mb-2"><AlertTriangle size={14} className="text-[var(--color-amber)]" /><span className="text-xs font-medium text-[var(--color-amber)]">{conflicts.length} Conflicts</span></div>
                    {conflicts.map(group => (
                      <div key={group.category} className="mb-2">
                        <p className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase mb-1">{group.category}</p>
                        {group.skills.map(s => (
                          <label key={s} className="flex items-center gap-2 px-2 py-1 hover:bg-white/5 cursor-pointer">
                            <input type="radio" name={`conflict-${group.category}`} value={s} checked={conflictResolution[group.category] === s}
                              onChange={() => setConflictResolution(prev => ({ ...prev, [group.category]: s }))} className="accent-[var(--color-primary)]" />
                            <span className="text-xs font-mono">{s}</span>
                          </label>
                        ))}
                      </div>
                    ))}
                    <button onClick={handleSwitch} disabled={switching || Object.keys(conflictResolution).length < conflicts.length}
                      className="w-full mt-2 py-1.5 rounded-md text-xs font-medium bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/30 disabled:opacity-40 transition-colors">
                      Retry with selections
                    </button>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}
      </div>

      {/* 全局 Loading 遮罩（Switch Now 批量操作时阻塞交互） */}
      {showSwitchLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg)]/90">
          <div className="flex flex-col items-center gap-4 p-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
            <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
            <div className="text-center">
              <p className="text-sm font-mono font-medium text-[var(--color-text)]">Switching profile...</p>
              <p className="text-[10px] font-mono text-[var(--color-text-muted)] mt-1">Please wait, this may take a moment</p>
            </div>
          </div>
        </div>
      )}

      {/* 创建弹窗 */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreate(false)}>
          <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl p-6 w-96 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono font-bold">New Profile</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded hover:bg-white/5 text-[var(--color-text-muted)]"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Profile name" autoFocus onKeyDown={e => e.key === 'Enter' && handleCreate()}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-[var(--color-primary)]" />
              <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)" onKeyDown={e => e.key === 'Enter' && handleCreate()}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)]" />
              <button onClick={handleCreate} disabled={!newName.trim()} className="w-full py-2 rounded-md text-sm font-medium bg-[var(--color-primary)] text-black hover:brightness-110 disabled:opacity-40 transition-all">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDeleteConfirm(null)}>
          <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl p-6 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-mono font-bold mb-2">Delete Profile</h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              Are you sure you want to delete <span className="text-[var(--color-red)] font-mono">{showDeleteConfirm}</span>? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-2 rounded-md text-sm border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-white/5 transition-colors">Cancel</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} className="flex-1 py-2 rounded-md text-sm bg-[var(--color-red)] text-white hover:brightness-110 transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
