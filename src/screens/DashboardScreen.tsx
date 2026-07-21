import { useState, useRef, useEffect, useMemo } from 'react'
import { AlertTriangle, ClipboardList, Settings2, Bell, ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from '../store'
import { useNav } from '../nav'
import { useDevice } from '../components/DeviceFrame'
import { useEmpresaResumo } from '../hooks/useEmpresa'
import { TopBar } from '../components/TopBar'
import { HourCell } from '../components/HourCell'
import { Card, ProgressBar, ProgressRing, StatusBadge } from '../components/ui'
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
  const { empresas } = useStore()
  const { go } = useNav()
  const { wide } = useDevice()
  const empresa = empresas.find((e) => e.id === empresaId)!

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const horaAtual = useMemo(() => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    return isSameDay(selectedDate, hoje) ? getHoraAtualIndex() : HORAS.length - 1
  }, [selectedDate])

  const resumo = useEmpresaResumo(empresaId, horaAtual)
  const [pecaSel, setPecaSel] = useState<string | null>(null)

  const aggAtual: DiaAgg =
    pecaSel === null
      ? resumo.total
      : resumo.pecas.find((p) => p.peca.id === pecaSel)?.agg ?? resumo.total

  const t = STATUS_TOKENS[aggAtual.nivel]
  const multiPeca = resumo.pecas.length > 1

  const abrirHora = (h: number) =>
    go({ name: 'mapa', empresaId, hourIndex: h, pecaId: pecaSel ?? undefined })

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

      <div className="thin-scroll flex-1 overflow-y-auto px-4 pb-28 pt-4">
        {/* Painel da meta do dia */}
        <Card className={cx('mb-4 border-2 p-4', t.borda)}>
          <div className="flex items-center gap-4">
            <ProgressRing razao={aggAtual.razao} nivel={aggAtual.nivel} size={92} stroke={10}>
              <span className={cx('text-xl font-black', t.corTexto)}>{pct(aggAtual.razao)}%</span>
              <span className="text-[10px] font-semibold text-brand-400">da meta</span>
            </ProgressRing>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-400">
                {pecaSel === null ? 'Total do dia' : 'Peça selecionada'}
              </p>
              <p className="text-3xl font-black leading-none text-brand-950">
                {nInt(aggAtual.realizado)}
              </p>
              <p className="mb-2 text-sm text-brand-500">de {nInt(aggAtual.meta)} peças previstas</p>
              <StatusBadge nivel={aggAtual.nivel} />
            </div>
          </div>
          <ProgressBar razao={aggAtual.razao} nivel={aggAtual.nivel} className="mt-4" />
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
              onClick={() => abrirHora(h.index)}
            />
          ))}
        </div>
        <p className="mb-4 text-xs text-brand-400">
          Toque em um horário para ver o mapa de máquinas daquele fechamento.
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

        {/* Alertas */}
        {resumo.qtdAtencao > 0 && (
          <Card
            className="mt-4 flex items-center gap-3 border-l-4 border-l-amber-400 p-3"
            onClick={() => go({ name: 'alertas', empresaId })}
          >
            <AlertTriangle className="shrink-0 text-amber-500" size={22} />
            <div className="flex-1 text-sm">
              <p className="font-bold text-brand-950">{resumo.qtdAtencao} máquinas precisam de atenção</p>
              <p className="text-brand-500">
                {resumo.qtdVermelhas} abaixo da meta · {resumo.qtdAmarelas} em alerta
              </p>
            </div>
            <span className="text-xs font-bold text-brand-600">Ver</span>
          </Card>
        )}
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
