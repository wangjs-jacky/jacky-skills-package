import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../../stores'
import { skillsApi, environmentsApi, configApi, type EnvironmentInfo } from '../../api/client'
import { Sparkles, Package, Zap, Loader2, ChevronDown, Trash2, X } from 'lucide-react'
import SkillList from './SkillList'

export default function SkillsPage() {
  const { skills, setSkills, config, setConfig, isLoading, setIsLoading, showToast, updateSkillEnvironments } = useStore()
  const [environments, setEnvironments] = useState<EnvironmentInfo[]>([])
  const [installingEnv, setInstallingEnv] = useState<string | null>(null)
  const [showEnvDropdown, setShowEnvDropdown] = useState(false)
  const [viewingSkill, setViewingSkill] = useState<string | null>(null)
  const [skillContent, setSkillContent] = useState<string>('')
  const [contentLoading, setContentLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadSkills()
    loadEnvironments()
    // 如果 store 中还没有 config，主动加载
    if (!config.defaultEnvironments) {
      loadConfig()
    }
  }, [])

  async function loadConfig() {
    try {
      const response = await configApi.get()
      if (response.success) {
        setConfig(response.data)
      }
    } catch (err) {
      // 静默失败，不影响主流程
    }
  }

  // 根据 Settings 中配置的 defaultEnvironments 过滤可用环境
  const activeEnvs = useMemo(() =>
    config.defaultEnvironments?.length
      ? environments.filter((env) => config.defaultEnvironments!.includes(env.name))
      : environments,
    [config.defaultEnvironments, environments]
  )

  // Memoize 统计数据
  const installedCount = useMemo(() =>
    skills.filter(s => s.installedEnvironments?.length).length,
    [skills]
  )

  async function loadEnvironments() {
    try {
      const response = await environmentsApi.list()
      if (response.success) {
        setEnvironments(response.data)
      }
    } catch (err) {
      showToast('Failed to load environments', 'error')
    }
  }

  async function loadSkills() {
    setIsLoading(true)
    try {
      const response = await skillsApi.list()
      if (response.success) {
        const { skills, cleanedCount } = response.data
        setSkills(skills)
        if (cleanedCount > 0) {
          showToast(`Auto-cleaned ${cleanedCount} broken skill(s)`, 'success')
        }
      }
    } catch (err) {
      showToast('Failed to load skills', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnlink = useCallback(async (name: string) => {
    try {
      const response = await skillsApi.unlink(name)
      if (response.success) {
        showToast(`Unlinked: ${name}`, 'success')
        loadSkills()
      }
    } catch (err) {
      showToast('Failed to unlink skill', 'error')
    }
  }, [showToast])

  const handleToggleEnv = useCallback(async (name: string, env: string, enable: boolean) => {
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
  }, [skills, updateSkillEnvironments, showToast])

  const handleExport = useCallback(async (name: string) => {
    // 导出到 ~/Downloads/j-skills-export/
    // 服务端会处理路径
    const defaultPath = '~/Downloads/j-skills-export'

    try {
      const response = await skillsApi.export([name], defaultPath)
      if (response.success) {
        showToast(`Exported ${name} to ${defaultPath}`, 'success')
      } else if (response.data?.errors?.length) {
        showToast(response.data.errors[0], 'error')
      }
    } catch (err) {
      showToast('Failed to export skill', 'error')
    }
  }, [showToast])

  const handleViewContent = useCallback(async (name: string) => {
    setViewingSkill(name)
    setContentLoading(true)
    try {
      const response = await skillsApi.getFileContent(name, 'SKILL.md')
      if (response.success) {
        setSkillContent(response.data.content)
      } else {
        setSkillContent('Failed to load content')
      }
    } catch (err) {
      setSkillContent('Failed to load content')
    } finally {
      setContentLoading(false)
    }
  }, [])

  // 点击外部关闭 Dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowEnvDropdown(false)
      }
    }
    if (showEnvDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEnvDropdown])

  // 快速安装：将所有未安装的 skills 批量安装到指定环境
  async function handleQuickInstall(envName: string) {
    const envInfo = activeEnvs.find(e => e.name === envName)
    if (!envInfo) return

    // 每次从 store 获取最新状态（避免闭包捕获旧值）
    const currentSkills = useStore.getState().skills
    const toInstall = currentSkills.filter(
      s => !s.installedEnvironments?.includes(envName)
    )

    if (toInstall.length === 0) {
      showToast(`All skills already installed to ${envInfo.label}`, 'success')
      return
    }

    setInstallingEnv(envName)
    setShowEnvDropdown(false)
    let installedCount = 0
    let failedCount = 0

    try {
      for (const skill of toInstall) {
        const response = await skillsApi.install(skill.name, envName, true)
        if (response.success) {
          installedCount++
          // 每次从最新 store 状态更新，避免闭包累积
          const latestSkill = useStore.getState().skills.find(s => s.name === skill.name)
          const currentEnvs = latestSkill?.installedEnvironments || []
          const newEnvs = [...currentEnvs, envName]
          updateSkillEnvironments(skill.name, newEnvs)
        } else {
          failedCount++
        }
      }
      // 区分情况：全部成功、部分失败、全部失败
      if (failedCount === 0) {
        showToast(`Installed ${installedCount} skills to ${envInfo.label}`, 'success')
      } else if (installedCount > 0) {
        showToast(`Installed ${installedCount}/${installedCount + failedCount} skills to ${envInfo.label} (${failedCount} failed)`, 'error')
      } else {
        showToast(`Failed to install all ${failedCount} skills to ${envInfo.label}. Check if skill source paths exist.`, 'error')
      }
    } catch (err) {
      showToast(`Failed to install some skills to ${envInfo.label}`, 'error')
    } finally {
      setInstallingEnv(null)
    }
  }

  // 快速卸载：将所有已安装到指定环境的 skills 批量卸载
  async function handleQuickUninstall(envName: string) {
    const envInfo = activeEnvs.find(e => e.name === envName)
    if (!envInfo) return

    // 从 store 获取最新状态
    const currentSkills = useStore.getState().skills
    const toUninstall = currentSkills.filter(
      s => s.installedEnvironments?.includes(envName)
    )

    if (toUninstall.length === 0) {
      showToast(`No skills installed to ${envInfo.label}`, 'success')
      return
    }

    setInstallingEnv(envName)
    setShowEnvDropdown(false)
    let uninstalledCount = 0

    try {
      for (const skill of toUninstall) {
        const response = await skillsApi.uninstall(skill.name, envName, true)
        if (response.success) {
          uninstalledCount++
          // 从最新 store 状态更新
          const latestSkill = useStore.getState().skills.find(s => s.name === skill.name)
          const currentEnvs = latestSkill?.installedEnvironments || []
          const newEnvs = currentEnvs.filter((e: string) => e !== envName)
          updateSkillEnvironments(skill.name, newEnvs)
        }
      }
      showToast(`Removed ${uninstalledCount} skills from ${envInfo.label}`, 'success')
    } catch (err) {
      showToast(`Failed to remove some skills from ${envInfo.label}`, 'error')
    } finally {
      setInstallingEnv(null)
    }
  }

  if (isLoading) {
    return (
      <div data-testid="skills-loading" className="flex flex-col items-center justify-center h-64 gap-4">
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
    <div data-testid="skills-page" className="relative z-10 animate-fade-in">
      {/* Header */}
      <div data-testid="skills-header" className="mb-8">
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
      <div data-testid="skills-stats" className="flex items-center gap-6 mb-6 px-4 py-3 rounded-xl bg-white/[0.02] border border-[var(--color-border)]">
        <div data-testid="skills-stats-total" className="flex items-center gap-2">
          <Package size={16} className="text-[var(--color-primary)]" />
          <span className="text-sm font-mono text-[var(--color-text-muted)]">
            <span className="text-[var(--color-text)]">{skills.length}</span> skills linked
          </span>
        </div>
        <div className="h-4 w-px bg-[var(--color-border)]"></div>
        <div data-testid="skills-stats-installed" className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse"></div>
          <span className="text-sm font-mono text-[var(--color-text-muted)]">
            <span className="text-[var(--color-primary)]">
              {installedCount}
            </span> installed
          </span>
        </div>

        {/* 快速安装/卸载 Dropdown */}
        {skills.length > 0 && (config.defaultEnvironments?.length ?? 0) > 0 && activeEnvs.length > 0 && (
          <>
            <div className="flex-1"></div>
            <div ref={dropdownRef} className="relative">
              <button
                data-testid="quick-install-dropdown-trigger"
                onClick={() => setShowEnvDropdown(!showEnvDropdown)}
                disabled={installingEnv !== null}
                className={`
                  group relative flex items-center gap-2 px-4 py-1.5 rounded-lg font-mono text-xs font-medium
                  border transition-all duration-300
                  ${installingEnv
                    ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)] cursor-wait'
                    : 'bg-white/[0.02] border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-primary-dim)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)]'
                  }
                  disabled:opacity-50
                `}
              >
                {installingEnv ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Zap size={14} />
                )}
                <span>{installingEnv ? `Working on ${activeEnvs.find(e => e.name === installingEnv)?.label}...` : 'Batch Operations'}</span>
                {!installingEnv && (
                  <ChevronDown size={14} className={`transition-transform duration-200 ${showEnvDropdown ? 'rotate-180' : ''}`} />
                )}
              </button>

              {/* Dropdown 菜单 */}
              {showEnvDropdown && (
                <div
                  data-testid="quick-install-dropdown-menu"
                  className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-[#131316] border border-[var(--color-border)] shadow-2xl z-50 overflow-hidden"
                >
                  <div className="p-1 max-h-80 overflow-y-auto">
                    {activeEnvs.map(env => {
                      // 实时计算该环境的安装状态
                      const installedCount = skills.filter(
                        s => s.installedEnvironments?.includes(env.name)
                      ).length
                      const allInstalled = installedCount === skills.length
                      const noneInstalled = installedCount === 0

                      return (
                        <button
                          key={env.name}
                          data-testid={`quick-install-${env.name}`}
                          onClick={() => allInstalled
                            ? handleQuickUninstall(env.name)
                            : handleQuickInstall(env.name)
                          }
                          className={`
                            w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left font-mono text-xs
                            transition-all duration-200
                            ${allInstalled
                              ? 'text-[var(--color-red)] hover:bg-[var(--color-red)]/10'
                              : 'text-[var(--color-text-muted)] hover:bg-white/[0.05] hover:text-[var(--color-text)]'
                            }
                          `}
                        >
                          {allInstalled ? (
                            <Trash2 size={14} className="flex-shrink-0" />
                          ) : (
                            <Zap size={14} className="flex-shrink-0 text-[var(--color-primary)]" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="truncate">
                              {allInstalled ? `Uninstall All from ${env.label}` : `Install All to ${env.label}`}
                            </div>
                            <div className="text-[10px] opacity-50 mt-0.5">
                              {noneInstalled
                                ? 'No skills installed'
                                : `${installedCount}/${skills.length} installed`
                              }
                            </div>
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

      {/* Skills grid */}
      <SkillList skills={skills} environments={activeEnvs} onUnlink={handleUnlink} onToggleEnv={handleToggleEnv} onExport={handleExport} onViewContent={handleViewContent} />

      {/* SKILL.md 查看模态框 - Portal 到 body 避免受祖先 transform 影响 */}
      {viewingSkill && createPortal(
        <div
          data-testid="skill-content-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setViewingSkill(null)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[80vh] mx-4 rounded-2xl bg-[#131316] border border-[var(--color-border)] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 模态框头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse"></div>
                <span className="font-mono text-sm text-[var(--color-primary)]">
                  {viewingSkill}/SKILL.md
                </span>
              </div>
              <button
                data-testid="skill-content-modal-close"
                onClick={() => setViewingSkill(null)}
                className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/[0.06] transition-all"
              >
                <X size={18} />
              </button>
            </div>
            {/* 模态框内容 */}
            <div className="p-6 overflow-auto max-h-[calc(80vh-64px)]">
              {contentLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-[var(--color-primary)]" />
                </div>
              ) : (
                <pre className="text-sm font-mono text-[var(--color-text-muted)] whitespace-pre-wrap leading-relaxed">
                  {skillContent}
                </pre>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
