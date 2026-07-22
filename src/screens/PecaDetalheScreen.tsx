import { useRef, useEffect } from 'react'
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronRight,
  Cog,
  Droplets,
  Package,
  Ruler,
  Scissors,
  Sparkles,
  Truck,
  Wrench,
  TrendingUp,
  Clock,
} from 'lucide-react'
import { useStore } from '../store'
import { useNav } from '../nav'
import { useDevice } from '../components/DeviceFrame'
import { agregarPeca } from '../lib/aggregates'
import { STATUS_TOKENS, getHoraAtualIndex, pct } from '../lib/status'
import { Card, ProgressBar, ProgressRing, StatusBadge } from '../components/ui'
import { cx, nInt } from '../lib/format'
import type { EtapaPeca, Peca } from '../types'
import {
  ETAPA_ORDER,
  ETAPA_LABEL,
  ETAPA_SHADE,
  qtdEtapa,
  pctEtapa,
  etapaFrente,
  etapaEhProducao,
  wipPorEtapa,
  estadoEtapa,
} from '../lib/etapas'

// ---------------------------------------------------------------------------
// Config de etapas
// ---------------------------------------------------------------------------

const ETAPA_CONFIG: {
  id: EtapaPeca
  label: string
  Icon: React.ElementType
}[] = [
  { id: 'aprovada', label: 'Aprovada', Icon: CheckCircle2 },
  { id: 'medicao', label: 'Medição', Icon: Ruler },
  { id: 'corte', label: 'Corte', Icon: Scissors },
  { id: 'producao', label: 'Produção', Icon: Cog },
  { id: 'acabamento', label: 'Acabamento', Icon: Sparkles },
  { id: 'lavanderia', label: 'Lavanderia', Icon: Droplets },
  { id: 'embalagem', label: 'Embalagem', Icon: Package },
  { id: 'expedicao', label: 'Expedição', Icon: Truck },
]

// ---------------------------------------------------------------------------
// Helpers de data
// ---------------------------------------------------------------------------

/** 'YYYY-MM-DD' → 'DD/MM' */
function fmtData(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

/** Compara duas datas ISO ('YYYY-MM-DD'). -1 = a antes de b, 0 = igual, 1 = a depois */
function cmpDatas(a: string, b: string): -1 | 0 | 1 {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

// ---------------------------------------------------------------------------
// JornadaTimeline
// ---------------------------------------------------------------------------

function iconePorEtapa(etapa: EtapaPeca): React.ElementType {
  return ETAPA_CONFIG.find((e) => e.id === etapa)?.Icon ?? Cog
}

function JornadaTimeline({ peca }: { peca: Peca }) {
  const total = peca.quantidadeTotal
  const frente = etapaFrente(peca)
  const wip = wipPorEtapa(peca)
  const scrollRef = useRef<HTMLDivElement>(null)
  const frenteRef = useRef<HTMLDivElement>(null)

  // Centraliza a frente de produção no carrossel ao montar
  useEffect(() => {
    const node = frenteRef.current
    const container = scrollRef.current
    if (!node || !container) return
    container.scrollLeft = node.offsetLeft - container.offsetWidth / 2 + node.offsetWidth / 2
  }, [])

  // Segmentos do WIP: etapas onde há peças "paradas" agora
  const segmentos = ETAPA_ORDER.map((etapa) => ({ etapa, qtd: wip[etapa] })).filter(
    (s) => s.qtd > 0,
  )

  const ALTURA = 96

  return (
    <div>
      {/* Resumo: total + frente */}
      <div className="mb-3 flex items-end justify-between px-5">
        <div>
          <p className="text-3xl font-black leading-none text-brand-950">{nInt(total)}</p>
          <p className="mt-0.5 text-xs font-medium text-brand-400">peças na ordem</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-extrabold text-brand-900">{ETAPA_LABEL[frente]}</p>
          <p className="text-xs font-medium text-brand-400">frente de produção</p>
        </div>
      </div>

      {/* Barra de distribuição (onde as peças estão agora) */}
      <div className="px-5">
        <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-brand-100">
          {segmentos.map((s) => (
            <div
              key={s.etapa}
              className={cx('h-full transition-all', ETAPA_SHADE[s.etapa].bg)}
              style={{ width: `${(s.qtd / total) * 100}%` }}
              title={`${ETAPA_LABEL[s.etapa]}: ${s.qtd}`}
            />
          ))}
        </div>
        {/* Legenda rolável */}
        <div className="no-scrollbar mt-2 flex gap-3 overflow-x-auto pb-0.5">
          {segmentos.map((s) => (
            <div key={s.etapa} className="flex shrink-0 items-center gap-1.5">
              <span className={cx('h-2.5 w-2.5 shrink-0 rounded-full', ETAPA_SHADE[s.etapa].dot)} />
              <span className="whitespace-nowrap text-[11px] font-semibold text-brand-600">
                {ETAPA_LABEL[s.etapa]}
              </span>
              <span className="text-[11px] font-black text-brand-900">{nInt(s.qtd)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Carrossel de etapas: colunas de progresso (funil) */}
      <div ref={scrollRef} className="no-scrollbar mt-5 overflow-x-auto">
        <div className="flex min-w-max items-start gap-2 px-5">
          {ETAPA_ORDER.map((etapa) => {
            const info = peca.etapas?.[etapa]
            const qtd = qtdEtapa(peca, etapa)
            const p = pctEtapa(peca, etapa)
            const estado = estadoEtapa(peca, etapa)
            const Icon = iconePorEtapa(etapa)
            const isFrente = etapa === frente
            const producao = etapaEhProducao(etapa)
            const concluido = producao ? estado === 'done' : !!info?.realizado
            const emCurso = producao ? estado === 'active' : isFrente && !concluido
            const apagado = producao ? estado === 'todo' : !concluido && !isFrente
            const fill = estado === 'todo' ? 0 : Math.max(6, Math.round(p * ALTURA))

            return (
              <div
                key={etapa}
                ref={isFrente ? frenteRef : undefined}
                className={cx(
                  'flex w-[78px] shrink-0 flex-col items-center rounded-2xl px-1.5 pb-2 pt-2 transition',
                  isFrente ? 'bg-brand-50 ring-1 ring-brand-200' : '',
                )}
              >
                {/* Quantidade acumulada (só produção) */}
                <span
                  className={cx(
                    'mb-1 text-sm font-black leading-none',
                    apagado ? 'text-brand-300' : 'text-brand-900',
                    !producao && 'select-none opacity-0',
                  )}
                >
                  {producao ? nInt(qtd) : '–'}
                </span>

                {/* Barra de nível (produção) ou marco (aprovada/medição) */}
                {producao ? (
                  <div
                    className="relative w-8 overflow-hidden rounded-full bg-brand-100"
                    style={{ height: ALTURA }}
                  >
                    <div
                      className={cx(
                        'absolute bottom-0 w-full rounded-full transition-all duration-700',
                        concluido ? 'bg-brand-800' : ETAPA_SHADE[etapa].bg,
                      )}
                      style={{ height: fill }}
                    />
                    {concluido && (
                      <CheckCircle2
                        size={13}
                        className="absolute left-1/2 top-1.5 -translate-x-1/2 text-white"
                      />
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center" style={{ height: ALTURA }}>
                    <div
                      className={cx(
                        'flex h-9 w-9 items-center justify-center rounded-full border-2 transition',
                        concluido
                          ? 'border-brand-800 bg-brand-800 text-white'
                          : isFrente
                          ? 'border-brand-400 bg-white'
                          : 'border-brand-200 bg-white',
                      )}
                    >
                      {concluido ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <span
                          className={cx(
                            'h-2.5 w-2.5 rounded-full',
                            isFrente ? 'bg-brand-400' : 'bg-brand-200',
                          )}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Percentual (só produção) */}
                <span
                  className={cx(
                    'mt-1 text-[10px] font-bold leading-none',
                    apagado ? 'text-brand-300' : 'text-brand-500',
                    !producao && 'select-none opacity-0',
                  )}
                >
                  {producao ? `${Math.round(p * 100)}%` : '–'}
                </span>

                {/* Ícone + label */}
                <div className="mt-2 flex flex-col items-center gap-0.5">
                  <Icon
                    size={15}
                    className={
                      isFrente
                        ? 'text-brand-900'
                        : apagado
                        ? 'text-brand-300'
                        : 'text-brand-500'
                    }
                  />
                  <span
                    className={cx(
                      'text-center text-[10px] font-bold leading-tight',
                      isFrente
                        ? 'text-brand-900'
                        : apagado
                        ? 'text-brand-300'
                        : 'text-brand-600',
                    )}
                  >
                    {ETAPA_LABEL[etapa]}
                  </span>
                </div>

                {/* Data (realizada colorida, ou planejada) */}
                <div className="mt-1 flex min-h-[24px] items-start justify-center">
                  {info?.realizado ? (
                    <span
                      className={cx(
                        'text-[11px] font-bold leading-tight',
                        cmpDatas(info.realizado, info.planejado) <= 0
                          ? 'text-emerald-600'
                          : 'text-red-500',
                      )}
                    >
                      {fmtData(info.realizado)}
                    </span>
                  ) : emCurso ? (
                    <span className="text-[10px] font-medium italic leading-tight text-brand-400">
                      em curso
                    </span>
                  ) : info?.planejado ? (
                    <span className="text-[11px] font-medium leading-tight text-brand-400">
                      {fmtData(info.planejado)}
                    </span>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PecaDetalheScreen
// ---------------------------------------------------------------------------

export function PecaDetalheScreen({ pecaId }: { pecaId: string }) {
  const { pecas, maquinas, producao, empresas } = useStore()
  const { back, go } = useNav()
  const { wide } = useDevice()

  const peca = pecas.find((p) => p.id === pecaId)!
  const horaAtual = getHoraAtualIndex()

  const maqDaPeca = maquinas.filter((m) => m.pecaId === pecaId && m.ativa)
  const agg = agregarPeca(maqDaPeca, producao, peca.metaHora, horaAtual)

  const empresaIds = [...new Set(maqDaPeca.map((m) => m.empresaId))]
  const empresasDaPeca = empresas.filter((e) => empresaIds.includes(e.id))

  const t = STATUS_TOKENS[agg.nivel]

  // Rótulo da etapa mais avançada (frente de produção)
  const etapaLabel = ETAPA_LABEL[etapaFrente(peca)]

  return (
    <div className="flex h-full flex-col bg-brand-100">
      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="relative h-52 w-full shrink-0 overflow-hidden">
        <img
          src={peca.fotoUrl}
          alt={peca.nome}
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
        {/* Gradiente de cima pra baixo para o botão voltar */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-950/60 via-transparent to-brand-950/80" />

        {/* Botão voltar */}
        <button
          type="button"
          aria-label="Voltar"
          onClick={back}
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition active:scale-90 hover:bg-white/30"
        >
          <ArrowLeft size={20} />
        </button>

        {/* Texto no rodapé do hero */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
          <div className="mb-1.5 flex items-center gap-2">
            <span
              className={cx(
                'rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide',
                t.chip,
              )}
            >
              {agg.nivel === 'ok' ? 'No prazo' : 'Atenção'}
            </span>
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
              {etapaLabel}
            </span>
          </div>
          <h1 className="text-2xl font-black leading-tight text-white drop-shadow-sm">
            {peca.nome}
          </h1>
          <p className="mt-0.5 text-sm text-white/75 line-clamp-1">{peca.descricao}</p>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Conteúdo scrollável                                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="thin-scroll flex-1 overflow-y-auto pb-10">
        {/* ---- Jornada --------------------------------------------------- */}
        <div className="border-b border-brand-100 bg-white pb-5 pt-4">
          <p className="mb-3 px-5 text-[11px] font-extrabold uppercase tracking-widest text-brand-400">
            Jornada da peça
          </p>
          <JornadaTimeline peca={peca} />
        </div>

        <div className={cx('px-4 pt-4', wide ? 'grid grid-cols-2 gap-4' : 'flex flex-col gap-4')}>
          {/* ---- Produção do dia ----------------------------------------- */}
          <Card className={cx('border-2 p-4', t.borda)}>
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp size={15} className="text-brand-500" />
              <p className="text-xs font-extrabold uppercase tracking-wide text-brand-500">
                Produção hoje
              </p>
            </div>
            <div className="flex items-center gap-4">
              <ProgressRing razao={agg.razao} nivel={agg.nivel} size={76} stroke={8}>
                <span className={cx('text-lg font-black', t.corTexto)}>{pct(agg.razao)}%</span>
              </ProgressRing>
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-black leading-none text-brand-950">
                  {nInt(agg.realizado)}
                </p>
                <p className="mb-2 text-sm text-brand-500">de {nInt(agg.meta)} previstas</p>
                <StatusBadge nivel={agg.nivel} />
              </div>
            </div>
            <ProgressBar razao={agg.razao} nivel={agg.nivel} className="mt-3" />
          </Card>

          {/* ---- Métricas rápidas ---------------------------------------- */}
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Clock size={15} className="text-brand-500" />
              <p className="text-xs font-extrabold uppercase tracking-wide text-brand-500">
                Métricas
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Meta/hora" value={`${peca.metaHora} pç`} />
              <Metric label="Máquinas" value={String(maqDaPeca.length)} />
              <Metric label="Confecções" value={String(empresasDaPeca.length)} />
              <Metric
                label="Melhor hora"
                value={
                  agg.horas
                    .filter((h) => !h.futura && h.realizado !== null)
                    .reduce(
                      (best, h) => (h.realizado! > best ? h.realizado! : best),
                      0,
                    )
                    .toString() + ' pç'
                }
              />
            </div>
          </Card>

          {/* ---- Confecções que produzem ---------------------------------- */}
          {empresasDaPeca.length > 0 && (
            <div className={cx(wide ? 'col-span-2' : '')}>
              <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-brand-500">
                <Building2 size={12} className="mr-1 inline" />
                Confecções produzindo
              </p>
              <div className="flex flex-col gap-2">
                {empresasDaPeca.map((emp) => {
                  const maqEmp = maqDaPeca.filter((m) => m.empresaId === emp.id)
                  return (
                    <Card
                      key={emp.id}
                      className="flex items-center gap-3 px-4 py-3"
                      onClick={() => go({ name: 'dashboard', empresaId: emp.id })}
                    >
                      <div
                        className="h-9 w-1 shrink-0 rounded-full"
                        style={{ backgroundColor: emp.cor }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-brand-900">{emp.nome}</p>
                        <p className="text-xs text-brand-400">{emp.cidade}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1 rounded-xl bg-brand-50 px-2.5 py-1">
                          <Wrench size={12} className="text-brand-400" />
                          <span className="text-xs font-bold text-brand-600">{maqEmp.length} máq.</span>
                        </div>
                        <ChevronRight size={16} className="shrink-0 text-brand-300" />
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-brand-50 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-400">{label}</p>
      <p className="mt-0.5 text-base font-extrabold text-brand-900">{value}</p>
    </div>
  )
}
