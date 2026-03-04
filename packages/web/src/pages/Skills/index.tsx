import { useEffect } from 'react'
import { useStore } from '../../stores'
import { skillsApi } from '../../api/client'
import SkillList from './SkillList'

export default function SkillsPage() {
  const { skills, setSkills, isLoading, setIsLoading, showToast } = useStore()

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
      if (enable) {
        const response = await skillsApi.install(name, env, true)
        if (response.success) {
          showToast(`Installed ${name} to ${env}`, 'success')
          loadSkills()
        }
      } else {
        const response = await skillsApi.uninstall(name, env, true)
        if (response.success) {
          showToast(`Removed ${name} from ${env}`, 'success')
          loadSkills()
        }
      }
    } catch (err) {
      const action = enable ? 'install to' : 'remove from'
      showToast(`Failed to ${action} ${env}`, 'error')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Skills</h2>
        <p className="text-gray-500 dark:text-gray-400">
          Manage your linked and installed skills
        </p>
      </div>
      <SkillList skills={skills} onUnlink={handleUnlink} onToggleEnv={handleToggleEnv} />
    </div>
  )
}
