import { useEffect } from 'react'
import { useStore } from '../../stores'
import { X, CheckCircle, AlertCircle } from 'lucide-react'

export default function Toast() {
  const { toast, hideToast } = useStore()

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(hideToast, 3000)
      return () => clearTimeout(timer)
    }
  }, [toast, hideToast])

  if (!toast) return null

  const isSuccess = toast.type === 'success'

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 animate-fade-in
        flex items-center gap-3 px-5 py-4 rounded-xl
        border backdrop-blur-xl shadow-2xl
        font-mono text-sm
        ${isSuccess
          ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]'
          : 'bg-[var(--color-red)]/10 border-[var(--color-red)]/30 text-[var(--color-red)]'
        }`}
    >
      {/* Glow effect */}
      <div
        className={`absolute inset-0 rounded-xl blur-xl -z-10
          ${isSuccess ? 'bg-[var(--color-primary)]/20' : 'bg-[var(--color-red)]/20'}`}
      ></div>

      {/* Icon */}
      <div className={`flex-shrink-0 ${isSuccess ? 'text-[var(--color-primary)]' : 'text-[var(--color-red)]'}`}>
        {isSuccess ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
      </div>

      {/* Message */}
      <span className="text-[var(--color-text)]">{toast.message}</span>

      {/* Close button */}
      <button
        onClick={hideToast}
        className={`flex-shrink-0 p-1 rounded-lg transition-colors
          ${isSuccess
            ? 'hover:bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
            : 'hover:bg-[var(--color-red)]/20 text-[var(--color-red)]'
          }`}
      >
        <X size={14} />
      </button>
    </div>
  )
}
