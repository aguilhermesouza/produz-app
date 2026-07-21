import { useRef, useEffect, Fragment } from 'react'
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronRight,
  Cog,
  Package,
  Ruler,
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
import type { EtapaPeca, EtapaInfo } from '../types'

// ---------------------------------------------------------------------------
// Config de etapas
// ---------------------------------------------------------------------------

const ETAPA_ORDER: EtapaPeca[] = ['aprovada', 'medicao', 'producao', 'entrega']

const ETAPA_CONFIG: {
  id: EtapaPeca
  label: string
  Icon: React.ElementType
}[] = [
  { id: 'aprovada', label: 'Aprovada', Icon: CheckCircle2 },
  { id: 'medicao', label: 'Medição', Icon: Ruler },
  { id: 'producao', label: 'Produção', Icon: Cog },
  { id: 'entrega', label: 'Entrega', Icon: Package },
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

function JornadaTimeline({
  etapaAtual,
  etapas,
}: {
  etapaAtual: EtapaPeca
  etapas?: Partial<Record<EtapaPeca, EtapaInfo>>
}) {
  const currentIdx = ETAPA_ORDER.indexOf(etapaAtual)
  const currentNodeRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll para a etapa atual no mount
  useEffect(() => {
    const node = currentNodeRef.current
    const container = scrollRef.current
    if (!node || !container) return
    // Calcula offset para centralizar o nó atual no container
    const nodeLeft = node.offsetLeft
    const nodeWidth = node.offsetWidth
    const containerWidth = container.offsetWidth
    container.scrollLeft = nodeLeft - containerWidth / 2 + nodeWidth / 2
  }, [])

  return (
    <div ref={scrollRef} className="no-scrollbar overflow-x-auto">
      {/* ------------------------------------------------------------------ */}
      {/* Linha do track (circles + conectores)                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex min-w-max items-center px-5">
        {ETAPA_CONFIG.map((etapa, idx) => {
          const state: 'done' | 'current' | 'future' =
            idx < currentIdx ? 'done' : idx === currentIdx ? 'current' : 'future'

          const isConnectorDone = idx > 0 && (idx <= currentIdx)

          return (
            <Fragment key={etapa.id}>
              {/* Conector */}
              {idx > 0 && (
                <div
                  className={cx(
                    'h-0.5 flex-1 shrink-0 transition-colors',
                    isConnectorDone
                      ? 'bg-brand-700'
                      : 'bg-brand-200',
                    !isConnectorDone && 'border-t-0',
                  )}
                  style={
                    !isConnectorDone
                      ? {
                          background:
                            'repeating-linear-gradient(90deg, #d4d4d4 0, #d4d4d4 6px, transparent 6px, transparent 12px)',
                          height: '2px',
                        }
                      : undefined
                  }
                />
              )}

              {/* Nó */}
              <div
                ref={state === 'current' ? currentNodeRef : undefined}
                className="flex w-[84px] shrink-0 justify-center"
              >
                <div
                  className={cx(
                    'flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all',
                    state === 'done'
                      ? 'border-brand-700 bg-brand-700'
                      : state === 'current'
                      ? 'border-brand-950 bg-brand-950 ring-4 ring-brand-200'
                      : 'border-brand-200 bg-white',
                  )}
                >
                  {state === 'done' ? (
                    <CheckCircle2 size={20} className="text-white" />
                  ) : (
                    <etapa.Icon
                      size={18}
                      className={state === 'current' ? 'text-white' : 'text-brand-300'}
                    />
                  )}
                </div>
              </div>
            </Fragment>
          )
        })}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Labels + datas (alinhadas com as colunas acima)                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="mt-2.5 flex min-w-max items-start px-5">
        {ETAPA_CONFIG.map((etapa, idx) => {
          const state: 'done' | 'current' | 'future' =
            idx < currentIdx ? 'done' : idx === currentIdx ? 'current' : 'future'
          const info = etapas?.[etapa.id]

          return (
            <Fragment key={etapa.id}>
              {/* Espaçador correspondente ao conector */}
              {idx > 0 && <div className="flex-1 shrink-0" />}

              {/* Card de label */}
              <div className="flex w-[84px] shrink-0 flex-col items-center gap-0.5 text-center">
                {/* Label da etapa */}
                <p
                  className={cx(
                    'text-[10px] font-extrabold uppercase tracking-wide leading-none',
                    state === 'done'
                      ? 'text-brand-600'
                      : state === 'current'
                      ? 'text-brand-950'
                      : 'text-brand-300',
                  )}
                >
                  {etapa.label}
                </p>

                {/* Badge "Atual" para etapa corrente */}
                {state === 'current' && (
                  <span className="mt-0.5 rounded-full bg-brand-900 px-2 py-0.5 text-[9px] font-bold leading-tight text-white">
                    Atual
                  </span>
                )}

                {/* Datas */}
                <div className="mt-1 flex flex-col items-center gap-0.5">
                  {info?.planejado && (
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-medium uppercase leading-none tracking-wide text-brand-400">
                        Plan.
                      </span>
                      <span className="text-[12px] font-bold leading-tight text-brand-700">
                        {fmtData(info.planejado)}
                      </span>
                    </div>
                  )}

                  {info?.realizado && (
                    <div className="mt-0.5 flex flex-col items-center">
                      <span className="text-[9px] font-medium uppercase leading-none tracking-wide text-brand-400">
                        Real.
                      </span>
                      <span
                        className={cx(
                          'text-[12px] font-bold leading-tight',
                          cmpDatas(info.realizado, info.planejado) <= 0
                            ? 'text-emerald-600'
                            : 'text-red-500',
                        )}
                      >
                        {fmtData(info.realizado)}
                      </span>
                    </div>
                  )}

                  {state === 'current' && !info?.realizado && (
                    <span className="mt-0.5 text-[10px] font-medium italic text-brand-400">
                      em curso
                    </span>
                  )}
                </div>
              </div>
            </Fragment>
          )
        })}
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

  // Rótulo amigável da etapa atual
  const etapaLabel = ETAPA_CONFIG.find((e) => e.id === peca.etapa)?.label ?? peca.etapa

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
          <JornadaTimeline etapaAtual={peca.etapa} etapas={peca.etapas} />
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
