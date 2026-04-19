import { useState, useEffect, useCallback } from 'react'
import { Download, X, ChevronDown, ChevronUp, Loader2, CheckCircle, ExternalLink } from 'lucide-react'
import {
  checkForUpdate,
  downloadUpdate,
  onDownloadProgress,
  type UpdateInfo,
  type DownloadProgress,
} from '../../api/update'

type DownloadState = 'idle' | 'downloading' | 'done' | 'error'

export default function UpdateBanner() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [downloadState, setDownloadState] = useState<DownloadState>('idle')
  const [progress, setProgress] = useState<DownloadProgress | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    // 启动时静默检查更新
    checkForUpdate()
      .then((info) => {
        if (info.has_update) {
          setUpdateInfo(info)
        }
      })
      .catch((err) => {
        console.warn('[Auto update check failed]', err)
      })
  }, [])

  // 监听下载进度
  useEffect(() => {
    if (downloadState !== 'downloading') return

    let unlisten: (() => void) | undefined
    onDownloadProgress((p) => {
      setProgress(p)
    }).then((fn) => {
      unlisten = fn
    })

    return () => {
      unlisten?.()
    }
  }, [downloadState])

  const handleDownload = useCallback(async () => {
    if (!updateInfo) return

    setDownloadState('downloading')
    setErrorMsg('')

    try {
      await downloadUpdate(updateInfo.download_url, updateInfo.latest_version)
      setDownloadState('done')
    } catch (err) {
      setDownloadState('error')
      setErrorMsg(String(err))
    }
  }, [updateInfo])

  // 无更新或已关闭 → 不渲染
  if (!updateInfo || dismissed) return null

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-slide-down">
      <div className="mx-auto max-w-2xl mt-2 px-4">
        <div className="glass-card rounded-xl border border-[var(--color-amber)]/30 bg-[var(--color-bg-elevated)]/95 backdrop-blur-md overflow-hidden">
          {/* 主内容 */}
          <div className="flex items-center gap-3 px-4 py-3">
            {/* 图标 */}
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[var(--color-amber-dim)] border border-[var(--color-amber)]/30 flex items-center justify-center">
              <Download size={16} className="text-[var(--color-amber)]" />
            </div>

            {/* 文字信息 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 font-mono text-sm">
                <span className="text-[var(--color-text)]">
                  新版本可用
                </span>
                <span className="text-[var(--color-text-muted)]">
                  v{updateInfo.current_version}
                </span>
                <span className="text-[var(--color-amber)]">→</span>
                <span className="text-[var(--color-amber)] font-semibold">
                  v{updateInfo.latest_version}
                </span>
              </div>
              {updateInfo.file_size > 0 && (
                <div className="text-xs text-[var(--color-text-muted)] font-mono mt-0.5">
                  {formatSize(updateInfo.file_size)}
                </div>
              )}
            </div>

            {/* 展开按钮 */}
            {updateInfo.release_notes && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors p-1"
              >
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}

            {/* 操作按钮 */}
            <div className="flex items-center gap-2">
              {downloadState === 'idle' && (
                <button
                  onClick={handleDownload}
                  className="px-3 py-1.5 rounded-lg bg-[var(--color-amber)] text-black font-mono text-xs font-semibold hover:brightness-110 transition-all flex items-center gap-1.5"
                >
                  <Download size={12} />
                  下载并安装
                </button>
              )}
              {downloadState === 'downloading' && (
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--color-amber)] rounded-full transition-all duration-300"
                      style={{ width: `${progress?.percentage ?? 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-[var(--color-amber)]">
                    {progress?.percentage ?? 0}%
                  </span>
                  <Loader2 size={14} className="animate-spin text-[var(--color-amber)]" />
                </div>
              )}
              {downloadState === 'done' && (
                <span className="flex items-center gap-1.5 text-xs font-mono text-[var(--color-primary)]">
                  <CheckCircle size={14} />
                  已打开 DMG，请拖拽安装
                </span>
              )}
              {downloadState === 'error' && (
                <button
                  onClick={handleDownload}
                  className="px-3 py-1.5 rounded-lg bg-[var(--color-red)]/20 border border-[var(--color-red)]/40 text-[var(--color-red)] font-mono text-xs hover:bg-[var(--color-red)]/30 transition-all flex items-center gap-1.5"
                >
                  重试下载
                </button>
              )}
            </div>

            {/* 关闭按钮 */}
            <button
              onClick={() => setDismissed(true)}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors p-1"
            >
              <X size={14} />
            </button>
          </div>

          {/* Release Notes 展开区域 */}
          {expanded && updateInfo.release_notes && (
            <div className="px-4 pb-3 border-t border-[var(--color-border)]">
              <div className="mt-2 text-xs text-[var(--color-text-muted)] font-mono max-h-40 overflow-auto whitespace-pre-wrap">
                {updateInfo.release_notes}
              </div>
            </div>
          )}

          {/* 错误信息 */}
          {downloadState === 'error' && errorMsg && (
            <div className="px-4 pb-2 text-xs text-[var(--color-red)] font-mono">
              {errorMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
