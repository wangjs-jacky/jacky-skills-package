import { useEffect, useState } from 'react'
import { useStore } from '../../stores'
import { configApi, environmentsApi, type EnvironmentInfo } from '../../api/client'
import { Settings, Check, Terminal, Cpu } from 'lucide-react'

export default function SettingsPage() {
  const { config, setConfig, showToast } = useStore()
  const [environments, setEnvironments] = useState<EnvironmentInfo[]>([])
  const [selectedEnvs, setSelectedEnvs] = useState<string[]>([])

  useEffect(() => {
    loadConfig()
    loadEnvironments()
  }, [])

  async function loadConfig() {
    try {
      const response = await configApi.get()
      if (response.success) {
        setConfig(response.data)
        setSelectedEnvs(response.data.defaultEnvironments || [])
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

  async function saveConfig() {
    try {
      const response = await configApi.update({
        ...config,
        defaultEnvironments: selectedEnvs,
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
    setSelectedEnvs((prev) =>
      prev.includes(envName)
        ? prev.filter((e) => e !== envName)
        : [...prev, envName]
    )
  }

  return (
    <div className="relative z-10 animate-fade-in">
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

      {/* Save Button */}
      <button
        onClick={saveConfig}
        className="group relative px-6 py-3 rounded-xl font-mono text-sm font-medium
                   bg-[var(--color-primary)] text-black
                   hover:shadow-[0_0_30px_var(--color-primary-glow)]
                   transition-all duration-300 btn-glow"
      >
        <span className="relative z-10">Save Settings</span>
      </button>
    </div>
  )
}
