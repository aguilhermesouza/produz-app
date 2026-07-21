import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, KeyboardIcon, ListChecks, SkipForward } from 'lucide-react'
import { useStore } from '../store'
import { useDevice } from '../components/DeviceFrame'
import { TopBar } from '../components/TopBar'
import { NumericPad } from '../components/NumericPad'
import { StatusBadge } from '../components/ui'
import { IncidenteSheet } from './IncidenteSheet'
import { useToast } from '../components/Toast'
import { HORAS, STATUS_TOKENS, statusJanela } from '../lib/status'
import { cx, nInt } from '../lib/format'
import type { Maquina } from '../types'

type Modo = 'percorrer' | 'lista'

export function RegistroScreen({
  empresaId,
  hourIndex,
  pecaId,
  maquinaId,
}: {
  empresaId: string
  hourIndex: number
  pecaId?: string
  maquinaId?: string
}) {
  const { empresas, maquinasDaEmpresa, producao, operacao, funcionarioNome, setProducao } = useStore()
  const { wide } = useDevice()
  const toast = useToast()
  const empresa = empresas.find((e) => e.id === empresaId)!

  const maquinas = useMemo(
    () =>
      maquinasDaEmpresa(empresaId)
        .filter((m) => m.ativa && m.funcionarioId)
        .filter((m) => !pecaId || m.pecaId === pecaId),
    [maquinasDaEmpresa, empresaId, pecaId],
  )

  const [modo, setModo] = useState<Modo>('percorrer')
  const startIdx = Math.max(0, maquinaId ? maquinas.findIndex((m) => m.id === maquinaId) : 0)
  const [cursor, setCursor] = useState(startIdx)
  const [valor, setValor] = useState('')
  const [incMaquina, setIncMaquina] = useState<Maquina | null>(null)

  const atual = maquinas[cursor]

  // Carrega o valor já registrado ao trocar de máquina.
  useEffect(() => {
    if (!atual) return
    const v = producao[atual.id]?.[hourIndex]
    setValor(v !== null && v !== undefined ? String(v) : '')
  }, [cursor, atual, producao, hourIndex])

  const preenchidas = maquinas.filter(
    (m) => producao[m.id]?.[hourIndex] !== null && producao[m.id]?.[hourIndex] !== undefined,
  ).length

  const salvarEProximo = () => {
    if (!atual) return
    setProducao(atual.id, hourIndex, valor === '' ? null : Number(valor))
    toast(`${atual.codigo} salvo`)
    if (cursor < maquinas.length - 1) setCursor((c) => c + 1)
  }

  const nivelAtual = atual ? statusJanela(valor === '' ? null : Number(valor), atual.metaHora) : null

  return (
    <div className="flex h-full flex-col">
      <TopBar
        title="Registrar produção"
        subtitle={`${empresa.nome} · ${HORAS[hourIndex]}`}
        color={empresa.cor}
      />

      {/* Alternador de modo + progresso */}
      <div className="relative z-10 border-b border-brand-100 bg-white px-3 py-2.5">
        <div className="mb-2 inline-flex w-full rounded-xl bg-brand-50 p-1">
          <ModoBtn ativo={modo === 'percorrer'} onClick={() => setModo('percorrer')} icon={<KeyboardIcon size={15} />}>
            Percorrer
          </ModoBtn>
          <ModoBtn ativo={modo === 'lista'} onClick={() => setModo('lista')} icon={<ListChecks size={15} />}>
            Lista
          </ModoBtn>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-100">
            <div
              className="h-full rounded-full bg-brand-600 transition-all"
              style={{ width: `${maquinas.length ? (preenchidas / maquinas.length) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs font-bold text-brand-600">
            {preenchidas}/{maquinas.length}
          </span>
        </div>
      </div>

      {maquinas.length === 0 ? (
        <p className="p-8 text-center text-sm text-brand-400">
          Nenhuma máquina com funcionário vinculado nesta seleção.
        </p>
      ) : modo === 'percorrer' ? (
        <div className="thin-scroll flex flex-1 flex-col overflow-y-auto px-4 py-4">
          {atual && (
            <>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-brand-400">
                    Máquina {cursor + 1} de {maquinas.length}
                  </p>
                  <h2 className="text-2xl font-black text-brand-950">{atual.codigo}</h2>
                  <p className="text-sm font-medium text-brand-600">{operacao(atual.operacaoId)?.nome}</p>
                  <p className="text-xs text-brand-400">{funcionarioNome(atual.funcionarioId)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-brand-400">meta/hora</p>
                  <p className="text-2xl font-black text-brand-700">{atual.metaHora}</p>
                </div>
              </div>

              {/* Display do valor + status ao vivo */}
              <div
                className={cx(
                  'mb-3 flex items-center justify-between rounded-2xl border-2 px-5 py-4',
                  nivelAtual ? cx(STATUS_TOKENS[nivelAtual].bg, STATUS_TOKENS[nivelAtual].borda) : 'border-brand-100 bg-brand-50',
                )}
              >
                <div>
                  <p className="text-xs font-semibold text-brand-400">Produção na janela</p>
                  <p className={cx('text-4xl font-black leading-none', nivelAtual ? STATUS_TOKENS[nivelAtual].corTexto : 'text-brand-300')}>
                    {valor === '' ? '–' : nInt(Number(valor))}
                  </p>
                </div>
                {nivelAtual && <StatusBadge nivel={nivelAtual} />}
              </div>

              <div className="mx-auto w-full max-w-xs">
                <NumericPad value={valor} onChange={setValor} />
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIncMaquina(atual)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-3.5 text-sm font-bold text-amber-700 active:scale-95"
                >
                  <AlertTriangle size={18} />
                  Incidente
                </button>
                <button
                  type="button"
                  onClick={() => cursor < maquinas.length - 1 && setCursor((c) => c + 1)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-2xl border-2 border-brand-200 bg-white px-4 py-3.5 text-sm font-bold text-brand-600 active:scale-95"
                >
                  <SkipForward size={18} />
                  Pular
                </button>
                <button
                  type="button"
                  onClick={salvarEProximo}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-brand-600 py-3.5 text-base font-bold text-white shadow-lift active:scale-95"
                >
                  <Check size={20} />
                  {cursor < maquinas.length - 1 ? 'Salvar e próxima' : 'Salvar'}
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <ListaRegistro
          maquinas={maquinas}
          hourIndex={hourIndex}
          wide={wide}
          onIncidente={setIncMaquina}
        />
      )}

      <IncidenteSheet
        maquina={incMaquina}
        hourIndex={hourIndex}
        open={incMaquina !== null}
        onClose={() => setIncMaquina(null)}
      />
    </div>
  )
}

function ModoBtn({
  ativo,
  onClick,
  icon,
  children,
}: {
  ativo: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-bold transition',
        ativo ? 'bg-white text-brand-700 shadow-sm' : 'text-brand-500',
      )}
    >
      {icon}
      {children}
    </button>
  )
}

function ListaRegistro({
  maquinas,
  hourIndex,
  wide,
  onIncidente,
}: {
  maquinas: Maquina[]
  hourIndex: number
  wide: boolean
  onIncidente: (m: Maquina) => void
}) {
  const { producao, operacao, funcionarioNome, setProducao } = useStore()

  return (
    <div className="thin-scroll flex-1 overflow-y-auto px-3 py-3">
      <div className={cx('grid gap-2', wide ? 'grid-cols-2' : 'grid-cols-1')}>
        {maquinas.map((m) => {
          const v = producao[m.id]?.[hourIndex]
          const nivel = statusJanela(v ?? null, m.metaHora)
          const t = nivel ? STATUS_TOKENS[nivel] : null
          return (
            <div
              key={m.id}
              className={cx('flex items-center gap-3 rounded-xl border-2 p-2.5', t ? cx(t.bg, t.borda) : 'border-brand-100 bg-white')}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-brand-950">
                  {m.codigo} · <span className="font-medium text-brand-600">{operacao(m.operacaoId)?.nome}</span>
                </p>
                <p className="truncate text-xs text-brand-400">
                  {funcionarioNome(m.funcionarioId)} · meta {m.metaHora}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onIncidente(m)}
                aria-label="Registrar incidente"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-amber-500 hover:bg-amber-50 active:scale-95"
              >
                <AlertTriangle size={17} />
              </button>
              <input
                inputMode="numeric"
                value={v ?? ''}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '').slice(0, 4)
                  setProducao(m.id, hourIndex, raw === '' ? null : Number(raw))
                }}
                placeholder="–"
                className={cx(
                  'w-16 rounded-lg border-2 bg-white py-2 text-center text-lg font-black outline-none focus:border-brand-400',
                  t ? cx(t.borda, t.corTexto) : 'border-brand-200 text-brand-950',
                )}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
