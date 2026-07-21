import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cx } from '../lib/format'

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  maxWidth?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 animate-fade-in bg-brand-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'relative z-10 w-full animate-slide-up rounded-t-3xl bg-white shadow-lift',
          'sm:rounded-3xl',
          maxWidth,
          'max-h-[92%] overflow-hidden flex flex-col',
        )}
      >
        <div className="flex items-center justify-between border-b border-brand-100 px-5 py-4">
          <h3 className="text-base font-bold text-brand-950">{title}</h3>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-brand-500 hover:bg-brand-50 active:scale-95"
          >
            <X size={20} />
          </button>
        </div>
        <div className="thin-scroll overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  )
}
