import { cx } from '../lib/format'
import { STATUS_TOKENS } from '../lib/status'
import type { HoraAgg } from '../lib/aggregates'
import { nInt } from '../lib/format'

/** Quadradinho da timeline de horários. */
export function HourCell({
  hora,
  label,
  atual,
  selecionado,
  onClick,
}: {
  hora: HoraAgg
  label: string
  atual?: boolean
  selecionado?: boolean
  onClick?: () => void
}) {
  const t = hora.nivel ? STATUS_TOKENS[hora.nivel] : null
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={hora.futura}
      className={cx(
        'relative flex min-w-[72px] flex-col items-center gap-0.5 rounded-xl border-2 px-2 py-2.5 transition active:scale-95',
        hora.futura
          ? 'border-dashed border-brand-200 bg-brand-50/50 text-brand-300'
          : cx('bg-white text-brand-950', t?.borda),
        selecionado && !hora.futura && 'ring-2 ring-brand-500 ring-offset-1',
      )}
    >
      <span className="text-[11px] font-semibold text-brand-400">{label}</span>
      {hora.futura ? (
        <span className="text-base font-bold text-brand-300">–</span>
      ) : (
        <>
          <span className={cx('text-base font-extrabold leading-none', t?.corTexto)}>
            {hora.realizado !== null ? nInt(hora.realizado) : '–'}
          </span>
          <span className="text-[10px] font-medium leading-none text-brand-400">
            / {nInt(hora.meta)}
          </span>
        </>
      )}
      {!hora.futura && t && <span className={cx('mt-0.5 h-1.5 w-6 rounded-full', t.cor)} />}
      {atual && (
        <span className="absolute -top-1.5 right-1 rounded-full bg-brand-700 px-1.5 text-[9px] font-bold text-white">
          agora
        </span>
      )}
    </button>
  )
}
