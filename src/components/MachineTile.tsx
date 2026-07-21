import { AlertTriangle, UserX } from 'lucide-react'
import type { Maquina } from '../types'
import { cx, nInt } from '../lib/format'
import { STATUS_TOKENS, statusJanela } from '../lib/status'

/** Quadradinho de máquina no mapa de um horário. */
export function MachineTile({
  maquina,
  realizado,
  operacaoNome,
  funcionarioNome,
  temIncidente,
  compact,
  onClick,
}: {
  maquina: Maquina
  realizado: number | null
  operacaoNome: string
  funcionarioNome: string
  temIncidente: boolean
  compact: boolean
  onClick?: () => void
}) {
  const nivel = statusJanela(realizado, maquina.metaHora)
  const t = nivel ? STATUS_TOKENS[nivel] : null
  const semFunc = !maquina.funcionarioId

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={`${maquina.codigo} · ${operacaoNome}`}
        className={cx(
          'relative flex aspect-square flex-col items-center justify-center rounded-3xl border-2 text-center transition active:scale-95',
          t ? cx(t.bg, t.borda) : 'border-dashed border-brand-200 bg-brand-50 text-brand-300',
        )}
      >
        <span className="text-[10px] font-bold text-brand-700">{maquina.codigo}</span>
        <span className={cx('text-sm font-extrabold', t?.corTexto ?? 'text-brand-300')}>
          {realizado !== null ? nInt(realizado) : '–'}
        </span>
        {temIncidente && (
          <AlertTriangle size={11} className="absolute right-0.5 top-0.5 text-amber-500" />
        )}
        {semFunc && <UserX size={11} className="absolute left-0.5 top-0.5 text-brand-400" />}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'flex items-center gap-3 rounded-3xl border-2 p-3 text-left transition active:scale-[0.98]',
        t ? cx(t.bg, t.borda) : 'border-dashed border-brand-200 bg-brand-50',
      )}
    >
      <div className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', t?.cor ?? 'bg-brand-200')}>
        <span className="text-xs font-black text-white">{maquina.codigo.replace('M-', '')}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-brand-950">{operacaoNome}</p>
        <p className="truncate text-xs text-brand-500">
          {semFunc ? 'Sem funcionário' : funcionarioNome}
        </p>
      </div>
      <div className="text-right">
        <p className={cx('text-lg font-extrabold leading-none', t?.corTexto ?? 'text-brand-300')}>
          {realizado !== null ? nInt(realizado) : '–'}
        </p>
        <p className="text-[11px] text-brand-400">meta {maquina.metaHora}</p>
      </div>
      {temIncidente && <AlertTriangle size={16} className="shrink-0 text-amber-500" />}
    </button>
  )
}
