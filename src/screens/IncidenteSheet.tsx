import { useState } from 'react'
import type { Maquina, TipoIncidente } from '../types'
import { BottomSheet } from '../components/BottomSheet'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { TIPOS_INCIDENTE, rotuloIncidente } from '../lib/incidentes'
import { HORAS } from '../lib/status'
import { cx } from '../lib/format'

export function IncidenteSheet({
  maquina,
  hourIndex,
  open,
  onClose,
}: {
  maquina: Maquina | null
  hourIndex: number
  open: boolean
  onClose: () => void
}) {
  const { addIncidente, operacao, incidentesDaMaquina } = useStore()
  const toast = useToast()
  const [tipo, setTipo] = useState<TipoIncidente | null>(null)
  const [minutos, setMinutos] = useState('')
  const [obs, setObs] = useState('')

  if (!maquina) return null
  const historico = incidentesDaMaquina(maquina.id)

  const salvar = () => {
    if (!tipo) return
    addIncidente(maquina.id, hourIndex, tipo, obs || undefined, minutos ? Number(minutos) : undefined)
    toast(`Incidente registrado em ${maquina.codigo}`)
    setTipo(null)
    setMinutos('')
    setObs('')
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={`Incidente · ${maquina.codigo}`}>
      <p className="mb-3 text-sm text-brand-500">
        {operacao(maquina.operacaoId)?.nome} · janela das {HORAS[hourIndex]}
      </p>

      <p className="mb-2 text-sm font-semibold text-brand-600">Tipo do incidente</p>
      <div className="mb-4 grid grid-cols-2 gap-2">
        {TIPOS_INCIDENTE.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTipo(id)}
            className={cx(
              'flex items-center gap-2 rounded-xl border-2 p-3 text-left text-sm font-semibold transition active:scale-95',
              tipo === id
                ? 'border-brand-600 bg-brand-50 text-brand-800'
                : 'border-brand-100 bg-white text-brand-700 hover:bg-brand-50',
            )}
          >
            <Icon size={18} className="shrink-0 text-brand-500" />
            {label}
          </button>
        ))}
      </div>

      <label className="mb-1 block text-sm font-semibold text-brand-600">
        Minutos parado (opcional)
      </label>
      <input
        inputMode="numeric"
        value={minutos}
        onChange={(e) => setMinutos(e.target.value.replace(/\D/g, ''))}
        placeholder="ex.: 15"
        className="mb-4 w-full rounded-xl border-2 border-brand-100 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
      />

      <label className="mb-1 block text-sm font-semibold text-brand-600">Observação (opcional)</label>
      <textarea
        value={obs}
        onChange={(e) => setObs(e.target.value)}
        rows={2}
        placeholder="Descreva o ocorrido…"
        className="mb-4 w-full resize-none rounded-xl border-2 border-brand-100 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
      />

      {historico.length > 0 && (
        <div className="mb-4 rounded-xl bg-brand-50 p-3">
          <p className="mb-2 text-xs font-bold uppercase text-brand-500">Histórico do dia</p>
          <ul className="space-y-1.5">
            {historico.map((h) => (
              <li key={h.id} className="flex items-center justify-between text-sm text-brand-800">
                <span>{rotuloIncidente(h.tipo)}</span>
                <span className="text-xs text-brand-400">
                  {HORAS[h.hourIndex]} · {h.criadoEm}
                  {h.minutosParado ? ` · ${h.minutosParado}min` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        disabled={!tipo}
        onClick={salvar}
        className="w-full rounded-2xl bg-brand-600 py-3.5 text-base font-bold text-white shadow-lift transition active:scale-95 disabled:opacity-40"
      >
        Registrar incidente
      </button>
    </BottomSheet>
  )
}
