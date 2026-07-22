import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, KeyboardIcon, ListChecks, Plus, SkipForward, X } from 'lucide-react'
import { useStore } from '../store'
import { useDevice } from '../components/DeviceFrame'
import { TopBar } from '../components/TopBar'
import { NumericPad } from '../components/NumericPad'
import { IncidenteSheet } from './IncidenteSheet'
import { useToast } from '../components/Toast'
import { HORAS, STATUS_TOKENS, statusJanela } from '../lib/status'
import { cx } from '../lib/format'
import type { Maquina } from '../types'

type Modo = 'percorrer' | 'lista'
type ExtraOp = { id: string; operacaoId: string }
type FieldValues = Record<string, { meta: string; realizado: string }>
type ActiveField = { id: string; campo: 'meta' | 'realizado' } | null

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
  const { empresas, maquinasDaEmpresa, producao, operacao, operacoes, funcionarioNome, setProducao } = useStore()
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
  const [incMaquina, setIncMaquina] = useState<Maquina | null>(null)
  const [extrasMap, setExtrasMap] = useState<Record<string, ExtraOp[]>>({})
  const [fieldValues, setFieldValues] = useState<FieldValues>({})
  const [activeField, setActiveField] = useState<ActiveField>(null)
  const [numpadValue, setNumpadValue] = useState('')

  // Foca um campo e reinicia o NumericPad vazio (sobreescreve ao digitar)
  const focusField = (field: ActiveField) => {
    setActiveField(field)
    setNumpadValue('')
  }

  const atual = maquinas[cursor]
  const mainKey = atual ? `main-${atual.id}` : ''
  const extras = extrasMap[atual?.id ?? ''] ?? []
  const setExtras = (ops: ExtraOp[]) =>
    setExtrasMap((prev) => ({ ...prev, [atual?.id ?? '']: ops }))

  // Re-inicializa campos ao trocar de máquina
  useEffect(() => {
    if (!atual) return
    const v = producao[atual.id]?.[hourIndex]
    setFieldValues((prev) => ({
      ...prev,
      [`main-${atual.id}`]: {
        meta: String(atual.metaHora),
        realizado: v !== null && v !== undefined ? String(v) : '',
      },
    }))
    setActiveField(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, hourIndex])

  const preenchidas = maquinas.filter(
    (m) => producao[m.id]?.[hourIndex] !== null && producao[m.id]?.[hourIndex] !== undefined,
  ).length

  const mainRealizado = fieldValues[mainKey]?.realizado ?? ''

  const salvarEProximo = () => {
    if (!atual) return
    setProducao(atual.id, hourIndex, mainRealizado === '' ? null : Number(mainRealizado))
    toast(`${atual.codigo} salvo`)
    if (cursor < maquinas.length - 1) setCursor((c) => c + 1)
  }

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
                  <p className="text-xs text-brand-400">{funcionarioNome(atual.funcionarioId)}</p>
                </div>
              </div>

              {/* Operações da janela */}
              <OperacoesInline
                atual={atual}
                extras={extras}
                setExtras={setExtras}
                fieldValues={fieldValues}
                setFieldValues={setFieldValues}
                activeField={activeField}
                setActiveField={focusField}
                operacaoFn={operacao}
                operacoes={operacoes}
              />

              <div className="mx-auto w-full max-w-xs">
                <NumericPad
                  value={numpadValue}
                  onChange={(v) => {
                    if (!activeField) return
                    setNumpadValue(v)
                    setFieldValues((prev) => ({
                      ...prev,
                      [activeField.id]: { ...prev[activeField.id], [activeField.campo]: v },
                    }))
                  }}
                />
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

function OperacoesInline({
  atual,
  extras,
  setExtras,
  fieldValues,
  setFieldValues,
  activeField,
  setActiveField,
  operacaoFn,
  operacoes,
}: {
  atual: Maquina
  extras: ExtraOp[]
  setExtras: (ops: ExtraOp[]) => void
  fieldValues: FieldValues
  setFieldValues: (v: FieldValues | ((prev: FieldValues) => FieldValues)) => void
  activeField: ActiveField
  setActiveField: (f: ActiveField) => void
  operacaoFn: (id: string) => { nome: string } | undefined
  operacoes: { id: string; nome: string }[]
}) {
  const mainKey = `main-${atual.id}`
  const mainMeta = fieldValues[mainKey]?.meta ?? String(atual.metaHora)
  const mainRealizado = fieldValues[mainKey]?.realizado ?? ''
  const nivelMain = statusJanela(
    mainRealizado !== '' ? Number(mainRealizado) : null,
    Number(mainMeta) || atual.metaHora,
  )
  const tMain = nivelMain ? STATUS_TOKENS[nivelMain] : null

  const isFocused = (id: string, campo: 'meta' | 'realizado') =>
    activeField?.id === id && activeField?.campo === campo

  const addExtra = () => {
    const id = `extra-${Date.now()}`
    setExtras([...extras, { id, operacaoId: operacoes[0]?.id ?? '' }])
    setFieldValues((prev) => ({ ...prev, [id]: { meta: '0', realizado: '' } }))
    setActiveField({ id, campo: 'realizado' })
  }

  const removeExtra = (id: string) => {
    setExtras(extras.filter((e) => e.id !== id))
    if (activeField?.id === id) setActiveField(null)
  }

  const updateExtraOp = (id: string, operacaoId: string) =>
    setExtras(extras.map((e) => (e.id === id ? { ...e, operacaoId } : e)))

  /* Botão de campo — toque ativa o NumericPad para aquele campo */
  const fieldBtn = (
    id: string,
    campo: 'meta' | 'realizado',
    value: string,
    colorClass: string,
  ) => {
    const focused = isFocused(id, campo)
    return (
      <button
        type="button"
        onClick={() => setActiveField({ id, campo })}
        className={cx(
          'rounded-xl border-2 py-2 text-center font-black transition active:scale-95',
          campo === 'realizado' ? 'w-14 text-lg' : 'w-12 text-sm',
          focused
            ? 'border-brand-600 bg-white text-brand-800 shadow ring-2 ring-brand-200'
            : value && value !== '0'
              ? cx(colorClass, 'bg-white')
              : 'border-brand-200 bg-brand-50 text-brand-300',
        )}
      >
        {value && value !== '0' ? value : '–'}
      </button>
    )
  }

  return (
    <div className="mb-3 space-y-2">
      {/* Linha principal */}
      <div
        className={cx(
          'flex items-center gap-2 rounded-2xl border-2 px-3 py-3 transition',
          tMain ? cx(tMain.bg, tMain.borda) : 'border-brand-100 bg-brand-50',
        )}
      >
        <p className="min-w-0 flex-1 truncate text-sm font-bold text-brand-950">
          {operacaoFn(atual.operacaoId)?.nome ?? '–'}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <span className="text-[10px] font-semibold text-brand-400">meta</span>
          {fieldBtn(mainKey, 'meta', mainMeta, 'border-brand-200 text-brand-600')}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="text-[10px] font-semibold text-brand-400">real.</span>
          {fieldBtn(
            mainKey,
            'realizado',
            mainRealizado,
            tMain ? cx(tMain.borda, tMain.corTexto) : 'border-brand-200 text-brand-300',
          )}
        </div>
        {nivelMain ? (
          <span
            className={cx(
              'h-2.5 w-2.5 shrink-0 rounded-full',
              nivelMain === 'ok' ? 'bg-emerald-500' : 'bg-red-500',
            )}
          />
        ) : (
          <span className="h-2.5 w-2.5 shrink-0" />
        )}
      </div>

      {/* Linhas extras */}
      {extras.map((e) => {
        const ev = fieldValues[e.id] ?? { meta: '0', realizado: '' }
        const nivel =
          ev.realizado !== ''
            ? statusJanela(Number(ev.realizado), Number(ev.meta) || 0)
            : null
        const t = nivel ? STATUS_TOKENS[nivel] : null
        return (
          <div
            key={e.id}
            className={cx(
              'flex items-center gap-2 rounded-2xl border-2 px-3 py-2.5 transition',
              t ? cx(t.bg, t.borda) : 'border-brand-200 bg-white',
            )}
          >
            <select
              value={e.operacaoId}
              onChange={(ev) => updateExtraOp(e.id, ev.target.value)}
              className="min-w-0 flex-1 rounded-xl bg-transparent text-sm font-semibold text-brand-800 outline-none"
            >
              {operacoes.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.nome}
                </option>
              ))}
            </select>
            <div className="flex shrink-0 items-center gap-1">
              <span className="text-[10px] font-semibold text-brand-400">meta</span>
              {fieldBtn(e.id, 'meta', ev.meta, 'border-brand-200 text-brand-600')}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <span className="text-[10px] font-semibold text-brand-400">real.</span>
              {fieldBtn(
                e.id,
                'realizado',
                ev.realizado,
                t ? cx(t.borda, t.corTexto) : 'border-brand-200 text-brand-300',
              )}
            </div>
            {nivel ? (
              <span
                className={cx(
                  'h-2.5 w-2.5 shrink-0 rounded-full',
                  nivel === 'ok' ? 'bg-emerald-500' : 'bg-red-500',
                )}
              />
            ) : (
              <span className="h-2.5 w-2.5 shrink-0" />
            )}
            <button
              type="button"
              onClick={() => removeExtra(e.id)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-brand-300 transition hover:text-red-500 active:scale-90"
            >
              <X size={15} />
            </button>
          </div>
        )
      })}

      {/* Adicionar operação */}
      <button
        type="button"
        onClick={addExtra}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-200 py-2.5 text-sm font-bold text-brand-500 transition hover:bg-brand-50 active:scale-[0.98]"
      >
        <Plus size={14} />
        Adicionar operação
      </button>
    </div>
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
