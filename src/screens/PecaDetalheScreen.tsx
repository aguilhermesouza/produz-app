import { useState } from 'react'
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  Cog,
  Droplets,
  Package,
  Scissors,
  Timer,
  Truck,
  Wrench,
} from 'lucide-react'
import { useStore } from '../store'
import { useNav } from '../nav'
import { useDevice } from '../components/DeviceFrame'
import { agregarPeca } from '../lib/aggregates'
import { STATUS_TOKENS, getHoraAtualIndex } from '../lib/status'
import { Card } from '../components/ui'
import { BottomSheet } from '../components/BottomSheet'
import { NumericPad } from '../components/NumericPad'
import { cx, nInt } from '../lib/format'
import type { EtapaPeca, Peca } from '../types'
import {
  ETAPA_LABEL,
  ETAPA_SHADE,
  etapaFrente,
  wipPorEtapa,
} from '../lib/etapas'

// ---------------------------------------------------------------------------
// Config de etapas
// ---------------------------------------------------------------------------

const ETAPA_CONFIG: {
  id: EtapaPeca
  label: string
  Icon: React.ElementType
}[] = [
  { id: 'corte', label: 'Corte', Icon: Scissors },
  { id: 'producao', label: 'Produção', Icon: Cog },
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

// ---------------------------------------------------------------------------
// JornadaTimeline
// ---------------------------------------------------------------------------

const ETAPAS_JORNADA: EtapaPeca[] = ['corte', 'producao', 'lavanderia', 'embalagem', 'expedicao']
// Etapas onde há WIP editável (corte é marco de conclusão, não WIP)
const ETAPAS_WIP: EtapaPeca[] = ['producao', 'lavanderia', 'embalagem', 'expedicao']

function iconePorEtapa(etapa: EtapaPeca): React.ElementType {
  return ETAPA_CONFIG.find((e) => e.id === etapa)?.Icon ?? Cog
}

function JornadaTimeline({ peca }: { peca: Peca }) {
  const total = peca.quantidadeTotal
  const wip = wipPorEtapa(peca)

  // Estado local editável — apenas etapas WIP (corte é marco, não editável)
  const [localWip, setLocalWip] = useState<Record<string, number>>(
    () => Object.fromEntries(ETAPAS_WIP.map((e) => [e, wip[e] ?? 0])),
  )
  const [editando, setEditando] = useState<EtapaPeca | null>(null)
  const [tempVal, setTempVal] = useState('')

  const totalDistribuido = ETAPAS_WIP.reduce((s, e) => s + (localWip[e] ?? 0), 0)
  const saldo = total - totalDistribuido

  const abrirEditor = (etapa: EtapaPeca) => {
    setTempVal(localWip[etapa] > 0 ? String(localWip[etapa]) : '')
    setEditando(etapa)
  }

  const confirmarEdicao = () => {
    if (!editando) return
    setLocalWip((prev) => ({ ...prev, [editando]: Number(tempVal) || 0 }))
    setEditando(null)
  }

  const segmentos = ETAPAS_WIP.map((e) => ({ etapa: e, qtd: localWip[e] ?? 0 })).filter(
    (s) => s.qtd > 0,
  )

  return (
    <div>
      {/* Cabeçalho: total + status de distribuição */}
      <div className="mb-3 flex items-end justify-between px-5">
        <div>
          <p className="text-3xl font-black leading-none text-brand-950">{nInt(total)}</p>
          <p className="mt-0.5 text-xs font-medium text-brand-400">peças na ordem</p>
        </div>
        <div className="text-right">
          <p
            className={cx(
              'text-sm font-extrabold leading-none',
              saldo === 0 ? 'text-emerald-600' : saldo < 0 ? 'text-red-500' : 'text-brand-400',
            )}
          >
            {saldo === 0
              ? '✓ totalmente distribuído'
              : saldo > 0
              ? `${nInt(saldo)} sem etapa`
              : `${nInt(Math.abs(saldo))} acima do total`}
          </p>
          <p className="mt-0.5 text-xs font-medium text-brand-400">
            distribuídas: {nInt(totalDistribuido)}
          </p>
        </div>
      </div>

      {/* Barra de distribuição — reativa às edições */}
      <div className="px-5">
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-brand-100">
          {segmentos.map((s) => (
            <div
              key={s.etapa}
              className={cx('h-full transition-all duration-500', ETAPA_SHADE[s.etapa].bg)}
              style={{ width: `${(s.qtd / total) * 100}%` }}
            />
          ))}
        </div>
        <div className="no-scrollbar mt-2 flex gap-3 overflow-x-auto pb-0.5">
          {segmentos.map((s) => (
            <div key={s.etapa} className="flex shrink-0 items-center gap-1.5">
              <span className={cx('h-2 w-2 shrink-0 rounded-full', ETAPA_SHADE[s.etapa].dot)} />
              <span className="whitespace-nowrap text-[11px] font-semibold text-brand-600">
                {ETAPA_LABEL[s.etapa]}
              </span>
              <span className="text-[11px] font-black text-brand-900">{nInt(s.qtd)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cards horizontais — toque para editar */}
      <div className="no-scrollbar mt-5 overflow-x-auto">
        <div className="flex items-stretch px-5 pb-1">
          {ETAPAS_JORNADA.map((etapa, idx) => {
            const info = peca.etapas?.[etapa]
            // Corte é marco de conclusão: exibe o total cortado (cumulativo), não WIP
            const ehCorte = etapa === 'corte'
            const qtd = ehCorte ? (peca.etapas?.corte?.qtd ?? 0) : (localWip[etapa] ?? 0)
            const ratio = total > 0 ? qtd / total : 0
            const concluido = qtd >= total && total > 0
            const emCurso = !concluido && qtd > 0
            const Icon = iconePorEtapa(etapa)

            return (
              <div key={etapa} className="flex items-center">
                {/* Conector entre cards */}
                {idx > 0 && (
                  <div
                    className={cx(
                      'h-[2px] w-3 shrink-0 transition-colors duration-300',
                      qtd > 0 ? ETAPA_SHADE[etapa].bg : 'bg-brand-200',
                    )}
                  />
                )}

                {/* Card clicável (corte é somente leitura) */}
                <button
                  type="button"
                  onClick={() => !ehCorte && abrirEditor(etapa)}
                  className={cx(
                    'flex w-[108px] shrink-0 flex-col rounded-2xl p-3 text-left transition active:scale-95',
                    concluido
                      ? 'bg-brand-800 shadow-lift'
                      : emCurso
                      ? 'bg-brand-900 shadow-lift ring-2 ring-brand-400'
                      : qtd > 0
                      ? 'bg-white shadow-card hover:shadow-md'
                      : 'bg-brand-50',
                  )}
                >
                  {/* Ícone */}
                  <div
                    className={cx(
                      'mb-2 flex h-8 w-8 items-center justify-center rounded-xl',
                      concluido || emCurso ? 'bg-white/15' : 'bg-brand-100',
                    )}
                  >
                    <Icon
                      size={16}
                      className={cx(
                        concluido || emCurso ? 'text-white' : ETAPA_SHADE[etapa].text,
                      )}
                    />
                  </div>

                  {/* Quantidade */}
                  <p
                    className={cx(
                      'text-xl font-black leading-none tabular-nums',
                      concluido || emCurso ? 'text-white' : qtd > 0 ? 'text-brand-950' : 'text-brand-300',
                    )}
                  >
                    {nInt(qtd)}
                  </p>
                  <p
                    className={cx(
                      'mt-0.5 text-[10px] font-medium',
                      concluido || emCurso ? 'text-white/60' : 'text-brand-400',
                    )}
                  >
                    peças
                  </p>

                  {/* Mini barra de progresso */}
                  <div
                    className={cx(
                      'mt-2.5 h-1 w-full overflow-hidden rounded-full',
                      concluido || emCurso ? 'bg-white/20' : 'bg-brand-100',
                    )}
                  >
                    <div
                      className={cx(
                        'h-full rounded-full transition-all duration-500',
                        concluido || emCurso ? 'bg-white' : ETAPA_SHADE[etapa].bg,
                      )}
                      style={{ width: `${Math.min(100, ratio * 100)}%` }}
                    />
                  </div>
                  <p
                    className={cx(
                      'mt-1 text-[10px] font-bold',
                      concluido || emCurso ? 'text-white/80' : 'text-brand-500',
                    )}
                  >
                    {Math.round(ratio * 100)}%
                  </p>

                  {/* Nome da etapa */}
                  <p
                    className={cx(
                      'mt-2.5 text-[11px] font-extrabold leading-tight',
                      concluido || emCurso ? 'text-white' : qtd > 0 ? 'text-brand-700' : 'text-brand-400',
                    )}
                  >
                    {ETAPA_LABEL[etapa]}
                  </p>

                  {/* Data ou status */}
                  <p
                    className={cx(
                      'mt-0.5 text-[10px] leading-tight',
                      concluido || emCurso ? 'text-white/60' : 'text-brand-400',
                    )}
                  >
                    {concluido
                      ? info?.realizado
                        ? fmtData(info.realizado)
                        : '✓ concluído'
                      : emCurso
                      ? 'em curso'
                      : info?.planejado
                      ? fmtData(info.planejado)
                      : '—'}
                  </p>
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <p className="mt-3 px-5 text-[10px] font-medium text-brand-400">
        Toque em uma etapa para atualizar a quantidade.
      </p>

      {/* BottomSheet de edição de quantidade */}
      <BottomSheet
        open={editando !== null}
        onClose={() => setEditando(null)}
        title={editando ? `${ETAPA_LABEL[editando]} — quantidade` : ''}
      >
        {editando && (
          <div>
            <div className="mb-4 flex items-center justify-between rounded-2xl bg-brand-50 px-4 py-3">
              <span className="text-sm font-semibold text-brand-500">Total da OP</span>
              <span className="text-xl font-black text-brand-950">{nInt(total)} pç</span>
            </div>
            <div className="mb-4 rounded-2xl bg-brand-900 px-4 py-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                Peças em {ETAPA_LABEL[editando]}
              </p>
              <p className="text-4xl font-black tabular-nums text-white">
                {tempVal !== '' ? nInt(Number(tempVal)) : '0'}
              </p>
            </div>
            <NumericPad value={tempVal} onChange={setTempVal} />
            <button
              type="button"
              onClick={confirmarEdicao}
              className="mt-4 w-full rounded-2xl bg-brand-900 py-3.5 text-base font-bold text-white shadow-lift transition active:scale-95"
            >
              Confirmar
            </button>
          </div>
        )}
      </BottomSheet>
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
          

          {/* ---- Estudo de Tempos --------------------------------------- */}
          <button
            type="button"
            onClick={() => go({ name: 'cronometragem', pecaId })}
            className="flex w-full items-center gap-4 rounded-2xl border-2 border-brand-100 bg-white p-4 text-left shadow-sm transition hover:border-brand-300 hover:shadow-md active:scale-[0.98]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-900">
              <Timer size={22} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-brand-950">Estudo de Tempos</p>
              <p className="mt-0.5 text-xs text-brand-400">
                Cronometrar operações e calcular meta/hora
              </p>
            </div>
            <ChevronRight size={18} className="shrink-0 text-brand-300" />
          </button>

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

// (sem helpers)
