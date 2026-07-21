import { useMemo, useState, type ReactNode } from 'react'
import type React from 'react'
import { Bell, Building2, CheckCircle2, Cog, Factory, Layers, Package, Ruler, Search, TrendingUp } from 'lucide-react'
import { useStore } from '../store'
import { useNav } from '../nav'
import { useDevice } from '../components/DeviceFrame'
import { useEmpresaResumo, type EmpresaResumo } from '../hooks/useEmpresa'
import { Card, ProgressBar, ProgressRing, StatusBadge } from '../components/ui'
import { agregarPeca, type DiaAgg } from '../lib/aggregates'
import { STATUS_TOKENS, getHoraAtualIndex, pct } from '../lib/status'
import { cx, nInt } from '../lib/format'
import type { Empresa, EtapaPeca, Peca, StatusNivel } from '../types'

type Ordem = 'status' | 'nome'

const PESO_STATUS: Record<StatusNivel, number> = { bad: 0, warn: 1, ok: 2 }

const ETAPAS: { id: EtapaPeca; label: string; Icon: React.ElementType }[] = [
  { id: 'aprovada', label: 'Aprovada', Icon: CheckCircle2 },
  { id: 'medicao', label: 'Medição', Icon: Ruler },
  { id: 'producao', label: 'Produção', Icon: Cog },
  { id: 'entrega', label: 'Entrega', Icon: Package },
]

export function EmpresasScreen() {
  const { empresas, maquinas, producao, pecas } = useStore()
  const { go } = useNav()
  const { wide } = useDevice()
  const [busca, setBusca] = useState('')
  const [ordem, setOrdem] = useState<Ordem>('status')
  const [visao, setVisao] = useState<'confeccoes' | 'pecas'>('confeccoes')
  const [etapaFiltro, setEtapaFiltro] = useState<EtapaPeca | null>(null)

  // Resumos calculados sobre a lista fixa de empresas (contagem de hooks estável).
  const resumos = empresas.map((e) => ({ empresa: e, resumo: useEmpresaResumo(e.id) }))

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return resumos
      .filter(
        ({ empresa }) =>
          !q || empresa.nome.toLowerCase().includes(q) || empresa.cidade.toLowerCase().includes(q),
      )
      .sort((a, b) => {
        if (ordem === 'nome') return a.empresa.nome.localeCompare(b.empresa.nome)
        return PESO_STATUS[a.resumo.total.nivel] - PESO_STATUS[b.resumo.total.nivel]
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumos, busca, ordem])

  const pecaLista = useMemo(() => {
    const q = busca.trim().toLowerCase()
    const horaAtual = getHoraAtualIndex()
    return pecas
      .map((peca) => {
        const mqs = maquinas.filter((m) => m.pecaId === peca.id && m.ativa)
        if (mqs.length === 0) return null
        const agg = agregarPeca(mqs, producao, peca.metaHora, horaAtual)
        const empresasIds = [...new Set(mqs.map((m) => m.empresaId))]
        return { peca, agg, qtdMaquinas: mqs.length, qtdEmpresas: empresasIds.length }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .filter(({ peca }) => !q || peca.nome.toLowerCase().includes(q))
      .filter(({ peca }) => etapaFiltro === null || peca.etapa === etapaFiltro)
      .sort((a, b) => {
        if (ordem === 'nome') return a.peca.nome.localeCompare(b.peca.nome)
        return (a.agg.nivel === 'ok' ? 1 : 0) - (b.agg.nivel === 'ok' ? 1 : 0)
      })
  }, [pecas, maquinas, producao, busca, ordem, etapaFiltro])

  return (
    <div className="flex h-full flex-col">
      <header className="relative z-20 border-b border-brand-200 bg-white/90 px-4 pb-4 pt-5 backdrop-blur-md">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-brand-400">Bom trabalho hoje 👋</p>
            <h1 className="text-2xl font-extrabold leading-tight text-brand-950">
              {visao === 'confeccoes' ? 'Minhas confecções' : 'Peças em produção'}
            </h1>
          </div>
          <button
            type="button"
            aria-label="Notificações"
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-600 transition hover:bg-brand-200 active:scale-95"
          >
            <Bell size={20} />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white" />
          </button>
        </div>

        <div className="relative mt-4">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={visao === 'confeccoes' ? 'Buscar empresa ou cidade…' : 'Buscar por peça…'}
            className="w-full rounded-2xl border border-brand-200 bg-brand-50 py-3 pl-10 pr-3 text-sm text-brand-950 outline-none transition placeholder:text-brand-400 focus:border-brand-400 focus:bg-white"
          />
        </div>
      </header>

      <div className="thin-scroll flex-1 overflow-y-auto px-4 pb-6 pt-4">
        {/* Toggle de visão */}
        <div className="mb-4 flex overflow-hidden rounded-2xl border border-brand-200 bg-brand-50 p-1">
          {(['confeccoes', 'pecas'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVisao(v)}
              className={cx(
                'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition',
                visao === v ? 'bg-white text-brand-900 shadow-card' : 'text-brand-400 hover:text-brand-700',
              )}
            >
              {v === 'confeccoes' ? (
                <><Factory size={14} />Confecções</>
              ) : (
                <><Layers size={14} />Peças</>
              )}
            </button>
          ))}
        </div>

        {/* Ordenação */}
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs font-semibold text-brand-500">Ordenar por</span>
          {(['status', 'nome'] as Ordem[]).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setOrdem(o)}
              className={cx(
                'rounded-full px-3 py-1 text-xs font-semibold transition',
                ordem === o ? 'bg-brand-900 text-white' : 'bg-brand-100 text-brand-600 hover:bg-brand-200',
              )}
            >
              {o === 'status' ? 'Situação' : 'Nome'}
            </button>
          ))}
        </div>

        {visao === 'confeccoes' ? (
          <div className={cx('grid gap-3', wide ? 'grid-cols-2' : 'grid-cols-1')}>
            {lista.map(({ empresa, resumo }) => (
              <EmpresaCard key={empresa.id} empresa={empresa} resumo={resumo} />
            ))}
          </div>
        ) : (
          <>
            <EtapaTimeline
              pecaLista={pecaLista}
              etapaAtiva={etapaFiltro}
              onChange={(e) => setEtapaFiltro(e)}
            />
            <div className={cx('grid gap-4', wide ? 'grid-cols-2' : 'grid-cols-1')}>
              {pecaLista.map(({ peca, agg, qtdMaquinas, qtdEmpresas }) => (
                <PecaCard
                  key={peca.id}
                  peca={peca}
                  agg={agg}
                  qtdMaquinas={qtdMaquinas}
                  qtdEmpresas={qtdEmpresas}
                  onClick={() => go({ name: 'peca', pecaId: peca.id })}
                />
              ))}
              {pecaLista.length === 0 && (
                <p className="col-span-2 py-10 text-center text-sm text-brand-400">
                  Nenhuma peça nesta etapa.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function EmpresaCard({ empresa, resumo }: { empresa: Empresa; resumo: EmpresaResumo }) {
  const { go } = useNav()
  const t = STATUS_TOKENS[resumo.total.nivel]

  return (
    <Card className="overflow-hidden" onClick={() => go({ name: 'dashboard', empresaId: empresa.id })}>
      <div className="flex items-center gap-4 p-4">
        <ProgressRing razao={resumo.total.razao} nivel={resumo.total.nivel} size={72} stroke={8}>
          <span className={cx('text-lg font-extrabold', t.corTexto)}>{pct(resumo.total.razao)}%</span>
        </ProgressRing>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-brand-400">
            <Building2 size={13} />
            <span className="truncate text-xs">{empresa.cidade}</span>
          </div>
          <h3 className="truncate text-base font-extrabold text-brand-950">{empresa.nome}</h3>
          <div className="mt-1 flex items-center gap-2">
            <StatusBadge nivel={resumo.total.nivel} />
            {resumo.qtdAtencao > 0 && (
              <span className="text-xs font-semibold text-brand-500">{resumo.qtdAtencao} em atenção</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-brand-100 border-t border-brand-100 text-center">
        <Metric icon={<TrendingUp size={14} />} label="Peças / meta">
          {nInt(resumo.total.realizado)}
          <span className="text-brand-400"> / {nInt(resumo.total.meta)}</span>
        </Metric>
        <Metric icon={<Factory size={14} />} label="Máquinas">
          {resumo.qtdMaquinasAtivas}
        </Metric>
        <Metric label="Alertas">
          <span className="text-amber-600">{resumo.qtdAmarelas}</span>
          <span className="text-brand-300"> · </span>
          <span className="text-red-600">{resumo.qtdVermelhas}</span>
        </Metric>
      </div>
    </Card>
  )
}

function Metric({ icon, label, children }: { icon?: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="px-2 py-2.5">
      <p className="flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-brand-400">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 text-sm font-bold text-brand-950">{children}</p>
    </div>
  )
}

type PecaItem = { peca: Peca; agg: DiaAgg; qtdMaquinas: number; qtdEmpresas: number }

function EtapaTimeline({
  pecaLista,
  etapaAtiva,
  onChange,
}: {
  pecaLista: PecaItem[]
  etapaAtiva: EtapaPeca | null
  onChange: (e: EtapaPeca | null) => void
}) {
  // Contagem total por etapa (ignora filtro ativo para mostrar sempre os números)
  const allCounts = ETAPAS.reduce(
    (acc, e) => ({ ...acc, [e.id]: pecaLista.filter((p) => p.peca.etapa === e.id).length }),
    {} as Record<EtapaPeca, number>,
  )

  const etapaAtivaIdx = etapaAtiva ? ETAPAS.findIndex((e) => e.id === etapaAtiva) : -1

  return (
    <div className="mb-5">
      <div className="no-scrollbar flex items-center overflow-x-auto rounded-3xl border border-brand-100 bg-brand-50 p-2">
        {ETAPAS.map((etapa, idx) => {
          const ativo = etapaAtiva === etapa.id
          const concluido = etapaAtivaIdx > idx
          return (
            <div key={etapa.id} className="flex items-center">
              {idx > 0 && (
                <div
                  className={cx(
                    'h-px w-5 shrink-0 transition-colors',
                    concluido || ativo ? 'bg-brand-400' : 'bg-brand-200',
                  )}
                />
              )}
              <button
                type="button"
                onClick={() => onChange(ativo ? null : etapa.id)}
                className={cx(
                  'relative flex shrink-0 flex-col items-center gap-1 rounded-2xl px-3.5 py-2.5 transition active:scale-95',
                  ativo
                    ? 'bg-brand-900 text-white shadow-lift'
                    : concluido
                    ? 'bg-brand-200 text-brand-700'
                    : 'bg-white text-brand-500 hover:bg-brand-100',
                )}
              >
                <etapa.Icon size={15} />
                <span className="text-[11px] font-bold leading-none">{etapa.label}</span>
                <span
                  className={cx(
                    'min-w-[18px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-extrabold leading-none',
                    ativo ? 'bg-white/25 text-white' : 'bg-brand-100 text-brand-500',
                  )}
                >
                  {allCounts[etapa.id]}
                </span>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PecaCard({
  peca,
  agg,
  qtdMaquinas,
  qtdEmpresas,
  onClick,
}: {
  peca: Peca
  agg: DiaAgg
  qtdMaquinas: number
  qtdEmpresas: number
  onClick?: () => void
}) {
  const t = STATUS_TOKENS[agg.nivel]

  return (
    <div
      onClick={onClick}
      className={cx(
        'overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-card transition',
        onClick && 'cursor-pointer active:scale-[0.98] hover:shadow-md',
      )}
    >
      {/* Hero image */}
      <div className="relative h-44 overflow-hidden bg-brand-100">
        <img
          src={peca.fotoUrl}
          alt={peca.nome}
          className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
          onError={(e) => {
            ;(e.currentTarget as HTMLImageElement).style.opacity = '0'
          }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Status chip top-right */}
        <span
          className={cx(
            'absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold backdrop-blur-sm',
            t.chip,
          )}
        >
          {t.texto}
        </span>

        {/* Title bottom-left */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-base font-extrabold leading-tight text-white drop-shadow-sm">
            {peca.nome}
          </h3>
          <p className="mt-0.5 line-clamp-1 text-xs text-white/60">{peca.descricao}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4">
        {/* Numbers row */}
        <div className="mb-1.5 flex items-baseline gap-1.5">
          <span className={cx('text-xl font-black leading-none', t.corTexto)}>
            {nInt(agg.realizado)}
          </span>
          <span className="text-sm text-brand-400">/ {nInt(agg.meta)} peças</span>
          <span className={cx('ml-auto text-sm font-extrabold', t.corTexto)}>
            {pct(agg.razao)}%
          </span>
        </div>

        {/* Progress bar */}
        <ProgressBar razao={agg.razao} nivel={agg.nivel} className="mb-3" />

        {/* Meta info */}
        <div className="flex items-center gap-3 text-xs text-brand-400">
          <span className="flex items-center gap-1">
            <Building2 size={12} />
            {qtdEmpresas} {qtdEmpresas === 1 ? 'confecção' : 'confecções'}
          </span>
          <span className="text-brand-200">·</span>
          <span className="flex items-center gap-1">
            <Factory size={12} />
            {qtdMaquinas} máq.
          </span>
          <span className="ml-auto font-semibold text-brand-500">
            meta {peca.metaHora} pç/h
          </span>
        </div>
      </div>
    </div>
  )
}
