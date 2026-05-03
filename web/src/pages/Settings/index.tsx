import { useEffect, useState } from 'react'
import { open } from '@tauri-apps/plugin-shell'
import { useStore } from '../../stores'
import { configApi, environmentsApi, type EnvironmentInfo } from '../../api/client'
import { checkForUpdate, getAppVersion, type UpdateInfo } from '../../api/update'
import { Settings, Check, Terminal, Cpu, Copy, Link, RefreshCw, Download, ExternalLink, Loader2 } from 'lucide-react'

export default function SettingsPage() {
  const { config, setConfig, showToast } = useStore()
  const [environments, setEnvironments] = useState<EnvironmentInfo[]>([])
  const [selectedEnvs, setSelectedEnvs] = useState<string[]>([])
  const [installMethod, setInstallMethod] = useState<'copy' | 'symlink'>('copy')
  const [appVersion, setAppVersion] = useState('')
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [checkingUpdate, setCheckingUpdate] = useState(false)

  useEffect(() => {
    loadConfig()
    loadEnvironments()
    loadAppVersion()
  }, [])

  async function loadAppVersion() {
    try {
      const version = await getAppVersion()
      setAppVersion(version)
    } catch {
      // 忽略
    }
  }

  async function loadConfig() {
    try {
      const response = await configApi.get()
      if (response.success) {
        setConfig(response.data)
        setSelectedEnvs(response.data.defaultEnvironments || [])
        setInstallMethod(response.data.installMethod || 'copy')
      }
    } catch (err) {
      showToast('Failed to load config', 'error')
    }
  }

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

  async function saveConfig(newEnvs: string[], newMethod: 'copy' | 'symlink') {
    try {
      const response = await configApi.update({
        ...config,
        defaultEnvironments: newEnvs,
        installMethod: newMethod,
      })
      if (response.success) {
        setConfig(response.data)
        showToast('Settings saved', 'success')
      }
    } catch (err) {
      showToast('Failed to save settings', 'error')
    }
  }

  function toggleEnv(envName: string) {
    setSelectedEnvs((prev) => {
      const next = prev.includes(envName)
        ? prev.filter((e) => e !== envName)
        : [...prev, envName]
      saveConfig(next, installMethod)
      return next
    })
  }

  function changeInstallMethod(method: 'copy' | 'symlink') {
    setInstallMethod(method)
    saveConfig(selectedEnvs, method)
  }

  async function handleCheckUpdate() {
    setCheckingUpdate(true)
    setUpdateInfo(null)
    try {
      const info = await checkForUpdate()
      setUpdateInfo(info)
      if (!info.has_update) {
        showToast('Already up to date', 'success')
      }
    } catch (err) {
      console.error('[Update check failed]', err)
      showToast(`Update check failed: ${err}`, 'error')
    } finally {
      setCheckingUpdate(false)
    }
  }

  return (
    <div data-testid="settings-page" className="relative z-10 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings size={24} className="text-[var(--color-amber)]" />
          <h2 className="text-3xl font-bold font-mono tracking-tight">
            <span className="gradient-text">Settings</span>
          </h2>
        </div>
        <p className="text-[var(--color-text-muted)] font-mono text-sm">
          Configure j-skills preferences
        </p>
      </div>

      {/* Environments Card */}
      <div className="glass-card rounded-xl p-6 mb-6 noise-overlay">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-amber-dim)] border border-[var(--color-amber)]/30 flex items-center justify-center">
            <Cpu size={16} className="text-[var(--color-amber)]" />
          </div>
          <h3 className="font-mono font-semibold text-[var(--color-text)]">
            Default Environments
          </h3>
        </div>
        <p className="text-sm text-[var(--color-text-muted)] mb-6 pl-11">
          Select the environments to use by default when installing skills.
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {environments.map((env) => {
            const isSelected = selectedEnvs.includes(env.name)
            return (
              <button
                key={env.name}
                data-testid={`settings-env-toggle-${env.name}`}
                onClick={() => toggleEnv(env.name)}
                className={`
                  relative group flex items-center gap-3 px-4 py-3 rounded-xl
                  border transition-all duration-300 text-left
                  font-mono text-sm
                  ${isSelected
                    ? 'bg-[var(--color-primary-dim)] border-[var(--color-primary)]/40 text-[var(--color-primary)]'
                    : 'bg-white/[0.02] border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-white/[0.04] hover:text-[var(--color-text)]'
                  }
                `}
              >
                <Terminal size={18} />
                <span className="flex-1">{env.label}</span>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
                    <Check size={12} className="text-black" />
                  </div>
                )}
                {isSelected && (
                  <div className="absolute inset-0 rounded-xl bg-[var(--color-primary)]/10 animate-pulse-glow"></div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Install Method Card */}
      <div className="glass-card rounded-xl p-6 mb-6 noise-overlay">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-blue-dim)] border border-[var(--color-blue)]/30 flex items-center justify-center">
            <Copy size={16} className="text-[var(--color-blue)]" />
          </div>
          <h3 className="font-mono font-semibold text-[var(--color-text)]">
            Install Method
          </h3>
        </div>
        <p className="text-sm text-[var(--color-text-muted)] mb-6 pl-11">
          Choose how skills are installed to environments.
        </p>

        <div className="grid grid-cols-2 gap-3">
          {/* Copy 选项 */}
          <button
            data-testid="settings-install-method-copy"
            onClick={() => changeInstallMethod('copy')}
            className={`
              relative group flex flex-col items-start gap-2 px-4 py-4 rounded-xl
              border transition-all duration-300 text-left
              font-mono text-sm
              ${installMethod === 'copy'
                ? 'bg-[var(--color-primary-dim)] border-[var(--color-primary)]/40 text-[var(--color-primary)]'
                : 'bg-white/[0.02] border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-white/[0.04] hover:text-[var(--color-text)]'
              }
            `}
          >
            <div className="flex items-center gap-3 w-full">
              <Copy size={18} />
              <span className="font-medium">Copy</span>
              {installMethod === 'copy' && (
                <div className="ml-auto w-5 h-5 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
                  <Check size={12} className="text-black" />
                </div>
              )}
            </div>
            <span className="text-xs opacity-70">Creates independent copy</span>
          </button>

          {/* Symlink 选项 */}
          <button
            data-testid="settings-install-method-symlink"
            onClick={() => changeInstallMethod('symlink')}
            className={`
              relative group flex flex-col items-start gap-2 px-4 py-4 rounded-xl
              border transition-all duration-300 text-left
              font-mono text-sm
              ${installMethod === 'symlink'
                ? 'bg-[var(--color-primary-dim)] border-[var(--color-primary)]/40 text-[var(--color-primary)]'
                : 'bg-white/[0.02] border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-white/[0.04] hover:text-[var(--color-text)]'
              }
            `}
          >
            <div className="flex items-center gap-3 w-full">
              <Link size={18} />
              <span className="font-medium">Symlink</span>
              {installMethod === 'symlink' && (
                <div className="ml-auto w-5 h-5 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
                  <Check size={12} className="text-black" />
                </div>
              )}
            </div>
            <span className="text-xs opacity-70">Link to original (updates reflect)</span>
          </button>
        </div>
      </div>

      {/* About & Update Card */}
      <div className="glass-card rounded-xl p-6 mb-6 noise-overlay">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-dim)] border border-[var(--color-primary)]/30 flex items-center justify-center">
            <RefreshCw size={16} className="text-[var(--color-primary)]" />
          </div>
          <h3 className="font-mono font-semibold text-[var(--color-text)]">
            About
          </h3>
        </div>

        <div className="pl-11">
          {/* 版本号 */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-[var(--color-text-muted)] font-mono">
              Version
            </span>
            <span className="text-sm text-[var(--color-text)] font-mono font-semibold">
              v{appVersion}
            </span>
          </div>

          {/* 检查更新按钮 */}
          <button
            data-testid="settings-check-update"
            onClick={handleCheckUpdate}
            disabled={checkingUpdate}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-white/[0.02] hover:bg-white/[0.04] transition-all font-mono text-sm text-[var(--color-text)] disabled:opacity-50"
          >
            {checkingUpdate ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw size={14} />
                Check for Updates
              </>
            )}
          </button>

          {/* 检查结果 */}
          {updateInfo && updateInfo.has_update && (
            <div className="mt-4 p-3 rounded-lg border border-[var(--color-amber)]/30 bg-[var(--color-amber)]/5">
              <div className="flex items-center gap-2 mb-1">
                <Download size={14} className="text-[var(--color-amber)]" />
                <span className="font-mono text-sm text-[var(--color-amber)] font-semibold">
                  v{updateInfo.latest_version} available
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] font-mono mb-2">
                Current: v{updateInfo.current_version} → Latest: v{updateInfo.latest_version}
              </p>
              <button
                onClick={() => open(`https://github.com/wangjs-jacky/jacky-skills-package/releases/tag/v${updateInfo.latest_version}`)}
                className="inline-flex items-center gap-1 text-xs font-mono text-[var(--color-blue)] hover:underline"
              >
                <ExternalLink size={12} />
                View Release Notes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
