import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../../stores'
import { skillsApi, environmentsApi, configApi, profilesApi, type EnvironmentInfo } from '../../api/client'
import { Sparkles, Package, Zap, Loader2, ChevronDown, Trash2, X, Star, Scan, Globe, ExternalLink } from 'lucide-react'
import SkillList from './SkillList'

type SkillsTab = 'my-skills' | 'external'

export default function SkillsPage() {
  const { skills, setSkills, config, setConfig, isLoading, setIsLoading, showToast, updateSkillEnvironments, activeProfile, setActiveProfile } = useStore()
  const [environments, setEnvironments] = useState<EnvironmentInfo[]>([])
  const [installingEnv, setInstallingEnv] = useState<string | null>(null)
  const [showEnvDropdown, setShowEnvDropdown] = useState(false)
  const [viewingSkill, setViewingSkill] = useState<string | null>(null)
  const [skillContent, setSkillContent] = useState<string>('')
  const [contentLoading, setContentLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<SkillsTab>('my-skills')
  const [scanning, setScanning] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadSkills()
    loadEnvironments()
    if (!config.defaultEnvironments) loadConfig()
    if (!activeProfile) { profilesApi.getActive().then(r => { if (r.success && r.data) setActiveProfile(r.data) }) }
  }, [])

  async function loadConfig() {
    try {
      const response = await configApi.get()
      if (response.success) setConfig(response.data)
    } catch {}
  }

  const activeEnvs = useMemo(() =>
    config.defaultEnvironments?.length
      ? environments.filter((env) => config.defaultEnvironments!.includes(env.name))
      : environments,
    [config.defaultEnvironments, environments]
  )

  // 按 source 过滤 skills
  const mySkills = useMemo(() => skills.filter(s => s.source !== 'marketplace'), [skills])
  const externalSkills = useMemo(() => skills.filter(s => s.source === 'marketplace'), [skills])

  // 当前 Tab 的 skills
  const currentSkills = activeTab === 'my-skills' ? mySkills : externalSkills
  const installedCount = useMemo(() =>
    currentSkills.filter(s => s.installedEnvironments?.length).length,
    [currentSkills]
  )

  async function loadEnvironments() {
    try {
      const response = await environmentsApi.list()
      if (response.success) setEnvironments(response.data)
    } catch { showToast('Failed to load environments', 'error') }
  }

  async function loadSkills() {
    setIsLoading(true)
    try {
      const response = await skillsApi.list()
      if (response.success) {
        const { skills, cleanedCount } = response.data
        setSkills(skills)
        if (cleanedCount > 0) showToast(`Auto-cleaned ${cleanedCount} broken skill(s)`, 'success')
      }
    } catch { showToast('Failed to load skills', 'error') }
    finally { setIsLoading(false) }
  }

  const handleUnlink = useCallback(async (name: string) => {
    try {
      const response = await skillsApi.unlink(name)
      if (response.success) { showToast(`Unlinked: ${name}`, 'success'); loadSkills() }
    } catch { showToast('Failed to unlink skill', 'error') }
  }, [showToast])

  const handleRemoveExternal = useCallback(async (name: string) => {
    try {
      const response = await skillsApi.removeExternalSkill(name)
      if (response.success) { showToast(`Removed external skill: ${name}`, 'success'); loadSkills() }
      else { showToast(response.error || 'Failed to remove', 'error') }
    } catch { showToast('Failed to remove external skill', 'error') }
  }, [showToast])

  const handleToggleEnv = useCallback(async (name: string, env: string, enable: boolean) => {
    try {
      const skill = skills.find(s => s.name === name)
      const currentEnvs = skill?.installedEnvironments || []
      if (enable) {
        const response = await skillsApi.install(name, env, true)
        if (response.success) {
          updateSkillEnvironments(name, [...currentEnvs, env])
          showToast(`Installed ${name} to ${env}`, 'success')
        }
      } else {
        const response = await skillsApi.uninstall(name, env, true)
        if (response.success) {
          updateSkillEnvironments(name, currentEnvs.filter(e => e !== env))
          showToast(`Removed ${name} from ${env}`, 'success')
        }
      }
    } catch { showToast(`Failed to ${enable ? 'install to' : 'remove from'} ${env}`, 'error') }
  }, [skills, updateSkillEnvironments, showToast])

  const handleExport = useCallback(async (name: string) => {
    try {
      const response = await skillsApi.export([name], '~/Downloads/j-skills-export')
      if (response.success) showToast(`Exported ${name}`, 'success')
      else if (response.data?.errors?.length) showToast(response.data.errors[0], 'error')
    } catch { showToast('Failed to export skill', 'error') }
  }, [showToast])

  const handleViewContent = useCallback(async (name: string) => {
    setViewingSkill(name); setContentLoading(true)
    try {
      const response = await skillsApi.getFileContent(name, 'SKILL.md')
      if (response.success) setSkillContent(response.data.content)
      else setSkillContent('Failed to load content')
    } catch { setSkillContent('Failed to load content') }
    finally { setContentLoading(false) }
  }, [])

  async function handleScanAgents() {
    setScanning(true)
    try {
      const response = await skillsApi.scanAgents()
      if (response.success) {
        const { scanned, registered, skipped } = response.data
        if (scanned === 0) showToast('No skills found in .agents/skills/', 'success')
        else showToast(`Scanned: ${scanned}, Registered: ${registered}, Skipped: ${skipped}`, 'success')
        loadSkills()
      }
    } catch { showToast('Failed to scan agents directory', 'error') }
    finally { setScanning(false) }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowEnvDropdown(false)
    }
    if (showEnvDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEnvDropdown])

  async function handleQuickInstall(envName: string) {
    const envInfo = activeEnvs.find(e => e.name === envName)
    if (!envInfo) return
    const currentSkills = useStore.getState().skills
    const toInstall = currentSkills.filter(s => {
      if (activeTab === 'my-skills' && s.source === 'marketplace') return false
      if (activeTab === 'external' && s.source !== 'marketplace') return false
      return !s.installedEnvironments?.includes(envName)
    })
    if (toInstall.length === 0) { showToast(`All skills already installed to ${envInfo.label}`, 'success'); return }
    setInstallingEnv(envName); setShowEnvDropdown(false)
    let ok = 0, fail = 0
    try {
      for (const skill of toInstall) {
        const response = await skillsApi.install(skill.name, envName, true)
        if (response.success) {
          ok++
          const latest = useStore.getState().skills.find(s => s.name === skill.name)
          updateSkillEnvironments(skill.name, [...(latest?.installedEnvironments || []), envName])
        } else fail++
      }
      if (fail === 0) showToast(`Installed ${ok} skills to ${envInfo.label}`, 'success')
      else showToast(`${ok}/${ok + fail} installed (${fail} failed)`, 'error')
    } catch { showToast('Batch install failed', 'error') }
    finally { setInstallingEnv(null) }
  }

  async function handleQuickUninstall(envName: string) {
    const envInfo = activeEnvs.find(e => e.name === envName)
    if (!envInfo) return
    const currentSkills = useStore.getState().skills
    const toUninstall = currentSkills.filter(s => {
      if (activeTab === 'my-skills' && s.source === 'marketplace') return false
      if (activeTab === 'external' && s.source !== 'marketplace') return false
      return s.installedEnvironments?.includes(envName)
    })
    if (toUninstall.length === 0) { showToast(`No skills installed to ${envInfo.label}`, 'success'); return }
    setInstallingEnv(envName); setShowEnvDropdown(false)
    let count = 0
    try {
      for (const skill of toUninstall) {
        const response = await skillsApi.uninstall(skill.name, envName, true)
        if (response.success) {
          count++
          const latest = useStore.getState().skills.find(s => s.name === skill.name)
          updateSkillEnvironments(skill.name, (latest?.installedEnvironments || []).filter((e: string) => e !== envName))
        }
      }
      showToast(`Removed ${count} skills from ${envInfo.label}`, 'success')
    } catch { showToast('Batch uninstall failed', 'error') }
    finally { setInstallingEnv(null) }
  }

  if (isLoading) {
    return (
      <div data-testid="skills-loading" className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-lg border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] animate-spin"></div>
          <div className="absolute inset-0 bg-[var(--color-primary)]/20 blur-xl rounded-lg"></div>
        </div>
        <p className="text-sm font-mono text-[var(--color-text-muted)] animate-pulse">Loading skills...</p>
      </div>
    )
  }

  const tabs: { key: SkillsTab; label: string; count: number }[] = [
    { key: 'my-skills', label: '我的 Skills', count: mySkills.length },
    { key: 'external', label: '外部 Skills', count: externalSkills.length },
  ]

  return (
    <div data-testid="skills-page" className="relative z-10 animate-fade-in">
      {/* Header */}
      <div data-testid="skills-header" className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="relative">
            <Sparkles size={24} className="text-[var(--color-primary)]" />
            <div className="absolute inset-0 text-[var(--color-primary)] blur-lg animate-pulse"><Sparkles size={24} /></div>
          </div>
          <h2 className="text-3xl font-bold font-mono tracking-tight"><span className="gradient-text">Skills</span></h2>
          {activeProfile && (
            <span className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono rounded-full bg-[var(--color-amber)]/15 text-[var(--color-amber)] border border-[var(--color-amber)]/30">
              <Star size={10} className="fill-[var(--color-amber)]" /> {activeProfile.name}
            </span>
          )}
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex items-center gap-1 mb-5 p-1 rounded-xl bg-white/[0.02] border border-[var(--color-border)] w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            data-testid={`tab-${tab.key}`}
            onClick={() => setActiveTab(tab.key)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs font-medium transition-all duration-200
              ${activeTab === tab.key
                ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/30'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/[0.03] border border-transparent'
              }
            `}
          >
            {tab.key === 'my-skills' ? <Package size={14} /> : <ExternalLink size={14} />}
            {tab.label}
            <span className={`
              px-1.5 py-0.5 rounded text-[10px] font-mono
              ${activeTab === tab.key ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]' : 'bg-white/[0.05] text-[var(--color-text-muted)]'}
            `}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Stats bar */}
      <div data-testid="skills-stats" className="flex items-center gap-6 mb-6 px-4 py-3 rounded-xl bg-white/[0.02] border border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <Package size={16} className="text-[var(--color-primary)]" />
          <span className="text-sm font-mono text-[var(--color-text-muted)]">
            <span className="text-[var(--color-text)]">{currentSkills.length}</span> {activeTab === 'my-skills' ? 'skills linked' : 'external skills'}
          </span>
        </div>
        <div className="h-4 w-px bg-[var(--color-border)]"></div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse"></div>
          <span className="text-sm font-mono text-[var(--color-text-muted)]">
            <span className="text-[var(--color-primary)]">{installedCount}</span> installed
          </span>
        </div>

        {/* 外部 Skills：扫描按钮 */}
        {activeTab === 'external' && (
          <button
            data-testid="scan-agents-btn"
            onClick={handleScanAgents}
            disabled={scanning}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs font-medium bg-[var(--color-blue)]/15 text-[var(--color-blue)] border border-[var(--color-blue)]/30 hover:bg-[var(--color-blue)]/25 transition-all disabled:opacity-50"
          >
            {scanning ? <Loader2 size={14} className="animate-spin" /> : <Scan size={14} />}
            {scanning ? '扫描中...' : '扫描项目'}
          </button>
        )}

        {/* 快速安装/卸载 Dropdown */}
        {currentSkills.length > 0 && (config.defaultEnvironments?.length ?? 0) > 0 && activeEnvs.length > 0 && (
          <>
            <div className="flex-1"></div>
            <div ref={dropdownRef} className="relative">
              <button
                data-testid="quick-install-dropdown-trigger"
                onClick={() => setShowEnvDropdown(!showEnvDropdown)}
                disabled={installingEnv !== null}
                className={`group relative flex items-center gap-2 px-4 py-1.5 rounded-lg font-mono text-xs font-medium border transition-all duration-300
                  ${installingEnv
                    ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)] cursor-wait'
                    : 'bg-white/[0.02] border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-primary-dim)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)]'
                  } disabled:opacity-50`}
              >
                {installingEnv ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                <span>{installingEnv ? `Working...` : 'Batch Operations'}</span>
                {!installingEnv && <ChevronDown size={14} className={`transition-transform duration-200 ${showEnvDropdown ? 'rotate-180' : ''}`} />}
              </button>
              {showEnvDropdown && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-[#131316] border border-[var(--color-border)] shadow-2xl z-50 overflow-hidden">
                  <div className="p-1 max-h-80 overflow-y-auto">
                    {activeEnvs.map(env => {
                      const cnt = currentSkills.filter(s => s.installedEnvironments?.includes(env.name)).length
                      const all = cnt === currentSkills.length && currentSkills.length > 0
                      return (
                        <button key={env.name} onClick={() => all ? handleQuickUninstall(env.name) : handleQuickInstall(env.name)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left font-mono text-xs transition-all duration-200
                            ${all ? 'text-[var(--color-red)] hover:bg-[var(--color-red)]/10' : 'text-[var(--color-text-muted)] hover:bg-white/[0.05] hover:text-[var(--color-text)]'}`}
                        >
                          {all ? <Trash2 size={14} className="flex-shrink-0" /> : <Zap size={14} className="flex-shrink-0 text-[var(--color-primary)]" />}
                          <div className="flex-1 min-w-0">
                            <div className="truncate">{all ? `Uninstall All from ${env.label}` : `Install All to ${env.label}`}</div>
                            <div className="text-[10px] opacity-50 mt-0.5">{cnt}/{currentSkills.length} installed</div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 外部 Skills 空状态 */}
      {activeTab === 'external' && externalSkills.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 rounded-xl border border-dashed border-[var(--color-border)] bg-white/[0.01]">
          <ExternalLink size={32} className="text-[var(--color-text-muted)] opacity-50" />
          <div className="text-center">
            <p className="font-mono text-sm text-[var(--color-text-muted)] mb-1">No external skills found</p>
            <p className="font-mono text-xs text-[var(--color-text-muted)] opacity-50">Scan .agents/skills/ or download from marketplace</p>
          </div>
          <div className="flex gap-3 mt-2">
            <button onClick={handleScanAgents} disabled={scanning}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs bg-[var(--color-blue)]/15 text-[var(--color-blue)] border border-[var(--color-blue)]/30 hover:bg-[var(--color-blue)]/25 transition-all disabled:opacity-50">
              {scanning ? <Loader2 size={14} className="animate-spin" /> : <Scan size={14} />}
              扫描项目
            </button>
          </div>
        </div>
      )}

      {/* Skills grid */}
      {currentSkills.length > 0 && (
        <SkillList
          skills={currentSkills}
          environments={activeEnvs}
          onUnlink={activeTab === 'my-skills' ? handleUnlink : undefined}
          onToggleEnv={handleToggleEnv}
          onExport={activeTab === 'my-skills' ? handleExport : undefined}
          onViewContent={handleViewContent}
          onRemove={activeTab === 'external' ? handleRemoveExternal : undefined}
          isExternal={activeTab === 'external'}
        />
      )}

      {/* SKILL.md 查看模态框 */}
      {viewingSkill && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setViewingSkill(null)}>
          <div className="relative w-full max-w-2xl max-h-[80vh] mx-4 rounded-2xl bg-[#131316] border border-[var(--color-border)] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse"></div>
                <span className="font-mono text-sm text-[var(--color-primary)]">{viewingSkill}/SKILL.md</span>
              </div>
              <button onClick={() => setViewingSkill(null)} className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/[0.06] transition-all"><X size={18} /></button>
            </div>
            <div className="p-6 overflow-auto max-h-[calc(80vh-64px)]">
              {contentLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-[var(--color-primary)]" /></div>
              ) : (
                <pre className="text-sm font-mono text-[var(--color-text-muted)] whitespace-pre-wrap leading-relaxed">{skillContent}</pre>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
