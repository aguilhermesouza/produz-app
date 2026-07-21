import { useMemo, useState, type ReactNode } from 'react'
import { Bell, Building2, Factory, Search, TrendingUp } from 'lucide-react'
import { useStore } from '../store'
import { useNav } from '../nav'
import { useDevice } from '../components/DeviceFrame'
import { useEmpresaResumo, type EmpresaResumo } from '../hooks/useEmpresa'
import { Card, ProgressRing, StatusBadge } from '../components/ui'
import { STATUS_TOKENS, pct } from '../lib/status'
import { cx, nInt } from '../lib/format'
import type { Empresa, StatusNivel } from '../types'

type Ordem = 'status' | 'nome'

const PESO_STATUS: Record<StatusNivel, number> = { bad: 0, warn: 1, ok: 2 }

export function EmpresasScreen() {
  const { empresas } = useStore()
  const { wide } = useDevice()
  const [busca, setBusca] = useState('')
  const [ordem, setOrdem] = useState<Ordem>('status')

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

  return (
    <div className="flex h-full flex-col">
      <header className="relative z-20 border-b border-brand-200 bg-white/90 px-4 pb-4 pt-5 backdrop-blur-md">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-brand-400">Bom trabalho hoje 👋</p>
            <h1 className="text-2xl font-extrabold leading-tight text-brand-950">Minhas confecções</h1>
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
            placeholder="Buscar empresa ou cidade…"
            className="w-full rounded-2xl border border-brand-200 bg-brand-50 py-3 pl-10 pr-3 text-sm text-brand-950 outline-none transition placeholder:text-brand-400 focus:border-brand-400 focus:bg-white"
          />
        </div>
      </header>

      <div className="thin-scroll flex-1 overflow-y-auto px-4 pb-6 pt-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs font-semibold text-brand-500">Ordenar por</span>
          {(['status', 'nome'] as Ordem[]).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setOrdem(o)}
              className={cx(
                'rounded-full px-3 py-1 text-xs font-semibold transition',
                ordem === o ? 'bg-brand-600 text-white' : 'bg-white text-brand-600',
              )}
            >
              {o === 'status' ? 'Situação' : 'Nome'}
            </button>
          ))}
        </div>

        <div className={cx('grid gap-3', wide ? 'grid-cols-2' : 'grid-cols-1')}>
          {lista.map(({ empresa, resumo }) => (
            <EmpresaCard key={empresa.id} empresa={empresa} resumo={resumo} />
          ))}
        </div>
      </div>
    </div>
  )
}

function EmpresaCard({ empresa, resumo }: { empresa: Empresa; resumo: EmpresaResumo }) {
  const { go } = useNav()
  const t = STATUS_TOKENS[resumo.total.nivel]

  return (
    <Card className="overflow-hidden" onClick={() => go({ name: 'dashboard', empresaId: empresa.id })}>
      <div className="h-1.5 w-full" style={{ background: empresa.cor }} />
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
