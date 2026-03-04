import { useState } from 'react'
import { FolderOpen, Link, FileText } from 'lucide-react'
import { useStore } from '../../stores'
import { skillsApi } from '../../api/client'

export default function DevelopPage() {
  const { showToast } = useStore()
  const [skillPath, setSkillPath] = useState('')
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null)
  const [skillContent, setSkillContent] = useState<string>('')

  async function handleLink() {
    if (!skillPath.trim()) {
      showToast('Please enter a skill path', 'error')
      return
    }

    try {
      const response = await skillsApi.link(skillPath)
      if (response.success) {
        showToast(`Linked: ${response.data.name}`, 'success')
        setSkillPath('')
      }
    } catch (err) {
      showToast('Failed to link skill', 'error')
    }
  }

  async function loadSkillContent(skillName: string) {
    try {
      const response = await skillsApi.getFileContent(skillName, 'SKILL.md')
      if (response.success) {
        setSelectedSkill(skillName)
        setSkillContent(response.data.content)
      }
    } catch (err) {
      showToast('Failed to load skill content', 'error')
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Develop</h2>
        <p className="text-gray-500 dark:text-gray-400">
          Link and preview local skills
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="border border-[var(--color-border)] rounded-lg p-4">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <Link size={18} />
              Link New Skill
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="/path/to/skill"
                value={skillPath}
                onChange={(e) => setSkillPath(e.target.value)}
                className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
              <button
                onClick={handleLink}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90"
              >
                Link
              </button>
            </div>
          </div>

          <div className="mt-4 border border-[var(--color-border)] rounded-lg p-4">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <FolderOpen size={18} />
              Quick Actions
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => setSkillPath('/Users/jacky/jacky-github/jacky-skills')}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Open jacky-skills directory
              </button>
            </div>
          </div>
        </div>

        <div className="border border-[var(--color-border)] rounded-lg p-4">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <FileText size={18} />
            Preview
          </h3>
          {selectedSkill ? (
            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-auto text-sm">
              {skillContent}
            </pre>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Select a skill to preview
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
