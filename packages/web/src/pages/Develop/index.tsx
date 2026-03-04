import { useState, useEffect } from 'react'
import { FolderOpen, Link, FileText, Code2, FolderSync, Trash2, RefreshCw } from 'lucide-react'
import { useStore } from '../../stores'
import { skillsApi, type SourceFolder } from '../../api/client'

export default function DevelopPage() {
  const { showToast } = useStore()
  const [skillPath, setSkillPath] = useState('')
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null)
  const [skillContent, setSkillContent] = useState<string>('')
  const [sourceFolders, setSourceFolders] = useState<SourceFolder[]>([])

  useEffect(() => {
    loadSourceFolders()
  }, [])

  async function loadSourceFolders() {
    try {
      const response = await skillsApi.listSourceFolders()
      if (response.success) {
        setSourceFolders(response.data)
      }
    } catch (err) {
      // 忽略错误
    }
  }

  async function handleLink() {
    if (!skillPath.trim()) {
      showToast('Please enter a path', 'error')
      return
    }

    try {
      const response = await skillsApi.link(skillPath)
      if (response.success) {
        const { linked, count } = response.data
        showToast(`Linked ${count} skill${count > 1 ? 's' : ''}: ${linked.join(', ')}`, 'success')
        setSkillPath('')
        loadSourceFolders() // 刷新源文件夹列表
      }
    } catch (err) {
      showToast('Failed to link skills', 'error')
    }
  }

  async function handleRemoveFolder(path: string) {
    try {
      const response = await skillsApi.removeSourceFolder(path)
      if (response.success) {
        showToast('Folder removed', 'success')
        loadSourceFolders()
      }
    } catch (err) {
      showToast('Failed to remove folder', 'error')
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
          {/* Batch Link Card */}
          <div className="glass-card rounded-xl p-6 noise-overlay">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-dim)] border border-[var(--color-primary)]/30 flex items-center justify-center">
                <FolderSync size={16} className="text-[var(--color-primary)]" />
              </div>
              <h3 className="font-mono font-semibold text-[var(--color-text)]">
                Batch Link Skills
              </h3>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mb-4 pl-11">
              Enter a directory path. All subdirectories containing SKILL.md will be linked.
            </p>

            <div className="flex gap-3">
              <input
                type="text"
                placeholder="/path/to/skills/directory"
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
                Link All
              </button>
            </div>
          </div>

          {/* Source Folders Card */}
          <div className="glass-card rounded-xl p-6 noise-overlay">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-amber-dim)] border border-[var(--color-amber)]/30 flex items-center justify-center">
                  <FolderOpen size={16} className="text-[var(--color-amber)]" />
                </div>
                <h3 className="font-mono font-semibold text-[var(--color-text)]">
                  Source Folders
                </h3>
              </div>
              <button
                onClick={loadSourceFolders}
                className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/[0.04] transition-all"
                title="Refresh"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {sourceFolders.length > 0 ? (
              <div className="space-y-2">
                {sourceFolders.map((folder) => (
                  <div
                    key={folder.path}
                    className="group flex items-center justify-between gap-3 px-4 py-3 rounded-xl
                               bg-white/[0.02] border border-[var(--color-border)]
                               hover:bg-white/[0.04] transition-all duration-300"
                  >
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => setSkillPath(folder.path)}
                    >
                      <p className="font-mono text-sm text-[var(--color-text)] truncate">
                        {folder.path}
                      </p>
                      <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
                        {folder.skillNames.length} skill{folder.skillNames.length !== 1 ? 's' : ''} • Added {new Date(folder.addedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveFolder(folder.path)}
                      className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-red)] hover:bg-[var(--color-red-dim)] transition-all opacity-0 group-hover:opacity-100"
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-[var(--color-text-muted)] font-mono text-sm">
                  No source folders yet
                </p>
                <p className="text-[var(--color-text-muted)]/60 font-mono text-xs mt-1">
                  Link a directory to get started
                </p>
              </div>
            )}
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
