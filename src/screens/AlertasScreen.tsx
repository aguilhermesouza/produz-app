import { MessageCircle, Send } from 'lucide-react'
import { useStore } from '../store'
import { useNav } from '../nav'
import { useEmpresaResumo } from '../hooks/useEmpresa'
import { TopBar } from '../components/TopBar'
import { StatusBadge } from '../components/ui'
import { useToast } from '../components/Toast'
import { HORA_ATUAL_INDEX, STATUS_TOKENS, statusJanela } from '../lib/status'
import { cx, nInt } from '../lib/format'

export function AlertasScreen({ empresaId }: { empresaId?: string }) {
  const { empresas } = useStore()
  const alvo = empresaId ?? empresas[0].id
  const empresa = empresas.find((e) => e.id === alvo)!

  return <AlertasEmpresa empresaId={alvo} nomeEmpresa={empresa.nome} cor={empresa.cor} />
}

function AlertasEmpresa({ empresaId, nomeEmpresa, cor }: { empresaId: string; nomeEmpresa: string; cor: string }) {
  const { maquinasDaEmpresa, producao, operacao, funcionarioNome } = useStore()
  const resumo = useEmpresaResumo(empresaId)
  const { go } = useNav()
  const toast = useToast()

  const emRisco = maquinasDaEmpresa(empresaId)
    .filter((m) => m.ativa && m.funcionarioId)
    .map((m) => ({ m, nivel: statusJanela(producao[m.id]?.[HORA_ATUAL_INDEX] ?? null, m.metaHora) }))
    .filter((x) => x.nivel === 'warn' || x.nivel === 'bad')
    .sort((a, b) => (a.nivel === 'bad' ? -1 : 1) - (b.nivel === 'bad' ? -1 : 1))

  const notificar = (texto: string) => toast(`WhatsApp enviado: ${texto}`)

  return (
    <div className="flex h-full flex-col">
      <TopBar title="Alertas do dia" subtitle={nomeEmpresa} color={cor} />

      <div className="thin-scroll flex-1 overflow-y-auto px-4 pb-6 pt-4">
        {/* Resumo */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-3 text-center">
            <p className="text-3xl font-black text-red-600">{resumo.qtdVermelhas}</p>
            <p className="text-xs font-semibold text-red-700">Abaixo da meta</p>
          </div>
          <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-3 text-center">
            <p className="text-3xl font-black text-amber-600">{resumo.qtdAmarelas}</p>
            <p className="text-xs font-semibold text-amber-700">Em alerta</p>
          </div>
        </div>

        {resumo.qtdAtencao > 0 && (
          <button
            type="button"
            onClick={() => notificar(`resumo de ${nomeEmpresa}`)}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 py-3 text-sm font-bold text-white shadow-lift active:scale-95"
          >
            <MessageCircle size={18} />
            Notificar gestor via WhatsApp
          </button>
        )}

        {emRisco.length === 0 ? (
          <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-6 text-center">
            <p className="text-2xl">✅</p>
            <p className="mt-1 font-bold text-green-700">Tudo no ritmo!</p>
            <p className="text-sm text-green-600">Nenhuma máquina em alerta agora.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {emRisco.map(({ m, nivel }) => {
              const t = STATUS_TOKENS[nivel!]
              const v = producao[m.id]?.[HORA_ATUAL_INDEX] ?? 0
              return (
                <div key={m.id} className={cx('flex items-center gap-3 rounded-xl border-2 p-3', t.bg, t.borda)}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-brand-950">
                      {m.codigo} · <span className="font-medium text-brand-600">{operacao(m.operacaoId)?.nome}</span>
                    </p>
                    <p className="truncate text-xs text-brand-500">{funcionarioNome(m.funcionarioId)}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <StatusBadge nivel={nivel!} />
                      <span className="text-xs font-semibold text-brand-600">
                        {nInt(v)} / {m.metaHora}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => notificar(m.codigo)}
                    aria-label="Notificar via WhatsApp"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-green-600 text-white active:scale-95"
                  >
                    <Send size={17} />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() => go({ name: 'mapa', empresaId, hourIndex: HORA_ATUAL_INDEX })}
          className="mt-4 w-full rounded-2xl border-2 border-brand-200 bg-white py-3 text-sm font-bold text-brand-600 active:scale-95"
        >
          Ver mapa de máquinas
        </button>
      </div>
    </div>
  )
}
