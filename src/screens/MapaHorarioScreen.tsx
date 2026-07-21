import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, LayoutGrid, List } from 'lucide-react'
import { useStore } from '../store'
import { useNav } from '../nav'
import { useDevice } from '../components/DeviceFrame'
import { TopBar } from '../components/TopBar'
import { MachineTile } from '../components/MachineTile'
import { Chip } from '../components/ui'
import { agregarPeca } from '../lib/aggregates'
import { HORAS, HORA_ATUAL_INDEX, STATUS_TOKENS, statusJanela } from '../lib/status'
import { cx, nInt } from '../lib/format'
import type { StatusNivel } from '../types'

export function MapaHorarioScreen({
  empresaId,
  hourIndex,
  pecaId,
}: {
  empresaId: string
  hourIndex: number
  pecaId?: string
}) {
  const { empresas, maquinasDaEmpresa, pecasDaEmpresa, producao, operacao, funcionarioNome, peca, incidentesDaMaquina } =
    useStore()
  const { go } = useNav()
  const { device } = useDevice()

  const empresa = empresas.find((e) => e.id === empresaId)!
  const [hora, setHora] = useState(hourIndex)
  const [filtroPeca, setFiltroPeca] = useState<string | null>(pecaId ?? null)
  const [filtroOp, setFiltroOp] = useState<string | null>(null)
  const [filtroStatus, setFiltroStatus] = useState<StatusNivel | null>(null)
  const [compact, setCompact] = useState(true)

  const maquinas = maquinasDaEmpresa(empresaId).filter((m) => m.ativa)
  const pecas = pecasDaEmpresa(empresaId)
  const operacoesDisponiveis = useMemo(() => {
    const ids = Array.from(new Set(maquinas.map((m) => m.operacaoId)))
    return ids.map((id) => operacao(id)!).filter(Boolean)
  }, [maquinas, operacao])

  const filtradas = maquinas.filter((m) => {
    if (filtroPeca && m.pecaId !== filtroPeca) return false
    if (filtroOp && m.operacaoId !== filtroOp) return false
    if (filtroStatus) {
      const nivel = statusJanela(producao[m.id]?.[hora] ?? null, m.metaHora)
      if (nivel !== filtroStatus) return false
    }
    return true
  })

  // Total de peças finalizadas na janela (por peça visível).
  const totalJanela = (filtroPeca ? pecas.filter((p) => p.id === filtroPeca) : pecas).reduce((acc, p) => {
    const mp = maquinas.filter((m) => m.pecaId === p.id)
    const agg = agregarPeca(mp, producao, p.metaHora)
    const v = agg.horas[hora]?.realizado
    return acc + (v ?? 0)
  }, 0)

  const contagem = { ok: 0, warn: 0, bad: 0 }
  for (const m of filtradas) {
    const n = statusJanela(producao[m.id]?.[hora] ?? null, m.metaHora)
    if (n) contagem[n] += 1
  }

  const colClass =
    device === 'desktop' ? 'grid-cols-10' : device === 'tablet' ? 'grid-cols-7' : 'grid-cols-4'

  return (
    <div className="flex h-full flex-col">
      <TopBar title={empresa.nome} subtitle="Mapa de máquinas" color={empresa.cor} />

      {/* Navegação de horário + total */}
      <div className="relative z-10 border-b border-brand-100 bg-white px-3 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label="Hora anterior"
            disabled={hora <= 0}
            onClick={() => setHora((h) => Math.max(0, h - 1))}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 disabled:opacity-30 active:scale-95"
          >
            <ChevronLeft size={22} />
          </button>

          <div className="text-center">
            <p className="text-xs font-semibold text-brand-400">Fechamento das</p>
            <p className="text-2xl font-black leading-none text-brand-950">{HORAS[hora]}</p>
            <p className="mt-0.5 text-sm font-bold text-brand-600">{nInt(totalJanela)} pç na janela</p>
          </div>

          <button
            type="button"
            aria-label="Próxima hora"
            disabled={hora >= HORA_ATUAL_INDEX}
            onClick={() => setHora((h) => Math.min(HORA_ATUAL_INDEX, h + 1))}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 disabled:opacity-30 active:scale-95"
          >
            <ChevronRight size={22} />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-center gap-2">
          <Contador nivel="ok" n={contagem.ok} />
          <Contador nivel="warn" n={contagem.warn} />
          <Contador nivel="bad" n={contagem.bad} />
        </div>
      </div>

      <div className="thin-scroll flex-1 overflow-y-auto px-3 pb-6 pt-3">
        {/* Filtros */}
        <div className="no-scrollbar mb-2 flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setCompact((c) => !c)}
            aria-label="Alternar visualização"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3 py-1.5 text-sm font-medium text-brand-700 active:scale-95"
          >
            {compact ? <List size={15} /> : <LayoutGrid size={15} />}
            {compact ? 'Lista' : 'Grade'}
          </button>
          {(['ok', 'warn', 'bad'] as StatusNivel[]).map((s) => (
            <Chip key={s} active={filtroStatus === s} onClick={() => setFiltroStatus((v) => (v === s ? null : s))}>
              {STATUS_TOKENS[s].texto}
            </Chip>
          ))}
        </div>

        {pecas.length > 1 && (
          <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto pb-1">
            <Chip active={filtroPeca === null} onClick={() => setFiltroPeca(null)}>
              Todas as peças
            </Chip>
            {pecas.map((p) => (
              <Chip key={p.id} active={filtroPeca === p.id} onClick={() => setFiltroPeca(p.id)}>
                {p.nome}
              </Chip>
            ))}
          </div>
        )}

        <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto pb-1">
          <Chip active={filtroOp === null} onClick={() => setFiltroOp(null)}>
            Todas operações
          </Chip>
          {operacoesDisponiveis.map((op) => (
            <Chip key={op.id} active={filtroOp === op.id} onClick={() => setFiltroOp(op.id)}>
              {op.nome}
            </Chip>
          ))}
        </div>

        {/* Grade / lista de máquinas */}
        {filtradas.length === 0 ? (
          <p className="py-10 text-center text-sm text-brand-400">Nenhuma máquina para os filtros.</p>
        ) : compact ? (
          <div className={cx('grid gap-2', colClass)}>
            {filtradas.map((m) => (
              <MachineTile
                key={m.id}
                maquina={m}
                realizado={producao[m.id]?.[hora] ?? null}
                operacaoNome={operacao(m.operacaoId)?.nome ?? ''}
                funcionarioNome={funcionarioNome(m.funcionarioId)}
                temIncidente={incidentesDaMaquina(m.id, hora).length > 0}
                compact
                onClick={() => go({ name: 'registro', empresaId, hourIndex: hora, maquinaId: m.id, pecaId: filtroPeca ?? undefined })}
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-2">
            {filtradas.map((m) => (
              <MachineTile
                key={m.id}
                maquina={m}
                realizado={producao[m.id]?.[hora] ?? null}
                operacaoNome={operacao(m.operacaoId)?.nome ?? ''}
                funcionarioNome={funcionarioNome(m.funcionarioId)}
                temIncidente={incidentesDaMaquina(m.id, hora).length > 0}
                compact={false}
                onClick={() => go({ name: 'registro', empresaId, hourIndex: hora, maquinaId: m.id, pecaId: filtroPeca ?? undefined })}
              />
            ))}
          </div>
        )}

        {filtroPeca && (
          <p className="mt-3 text-center text-xs text-brand-400">
            Exibindo célula “{peca(filtroPeca)?.nome}”.
          </p>
        )}
      </div>
    </div>
  )
}

function Contador({ nivel, n }: { nivel: StatusNivel; n: number }) {
  const t = STATUS_TOKENS[nivel]
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold', t.chip)}>
      <span className={cx('h-2.5 w-2.5 rounded-full', t.cor)} />
      {n}
    </span>
  )
}
