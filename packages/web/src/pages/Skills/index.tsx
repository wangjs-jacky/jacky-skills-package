import { useEffect } from 'react'
import { useStore } from '../../stores'
import { skillsApi } from '../../api/client'
import { Search, Sparkles, Package } from 'lucide-react'
import SkillList from './SkillList'

export default function SkillsPage() {
  const { skills, setSkills, isLoading, setIsLoading, showToast, updateSkillEnvironments } = useStore()

  useEffect(() => {
    loadSkills()
  }, [])

  async function loadSkills() {
    setIsLoading(true)
    try {
      const response = await skillsApi.list()
      if (response.success) {
        setSkills(response.data)
      }
    } catch (err) {
      showToast('Failed to load skills', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleUnlink(name: string) {
    try {
      const response = await skillsApi.unlink(name)
      if (response.success) {
        showToast(`Unlinked: ${name}`, 'success')
        loadSkills()
      }
    } catch (err) {
      showToast('Failed to unlink skill', 'error')
    }
  }

  async function handleToggleEnv(name: string, env: string, enable: boolean) {
    try {
      const skill = skills.find(s => s.name === name)
      const currentEnvs = skill?.installedEnvironments || []

      if (enable) {
        const response = await skillsApi.install(name, env, true)
        if (response.success) {
          const newEnvs = [...currentEnvs, env]
          updateSkillEnvironments(name, newEnvs)
          showToast(`Installed ${name} to ${env}`, 'success')
        }
      } else {
        const response = await skillsApi.uninstall(name, env, true)
        if (response.success) {
          const newEnvs = currentEnvs.filter(e => e !== env)
          updateSkillEnvironments(name, newEnvs)
          showToast(`Removed ${name} from ${env}`, 'success')
        }
      }
    } catch (err) {
      const action = enable ? 'install to' : 'remove from'
      showToast(`Failed to ${action} ${env}`, 'error')
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-lg border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] animate-spin"></div>
          <div className="absolute inset-0 bg-[var(--color-primary)]/20 blur-xl rounded-lg"></div>
        </div>
        <p className="text-sm font-mono text-[var(--color-text-muted)] animate-pulse">
          Loading skills...
        </p>
      </div>
    )
  }

  return (
    <div className="relative z-10 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="relative">
            <Sparkles size={24} className="text-[var(--color-primary)]" />
            <div className="absolute inset-0 text-[var(--color-primary)] blur-lg animate-pulse">
              <Sparkles size={24} />
            </div>
          </div>
          <h2 className="text-3xl font-bold font-mono tracking-tight">
            <span className="gradient-text">Skills</span>
          </h2>
        </div>
        <p className="text-[var(--color-text-muted)] font-mono text-sm">
          Manage your linked and installed skills
        </p>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6 mb-6 px-4 py-3 rounded-xl bg-white/[0.02] border border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <Package size={16} className="text-[var(--color-primary)]" />
          <span className="text-sm font-mono text-[var(--color-text-muted)]">
            <span className="text-[var(--color-text)]">{skills.length}</span> skills linked
          </span>
        </div>
        <div className="h-4 w-px bg-[var(--color-border)]"></div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse"></div>
          <span className="text-sm font-mono text-[var(--color-text-muted)]">
            <span className="text-[var(--color-primary)]">
              {skills.filter(s => s.installedEnvironments?.length).length}
            </span> active
          </span>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-6">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <input
          type="text"
          placeholder="Search skills..."
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.02] border border-[var(--color-border)]
                     text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]
                     font-mono text-sm focus:outline-none focus:border-[var(--color-primary)]/50
                     focus:bg-white/[0.03] transition-all duration-300"
        />
        <div className="absolute inset-0 rounded-xl opacity-0 focus-within:opacity-100 transition-opacity pointer-events-none">
          <div className="absolute inset-0 rounded-xl bg-[var(--color-primary)]/5 blur-xl"></div>
        </div>
      </div>

      {/* Skills grid */}
      <SkillList skills={skills} onUnlink={handleUnlink} onToggleEnv={handleToggleEnv} />
    </div>
  )
}
