import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { BookOpen, RefreshCw, FileText, ChevronRight, Copy, Check } from 'lucide-react'
import { claudemdApi, type ClaudeMDInfo } from '../../api/claudemd'

export default function ClaudeMDPage() {
  const [files, setFiles] = useState<ClaudeMDInfo[]>([])
  const [selectedFile, setSelectedFile] = useState<ClaudeMDInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadFiles()
  }, [])

  async function loadFiles() {
    setLoading(true)
    const response = await claudemdApi.listFiles()
    if (response.success) {
      setFiles(response.data)
      // 默认选中全局 CLAUDE.md
      const globalFile = response.data.find((f) => f.label === 'Global')
      if (globalFile && globalFile.exists) {
        setSelectedFile(globalFile)
      } else if (response.data.length > 0 && response.data[0].exists) {
        setSelectedFile(response.data[0])
      }
    }
    setLoading(false)
  }

  async function refresh() {
    setRefreshing(true)
    await loadFiles()
    setRefreshing(false)
  }

  async function copyContent() {
    if (!selectedFile) return
    await navigator.clipboard.writeText(selectedFile.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) {
    return (
      <div className="relative z-10 flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-[var(--color-text-muted)] font-mono">
          <div className="w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          <span>加载 CLAUDE.md...</span>
        </div>
      </div>
    )
  }

  return (
    <div data-testid="claudemd-page" className="relative z-10 animate-fade-in h-full flex flex-col">
      {/* Header */}
      <div className="mb-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen size={24} className="text-[var(--color-blue)]" />
            <h2 className="text-3xl font-bold font-mono tracking-tight">
              <span className="gradient-text">CLAUDE.md</span>
            </h2>
          </div>
          <button
            onClick={refresh}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/[0.03] transition-all font-mono text-xs"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            刷新
          </button>
        </div>
        <p className="text-[var(--color-text-muted)] font-mono text-sm">
          查看 CLAUDE.md 配置文件
        </p>
      </div>

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="flex gap-2 mb-4 flex-shrink-0 flex-wrap">
          {files.map((file) => (
            <button
              key={file.path}
              onClick={() => file.exists && setSelectedFile(file)}
              disabled={!file.exists}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg border font-mono text-xs transition-all
                ${selectedFile?.path === file.path
                  ? 'bg-[var(--color-primary-dim)] border-[var(--color-primary)]/40 text-[var(--color-primary)]'
                  : file.exists
                    ? 'bg-white/[0.02] border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-white/[0.04] hover:text-[var(--color-text)]'
                    : 'bg-white/[0.01] border-[var(--color-border)]/50 text-[var(--color-text-muted)]/50 cursor-not-allowed'
                }
              `}
            >
              <FileText size={14} />
              <span>{file.label || file.path.split('/').pop()}</span>
              {file.exists && (
                <span className="text-[10px] opacity-60">{formatSize(file.size_bytes)}</span>
              )}
              {!file.exists && (
                <span className="text-[10px] opacity-40">不存在</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* 内容区域 */}
      <div className="flex-1 min-h-0 flex flex-col">
        {selectedFile && selectedFile.exists ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* 文件路径 + 操作栏 */}
            <div className="flex items-center gap-2 mb-3 px-1 flex-shrink-0">
              <div className="flex items-center gap-1 text-[var(--color-text-muted)] font-mono text-xs flex-1 min-w-0">
                <ChevronRight size={12} className="text-[var(--color-primary)] flex-shrink-0" />
                <span className="truncate">{selectedFile.path}</span>
              </div>
              <button
                onClick={copyContent}
                className="flex items-center gap-1.5 px-2 py-1 rounded border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/[0.03] transition-all font-mono text-xs"
              >
                {copied ? <Check size={12} className="text-[var(--color-primary)]" /> : <Copy size={12} />}
                {copied ? '已复制' : '复制'}
              </button>
            </div>

            {/* Markdown 渲染 */}
            <div className="flex-1 min-h-0 overflow-y-auto glass-card rounded-xl p-6">
              <div className="claudemd-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {selectedFile.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText size={48} className="mx-auto text-[var(--color-text-muted)]/30 mb-4" />
              <p className="text-[var(--color-text-muted)] font-mono text-sm">
                {files.length === 0 ? '未找到 CLAUDE.md 文件' : '选择一个文件查看'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
