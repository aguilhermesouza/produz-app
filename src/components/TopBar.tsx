import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useNav } from '../nav'
import { cx } from '../lib/format'

export function TopBar({
  title,
  subtitle,
  right,
  color = '#404040',
  onBack,
}: {
  title: string
  subtitle?: string
  right?: ReactNode
  color?: string
  onBack?: () => void
}) {
  const { back, canBack } = useNav()
  return (
    <header className="relative z-20 flex items-center gap-2 border-b border-brand-200 bg-white/90 px-3 py-3 text-brand-900 backdrop-blur-md">
      {canBack ? (
        <button
          type="button"
          aria-label="Voltar"
          onClick={onBack ?? back}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-brand-500 transition hover:bg-brand-100 active:scale-95"
        >
          <ChevronLeft size={24} />
        </button>
      ) : (
        <span
          aria-hidden
          className="ml-1 h-8 w-1.5 shrink-0 rounded-full"
          style={{ background: color }}
        />
      )}
      <div className={cx('min-w-0 flex-1', !canBack && 'pl-0.5')}>
        <h1 className="truncate text-lg font-extrabold leading-tight">{title}</h1>
        {subtitle && <p className="truncate text-xs text-brand-500">{subtitle}</p>}
      </div>
      {right && <div className="flex shrink-0 items-center gap-1">{right}</div>}
    </header>
  )
}
