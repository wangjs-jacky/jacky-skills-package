import { useEffect } from 'react'
import { useStore } from '../../stores'
import { X, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react'

export default function Toast() {
  const { toast, hideToast } = useStore()

  useEffect(() => {
    if (toast) {
      // 有 action 按钮时不自动关闭，给用户时间操作
      const timer = toast.action ? null : setTimeout(hideToast, 3000)
      return () => { if (timer) clearTimeout(timer) }
    }
  }, [toast, hideToast])

  if (!toast) return null

  const isWarning = toast.type === 'warning'
  const isError = toast.type === 'error'
  const isSuccess = toast.type === 'success'

  const color = isWarning
    ? 'var(--color-amber)'
    : isError
      ? 'var(--color-red)'
      : 'var(--color-primary)'

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 animate-fade-in
        flex items-center gap-3 px-5 py-4 rounded-xl
        border backdrop-blur-xl shadow-2xl
        font-mono text-sm`}
      style={{
        background: `color-mix(in srgb, ${color} 10%, transparent)`,
        borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
        color,
      }}
    >
      {/* Glow effect */}
      <div
        className="absolute inset-0 rounded-xl blur-xl -z-10"
        style={{ background: `color-mix(in srgb, ${color} 20%, transparent)` }}
      ></div>

      {/* Icon */}
      <div className="flex-shrink-0" style={{ color }}>
        {isWarning ? <AlertTriangle size={18} /> : isError ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
      </div>

      {/* Message */}
      <span className="text-[var(--color-text)]">{toast.message}</span>

      {/* Action button */}
      {toast.action && (
        <button
          onClick={() => { toast.action!.onClick(); hideToast() }}
          className="flex-shrink-0 px-3 py-1 rounded-lg font-mono text-xs font-medium transition-all duration-200"
          style={{
            background: `color-mix(in srgb, ${color} 15%, transparent)`,
            border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
            color,
          }}
        >
          {toast.action.label}
        </button>
      )}

      {/* Close button */}
      <button
        onClick={hideToast}
        className="flex-shrink-0 p-1 rounded-lg transition-colors"
        style={{ color }}
      >
        <X size={14} />
      </button>
    </div>
  )
}
