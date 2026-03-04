import { useEffect, useState } from 'react'
import { useStore } from '../../stores'
import { configApi, environmentsApi, type EnvironmentInfo } from '../../api/client'
import { Settings, Check } from 'lucide-react'

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
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-gray-500 dark:text-gray-400">
          Configure j-skills preferences
        </p>
      </div>

      <div className="border border-[var(--color-border)] rounded-lg p-4 mb-6">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <Settings size={18} />
          Default Environments
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Select the environments to use by default when installing skills.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {environments.map((env) => (
            <button
              key={env.name}
              onClick={() => toggleEnv(env.name)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-colors ${
                selectedEnvs.includes(env.name)
                  ? 'border-[var(--color-primary)] bg-blue-50 dark:bg-blue-900/20'
                  : 'border-[var(--color-border)] hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <span>{env.label}</span>
              {selectedEnvs.includes(env.name) && (
                <Check size={16} className="text-[var(--color-primary)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={saveConfig}
        className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90"
      >
        Save Settings
      </button>
    </div>
  )
}
