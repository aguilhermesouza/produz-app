import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2 } from 'lucide-react'

interface ToastItem {
  id: number
  msg: string
}

const ToastContext = createContext<(msg: string) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const push = useCallback((msg: string) => {
    const id = Date.now() + Math.random()
    setItems((prev) => [...prev, { id, msg }])
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 2200)
  }, [])

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        {items.map((t) => (
          <div
            key={t.id}
            className="animate-toast-in flex items-center gap-2 rounded-full bg-brand-950/90 px-4 py-2.5 text-sm font-medium text-white shadow-lift"
          >
            <CheckCircle2 size={16} className="text-green-400" />
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastContext)
}
