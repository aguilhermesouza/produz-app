import type { ReactNode } from 'react'
import type { StatusNivel } from '../types'
import { STATUS_TOKENS } from '../lib/status'
import { cx } from '../lib/format'

export function Card({
  children,
  className,
  onClick,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={cx(
        'rounded-2xl bg-white shadow-card border border-brand-100/60',
        onClick && 'cursor-pointer transition active:scale-[0.99] hover:shadow-lift',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function StatusDot({ nivel, className }: { nivel: StatusNivel; className?: string }) {
  return <span className={cx('inline-block rounded-full', STATUS_TOKENS[nivel].cor, className)} />
}

export function StatusBadge({ nivel, texto }: { nivel: StatusNivel; texto?: string }) {
  const t = STATUS_TOKENS[nivel]
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        t.chip,
      )}
    >
      <span className={cx('h-2 w-2 rounded-full', t.cor)} />
      {texto ?? t.texto}
    </span>
  )
}

export function ProgressBar({
  razao,
  nivel,
  className,
}: {
  razao: number
  nivel: StatusNivel
  className?: string
}) {
  return (
    <div className={cx('h-2.5 w-full overflow-hidden rounded-full bg-brand-100', className)}>
      <div
        className={cx('h-full rounded-full transition-all duration-500', STATUS_TOKENS[nivel].cor)}
        style={{ width: `${Math.min(100, Math.max(4, razao * 100))}%` }}
      />
    </div>
  )
}

export function ProgressRing({
  razao,
  nivel,
  size = 84,
  stroke = 9,
  children,
}: {
  razao: number
  nivel: StatusNivel
  size?: number
  stroke?: number
  children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.min(1, Math.max(0, razao))
  const cor = nivel === 'ok' ? '#16a34a' : nivel === 'warn' ? '#d97706' : '#dc2626'
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ededf0" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={cor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}

export function IconButton({
  children,
  onClick,
  label,
  className,
}: {
  children: ReactNode
  onClick?: () => void
  label: string
  className?: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cx(
        'inline-flex h-11 w-11 items-center justify-center rounded-xl text-brand-700 transition',
        'hover:bg-brand-50 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean
  onClick?: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition active:scale-95',
        active
          ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
          : 'border-brand-200 bg-white text-brand-700 hover:bg-brand-50',
      )}
    >
      {children}
    </button>
  )
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h2 className="text-sm font-bold uppercase tracking-wide text-brand-900/70">{children}</h2>
      {right}
    </div>
  )
}
