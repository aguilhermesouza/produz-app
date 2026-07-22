import { useState, useRef, useEffect, useMemo } from 'react'
import { ClipboardList, Settings2, Bell, ChevronLeft, ChevronRight, LayoutGrid, TrendingUp, TrendingDown, Target } from 'lucide-react'
import { useStore } from '../store'
import { useNav } from '../nav'
import { useDevice } from '../components/DeviceFrame'
import { useEmpresaResumo } from '../hooks/useEmpresa'
import { TopBar } from '../components/TopBar'
import { HourCell } from '../components/HourCell'
import { BottomSheet } from '../components/BottomSheet'
import { NumericPad } from '../components/NumericPad'
import { Card, ProgressBar, ProgressRing } from '../components/ui'
import { HORAS, getHoraAtualIndex, STATUS_TOKENS, pct } from '../lib/status'
import type { DiaAgg } from '../lib/aggregates'
import { cx, nInt } from '../lib/format'

const DIAS_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function DashboardScreen({ empresaId }: { empresaId: string }) {
  const { empresas, updatePecaMeta, maquinas, setProducao } = useStore()
  const { go } = useNav()
  const { wide } = useDevice()
  const empresa = empresas.find((e) => e.id === empresaId)!

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })

  // DEV: simulação de horário (nunca chega ao bundle de produção)
  const [devHoraOverride, setDevHoraOverride] = useState<number | null>(null)

  const horaAtual = useMemo(() => {
    if (devHoraOverride !== null) return devHoraOverride
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    return isSameDay(selectedDate, hoje) ? getHoraAtualIndex() : HORAS.length - 1
  }, [selectedDate, devHoraOverride])

  const resumo = useEmpresaResumo(empresaId, horaAtual)
  const [pecaSel, setPecaSel] = useState<string | null>(null)
  const [editandoHora, setEditandoHora] = useState<number | null>(null)
  const [modoEdicao, setModoEdicao] = useState<'produzido' | 'meta'>('produzido')
  const [inputHora, setInputHora] = useState('')

  const aggAtual: DiaAgg =
    pecaSel === null
      ? resumo.total
      : resumo.pecas.find((p) => p.peca.id === pecaSel)?.agg ?? resumo.total

  const t = STATUS_TOKENS[aggAtual.nivel]
  const multiPeca = resumo.pecas.length > 1

  const maquinasPecaSel = maquinas.filter(
    (m) => m.empresaId === empresaId && m.pecaId === pecaSel && m.ativa,
  )

  const abrirEdicaoHora = (h: number) => {
    const realized = aggAtual.horas[h]?.realizado ?? 0
    setInputHora(realized > 0 ? String(realized) : '')
    setModoEdicao('produzido')
    setEditandoHora(h)
  }

  const abrirMetaHora = (h: number, explicitPecaId?: string) => {
    // usa a peça explícita, a selecionada ou a primeira disponível
    const pid = explicitPecaId ?? pecaSel ?? resumo.pecas[0]?.peca.id ?? null
    const metaH = pid
      ? (resumo.pecas.find((p) => p.peca.id === pid)?.peca.metaHora ?? 0)
      : 0
    setInputHora(metaH > 0 ? String(metaH) : '')
    setModoEdicao('meta')
    setEditandoHora(h)
    if (pid && pid !== pecaSel) setPecaSel(pid)
  }

  const trocarModo = (modo: 'produzido' | 'meta') => {
    if (modo === 'produzido') {
      const realized = editandoHora !== null ? (aggAtual.horas[editandoHora]?.realizado ?? 0) : 0
      setInputHora(realized > 0 ? String(realized) : '')
    } else {
      const metaH = resumo.pecas.find((p) => p.peca.id === pecaSel)?.peca.metaHora ?? 0
      setInputHora(String(metaH))
    }
    setModoEdicao(modo)
  }

  const abrirHora = (h: number) =>
    go({ name: 'mapa', empresaId, hourIndex: h, pecaId: pecaSel ?? undefined })

  // Métricas derivadas
  const metaTotalDia = aggAtual.horas.reduce((sum, h) => sum + h.meta, 0)
  const delta = aggAtual.realizado - aggAtual.meta
  const razaoTotalDia = metaTotalDia > 0 ? aggAtual.realizado / metaTotalDia : 0

  return (
    <div className="flex h-full flex-col">
      <TopBar
        title={empresa.nome}
        subtitle={`${empresa.cidade} · ${resumo.qtdMaquinasAtivas} máquinas`}
        color={empresa.cor}
        right={
          <>
            <button
              type="button"
              aria-label="Alertas"
              onClick={() => go({ name: 'alertas', empresaId })}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-brand-500 transition hover:bg-brand-100 active:scale-95"
            >
              <Bell size={20} />
              {resumo.qtdAtencao > 0 && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white" />
              )}
            </button>
            <button
              type="button"
              aria-label="Configurar máquinas"
              onClick={() => go({ name: 'config', empresaId })}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-brand-500 transition hover:bg-brand-100 active:scale-95"
            >
              <Settings2 size={20} />
            </button>
          </>
        }
      />

      <DateStrip date={selectedDate} onChange={(d) => { setSelectedDate(d); setPecaSel(null) }} />

      {/* ---- Seletor de hora simulada ------------------------------------ */}
      <div className="flex items-center gap-2 border-b border-brand-100 bg-brand-50 px-3 py-1.5">
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-brand-400">
          ⏰
        </span>
        <div className="no-scrollbar flex flex-1 gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setDevHoraOverride(null)}
            className={cx(
              'shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold transition',
              devHoraOverride === null
                ? 'bg-brand-800 text-white'
                : 'text-brand-500 hover:bg-brand-100',
            )}
          >
            Agora
          </button>
          {HORAS.map((h, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setDevHoraOverride(i)}
              className={cx(
                'shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold transition',
                devHoraOverride === i
                  ? 'bg-brand-800 text-white'
                  : 'text-brand-500 hover:bg-brand-100',
              )}
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      <div className="thin-scroll flex-1 overflow-y-auto px-4 pb-28 pt-4">
        {/* Desempenho acumulado */}
        <Card className={cx('mb-3 border-2 p-4', t.borda)}>
          {/* Cabeçalho */}
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-brand-400">
            {pecaSel === null ? 'Desempenho acumulado' : 'Peça selecionada'}
          </p>

          <div className="flex items-center gap-4">
            <ProgressRing razao={aggAtual.razao} nivel={aggAtual.nivel} size={88} stroke={10}>
              <span className={cx('text-xl font-black', t.corTexto)}>{pct(aggAtual.razao)}%</span>
              <span className="text-[10px] font-semibold text-brand-400">até agora</span>
            </ProgressRing>

            <div className="min-w-0 flex-1">
              <p className="text-3xl font-black leading-none text-brand-950">
                {nInt(aggAtual.realizado)}
              </p>
              <p className="mb-3 mt-0.5 text-xs text-brand-400">
                de {nInt(aggAtual.meta)} esperadas até agora
              </p>

              {/* Delta — insight de compensação */}
              {aggAtual.meta > 0 && (
                <div
                  className={cx(
                    'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5',
                    delta > 0
                      ? 'bg-green-50'
                      : delta < 0
                        ? 'bg-red-50'
                        : 'bg-brand-100',
                  )}
                >
                  {delta > 0 ? (
                    <TrendingUp size={13} className="shrink-0 text-green-600" />
                  ) : delta < 0 ? (
                    <TrendingDown size={13} className="shrink-0 text-red-500" />
                  ) : null}
                  <span
                    className={cx(
                      'text-sm font-black tabular-nums',
                      delta > 0
                        ? 'text-green-700'
                        : delta < 0
                          ? 'text-red-600'
                          : 'text-brand-600',
                    )}
                  >
                    {delta > 0 ? `+${nInt(delta)}` : nInt(delta)}
                  </span>
                  <span
                    className={cx(
                      'text-[11px] font-bold',
                      delta > 0
                        ? 'text-green-600'
                        : delta < 0
                          ? 'text-red-500'
                          : 'text-brand-500',
                    )}
                  >
                    {delta > 0 ? 'adiantado' : delta < 0 ? 'atrasado' : 'na meta'}
                  </span>
                </div>
              )}
            </div>
          </div>

          <ProgressBar razao={aggAtual.razao} nivel={aggAtual.nivel} className="mt-4" />
        </Card>

        {/* Meta do dia — card isolado */}
        <Card className="mb-4 flex items-center gap-4 p-4">
          <div
            className={cx(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
              razaoTotalDia >= 1
                ? 'bg-green-100'
                : razaoTotalDia >= 0.5
                  ? 'bg-brand-100'
                  : 'bg-brand-50',
            )}
          >
            <Target
              size={20}
              className={cx(
                razaoTotalDia >= 1
                  ? 'text-green-600'
                  : razaoTotalDia >= 0.5
                    ? 'text-brand-600'
                    : 'text-brand-400',
              )}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-400">
              Meta do dia
            </p>
            <p className="text-xl font-black leading-tight text-brand-950">
              {nInt(metaTotalDia)}
              <span className="ml-1 text-sm font-semibold text-brand-400">peças</span>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p
              className={cx(
                'text-2xl font-black tabular-nums',
                razaoTotalDia >= 1
                  ? 'text-green-600'
                  : razaoTotalDia >= 0.5
                    ? 'text-brand-700'
                    : 'text-brand-400',
              )}
            >
              {pct(razaoTotalDia)}%
            </p>
            <p className="text-[10px] font-semibold text-brand-400">do dia total</p>
          </div>
        </Card>

        {/* Abas por peça */}
        {multiPeca && (
          <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
            <TabPeca ativo={pecaSel === null} onClick={() => setPecaSel(null)} label="Todas" />
            {resumo.pecas.map((p) => (
              <TabPeca
                key={p.peca.id}
                ativo={pecaSel === p.peca.id}
                onClick={() => setPecaSel(p.peca.id)}
                label={p.peca.nome}
                nivel={p.agg.nivel}
              />
            ))}
          </div>
        )}

        {/* Timeline de horários */}
        <p className="mb-2 text-sm font-bold uppercase tracking-wide text-brand-500">
          Fechamentos por hora
        </p>
        <div className="no-scrollbar -mx-1 mb-2 flex gap-2 overflow-x-auto px-1 pb-2">
          {aggAtual.horas.map((h) => (
            <HourCell
              key={h.index}
              hora={h}
              label={HORAS[h.index]}
              atual={h.index === horaAtual}
              selecionado={h.index === horaAtual}
              onClick={() => {
                const isFutura = h.index > horaAtual
                if (isFutura) {
                  // hora futura → sempre abre editor de meta
                  // (auto-seleciona a peça se nenhuma estiver selecionada)
                  abrirMetaHora(h.index)
                } else if (pecaSel !== null) {
                  // hora passada com peça selecionada → editar produzido
                  abrirEdicaoHora(h.index)
                } else {
                  // hora passada sem peça selecionada → vai para mapa
                  abrirHora(h.index)
                }
              }}
            />
          ))}
        </div>
        <p className="mb-4 text-xs text-brand-400">
          {pecaSel !== null
            ? 'Toque em uma hora passada para lançar produzido · horas futuras permitem definir a meta.'
            : 'Selecione uma peça para lançar produção por hora.'}
        </p>

        {/* Peças em produção */}
        <p className="mb-2 text-sm font-bold uppercase tracking-wide text-brand-500">
          {multiPeca ? 'Peças em produção' : 'Peça em produção'}
        </p>
        <div className={cx('grid gap-3', wide && multiPeca ? 'grid-cols-2' : 'grid-cols-1')}>
          {(pecaSel === null ? resumo.pecas : resumo.pecas.filter((p) => p.peca.id === pecaSel)).map(
            (p) => {
              const pt = STATUS_TOKENS[p.agg.nivel]
              return (
                <Card key={p.peca.id} className="flex gap-3 p-3">
                  <img
                    src={p.peca.fotoUrl}
                    alt={p.peca.nome}
                    className="h-20 w-20 shrink-0 rounded-xl object-cover"
                    onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="truncate text-sm font-extrabold text-brand-950">{p.peca.nome}</h3>
                      <span className={cx('shrink-0 text-sm font-bold', pt.corTexto)}>
                        {pct(p.agg.razao)}%
                      </span>
                    </div>
                    <p className="mb-1 line-clamp-2 text-xs text-brand-500">{p.peca.descricao}</p>
                    <p className="mb-1.5 text-xs font-medium text-brand-600">
                      {nInt(p.agg.realizado)} / {nInt(p.agg.meta)} pç · meta {p.peca.metaHora}/h ·{' '}
                      {p.qtdMaquinas} máq.
                    </p>
                    <ProgressBar razao={p.agg.razao} nivel={p.agg.nivel} />
                  </div>
                </Card>
              )
            },
          )}
        </div>


      </div>

      {/* Ação primária fixa */}
      <div className="absolute inset-x-0 bottom-0 z-20 border-t border-brand-100 bg-white/95 p-3 backdrop-blur">
        <button
          type="button"
          onClick={() =>
            go({ name: 'registro', empresaId, hourIndex: horaAtual, pecaId: pecaSel ?? undefined })
          }
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-3.5 text-base font-bold text-white shadow-lift transition active:scale-95"
        >
          <ClipboardList size={20} />
          Registrar produção · {horaAtual >= 0 ? HORAS[horaAtual] : '–'}
        </button>
      </div>

      {/* BottomSheet: lançar produzido / editar meta por hora */}
      {editandoHora !== null && pecaSel !== null && (() => {
        const pecaAtual = resumo.pecas.find((p) => p.peca.id === pecaSel)?.peca
        const metaHoraPeca = pecaAtual?.metaHora ?? 0
        const metaTotalJanela = metaHoraPeca * maquinasPecaSel.length
        const horaLabel = HORAS[editandoHora]
        return (
          <BottomSheet
            open={editandoHora !== null}
            onClose={() => setEditandoHora(null)}
            title={`${horaLabel} · ${pecaAtual?.nome ?? ''}`}
          >
            {/* Tabs modo — oculta "Produzido" para horas futuras */}
            {editandoHora !== null && !aggAtual.horas[editandoHora]?.futura && (
              <div className="mb-4 flex rounded-2xl bg-brand-100 p-1">
                {(['produzido', 'meta'] as const).map((modo) => (
                  <button
                    key={modo}
                    type="button"
                    onClick={() => trocarModo(modo)}
                    className={cx(
                      'flex-1 rounded-xl py-2 text-sm font-bold transition',
                      modoEdicao === modo
                        ? 'bg-white text-brand-950 shadow-sm'
                        : 'text-brand-500 hover:text-brand-700',
                    )}
                  >
                    {modo === 'produzido' ? 'Produzido' : 'Meta / hora'}
                  </button>
                ))}
              </div>
            )}

            {editandoHora !== null && aggAtual.horas[editandoHora]?.futura && (
              <div className="mb-4 flex items-center gap-2 rounded-2xl bg-amber-50 px-3 py-2">
                <span className="text-[11px] font-semibold text-amber-700">
                  Hora futura — apenas a meta pode ser definida agora.
                </span>
              </div>
            )}

            {/* Display grande */}
            <div className="mb-4 rounded-2xl bg-brand-900 px-4 py-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                {modoEdicao === 'produzido' ? 'Peças produzidas na janela' : 'Meta por hora / máquina'}
              </p>
              <p className="text-4xl font-black tabular-nums text-white">
                {inputHora || '0'}
              </p>
              <p className="mt-0.5 text-xs text-white/50">
                {modoEdicao === 'produzido' ? 'pç' : 'pç / h'}
              </p>
            </div>

            {/* Linha de contexto */}
            <div className="mb-4 flex items-center justify-between rounded-2xl bg-brand-50 px-4 py-3">
              {modoEdicao === 'produzido' ? (
                <>
                  <span className="text-sm font-semibold text-brand-500">Meta da janela</span>
                  <span className="text-xl font-black text-brand-950">
                    {nInt(metaTotalJanela)}
                    <span className="ml-1 text-sm font-semibold text-brand-400">pç</span>
                  </span>
                </>
              ) : (
                <>
                  <span className="text-sm font-semibold text-brand-500">Total esperado / janela</span>
                  <span className="text-xl font-black text-brand-950">
                    {nInt((Number(inputHora) || 0) * maquinasPecaSel.length)}
                    <span className="ml-1 text-sm font-semibold text-brand-400">pç</span>
                  </span>
                </>
              )}
            </div>

            <NumericPad value={inputHora} onChange={setInputHora} />

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditandoHora(null)
                  abrirHora(editandoHora)
                }}
                className="flex items-center gap-1.5 rounded-2xl border-2 border-brand-200 px-4 py-3 text-sm font-bold text-brand-700 transition hover:bg-brand-50 active:scale-95"
              >
                <LayoutGrid size={16} />
                Máquinas
              </button>
              <button
                type="button"
                onClick={() => {
                  const v = Number(inputHora)
                  if (modoEdicao === 'produzido' && v >= 0 && maquinasPecaSel.length > 0) {
                    const porMaquina = Math.round(v / maquinasPecaSel.length)
                    maquinasPecaSel.forEach((m) => setProducao(m.id, editandoHora, porMaquina))
                  } else if (modoEdicao === 'meta' && v > 0 && pecaSel) {
                    updatePecaMeta(pecaSel, v)
                  }
                  setEditandoHora(null)
                }}
                className="flex-1 rounded-2xl bg-brand-900 py-3 text-base font-bold text-white shadow-lift transition active:scale-95"
              >
                Confirmar
              </button>
            </div>
          </BottomSheet>
        )
      })()}
    </div>
  )
}

function DateStrip({ date, onChange }: { date: Date; onChange: (d: Date) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const hoje = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const [viewMonth, setViewMonth] = useState({
    year: date.getFullYear(),
    month: date.getMonth(),
  })

  const isCurrentMonth =
    viewMonth.year === hoje.getFullYear() && viewMonth.month === hoje.getMonth()

  const dias = useMemo(() => {
    const total = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate()
    return Array.from({ length: total }, (_, i) => new Date(viewMonth.year, viewMonth.month, i + 1))
  }, [viewMonth])

  // Scroll para o dia selecionado (ou hoje) sempre que o mês muda
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const target =
      container.querySelector<HTMLElement>('[data-sel="true"]') ??
      container.querySelector<HTMLElement>('[data-today="true"]')
    if (target) target.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' })
    else container.scrollLeft = 0
  }, [viewMonth])

  const prevMonth = () =>
    setViewMonth(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 },
    )

  const nextMonth = () =>
    setViewMonth(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 },
    )

  return (
    <div className="border-b border-brand-100 bg-white pb-3 pt-2">
      {/* Cabeçalho do mês com setas */}
      <div className="mb-2 flex items-center justify-between px-3">
        <button
          type="button"
          onClick={prevMonth}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-brand-500 transition hover:bg-brand-100 active:scale-95"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="text-[11px] font-bold uppercase tracking-widest text-brand-700">
          {MESES[viewMonth.month]} {viewMonth.year}
        </p>
        <button
          type="button"
          onClick={nextMonth}
          disabled={isCurrentMonth}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-brand-500 transition hover:bg-brand-100 active:scale-95 disabled:opacity-25"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Faixa de dias */}
      <div ref={scrollRef} className="no-scrollbar flex gap-1 overflow-x-auto px-4">
        {dias.map((d, i) => {
          const isToday = isSameDay(d, hoje)
          const isSelected = isSameDay(d, date)
          return (
            <button
              key={i}
              type="button"
              data-sel={isSelected ? 'true' : undefined}
              data-today={isToday && !isSelected ? 'true' : undefined}
              onClick={() => onChange(d)}
              className={cx(
                'flex shrink-0 flex-col items-center gap-1 rounded-2xl px-2.5 py-2 transition active:scale-95',
                isSelected
                  ? 'bg-brand-900 text-white'
                  : isToday
                  ? 'bg-brand-100 text-brand-900'
                  : 'text-brand-400 hover:bg-brand-50',
              )}
            >
              <span
                className={cx(
                  'text-[10px] font-medium leading-none',
                  isSelected ? 'text-white/60' : '',
                )}
              >
                {DIAS_ABREV[d.getDay()]}
              </span>
              <span className="text-sm font-extrabold leading-none">{d.getDate()}</span>
              {isToday && !isSelected && (
                <span className="h-1 w-1 rounded-full bg-brand-600" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TabPeca({
  ativo,
  onClick,
  label,
  nivel,
}: {
  ativo: boolean
  onClick: () => void
  label: string
  nivel?: 'ok' | 'warn' | 'bad'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition active:scale-95',
        ativo ? 'bg-brand-600 text-white shadow-sm' : 'bg-white text-brand-700',
      )}
    >
      {nivel && <span className={cx('h-2 w-2 rounded-full', STATUS_TOKENS[nivel].cor)} />}
      {label}
    </button>
  )
}
