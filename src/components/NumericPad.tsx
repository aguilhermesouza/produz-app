import { Delete } from 'lucide-react'
import { cx } from '../lib/format'

/** Teclado numérico grande, otimizado para toque com uma mão. */
export function NumericPad({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}) {
  const press = (d: string) => {
    if (d === 'del') {
      onChange(value.slice(0, -1))
      return
    }
    const next = (value + d).replace(/^0+(?=\d)/, '')
    if (next.length <= 4) onChange(next)
  }

  const teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'del']

  return (
    <div className="grid grid-cols-3 gap-2">
      {teclas.map((k) => {
        if (k === 'clear') {
          return (
            <button
              key={k}
              type="button"
              onClick={() => onChange('')}
              className="rounded-2xl bg-brand-50 py-4 text-sm font-bold text-brand-600 transition active:scale-95 hover:bg-brand-100"
            >
              Limpar
            </button>
          )
        }
        if (k === 'del') {
          return (
            <button
              key={k}
              type="button"
              onClick={() => press('del')}
              aria-label="Apagar"
              className="flex items-center justify-center rounded-2xl bg-brand-50 py-4 text-brand-600 transition active:scale-95 hover:bg-brand-100"
            >
              <Delete size={22} />
            </button>
          )
        }
        return (
          <button
            key={k}
            type="button"
            onClick={() => press(k)}
            className={cx(
              'rounded-2xl bg-white py-4 text-2xl font-extrabold text-brand-950 shadow-card transition active:scale-95 hover:bg-brand-50',
            )}
          >
            {k}
          </button>
        )
      })}
    </div>
  )
}
