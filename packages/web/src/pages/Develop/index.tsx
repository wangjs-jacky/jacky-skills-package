import { useState } from 'react'
import { FolderOpen, Link, FileText, Code2, Sparkles } from 'lucide-react'
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
    <div className="relative z-10 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="relative">
            <Code2 size={24} className="text-[var(--color-blue)]" />
            <div className="absolute inset-0 text-[var(--color-blue)] blur-lg animate-pulse">
              <Code2 size={24} />
            </div>
          </div>
          <h2 className="text-3xl font-bold font-mono tracking-tight">
            <span className="gradient-text">Develop</span>
          </h2>
        </div>
        <p className="text-[var(--color-text-muted)] font-mono text-sm">
          Link and preview local skills
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Link New Skill Card */}
          <div className="glass-card rounded-xl p-6 noise-overlay">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-dim)] border border-[var(--color-primary)]/30 flex items-center justify-center">
                <Link size={16} className="text-[var(--color-primary)]" />
              </div>
              <h3 className="font-mono font-semibold text-[var(--color-text)]">
                Link New Skill
              </h3>
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                placeholder="/path/to/skill"
                value={skillPath}
                onChange={(e) => setSkillPath(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl bg-black/30 border border-[var(--color-border)]
                           text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]
                           font-mono text-sm focus:outline-none focus:border-[var(--color-primary)]/50
                           transition-all duration-300"
              />
              <button
                onClick={handleLink}
                className="group relative px-5 py-3 rounded-xl font-mono text-sm font-medium
                           bg-[var(--color-primary)] text-black
                           hover:shadow-[0_0_30px_var(--color-primary-glow)]
                           transition-all duration-300 btn-glow"
              >
                Link
              </button>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-amber-dim)] border border-[var(--color-amber)]/30 flex items-center justify-center">
                <FolderOpen size={16} className="text-[var(--color-amber)]" />
              </div>
              <h3 className="font-mono font-semibold text-[var(--color-text)]">
                Quick Actions
              </h3>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setSkillPath('/Users/jiashengwang/jacky-github/jacky-skills')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl
                           bg-white/[0.02] border border-[var(--color-border)]
                           text-[var(--color-text-muted)] hover:text-[var(--color-text)]
                           hover:bg-white/[0.04] transition-all duration-300
                           font-mono text-sm text-left"
              >
                <Sparkles size={16} className="text-[var(--color-primary)]" />
                Open jacky-skills directory
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Preview */}
        <div className="glass-card rounded-xl p-6 h-fit">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-blue-dim)] border border-[var(--color-blue)]/30 flex items-center justify-center">
              <FileText size={16} className="text-[var(--color-blue)]" />
            </div>
            <h3 className="font-mono font-semibold text-[var(--color-text)]">
              Preview
            </h3>
          </div>

          {selectedSkill ? (
            <div className="bg-black/30 rounded-lg p-4 border border-[var(--color-border)] max-h-[400px] overflow-auto">
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[var(--color-border)]">
                <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]"></div>
                <span className="font-mono text-xs text-[var(--color-primary)]">
                  {selectedSkill}/SKILL.md
                </span>
              </div>
              <pre className="text-xs font-mono text-[var(--color-text-muted)] whitespace-pre-wrap">
                {skillContent}
              </pre>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-[var(--color-border)] flex items-center justify-center mb-4">
                <FileText size={28} className="text-[var(--color-text-muted)]" />
              </div>
              <p className="text-[var(--color-text-muted)] font-mono text-sm">
                Select a skill to preview
              </p>
              <p className="text-[var(--color-text-muted)]/60 font-mono text-xs mt-1">
                Content will appear here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
