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

  return (
    <div
      className={`fixed bottom-4 right-4 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
        toast.type === 'success'
          ? 'bg-green-500 text-white'
          : 'bg-red-500 text-white'
      }`}
    >
      {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
      <span>{toast.message}</span>
      <button onClick={hideToast} className="ml-2 hover:opacity-80">
        <X size={16} />
      </button>
    </div>
  )
}
