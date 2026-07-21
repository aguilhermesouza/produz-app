import { useMemo, useState } from 'react'
import { Search, UserCheck } from 'lucide-react'
import type { Maquina } from '../types'
import { BottomSheet } from '../components/BottomSheet'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { cx } from '../lib/format'

export function TrocaFuncionarioSheet({
  maquina,
  open,
  onClose,
}: {
  maquina: Maquina | null
  open: boolean
  onClose: () => void
}) {
  const { funcionarios, funcionarioNome, trocarFuncionario, operacao } = useStore()
  const toast = useToast()
  const [busca, setBusca] = useState('')
  const [sel, setSel] = useState<string | null>(null)

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return funcionarios
      .filter((f) => f.id !== maquina?.funcionarioId)
      .filter((f) => !q || f.nome.toLowerCase().includes(q) || f.matricula.includes(q))
      .slice(0, 40)
  }, [funcionarios, busca, maquina])

  if (!maquina) return null

  const confirmar = () => {
    if (!sel) return
    trocarFuncionario(maquina.id, sel)
    toast(`Funcionário trocado em ${maquina.codigo}`)
    setSel(null)
    setBusca('')
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={`Trocar funcionário · ${maquina.codigo}`}>
      <div className="mb-3 rounded-xl bg-brand-50 p-3 text-sm">
        <p className="text-brand-500">{operacao(maquina.operacaoId)?.nome}</p>
        <p className="font-semibold text-brand-900">Atual: {funcionarioNome(maquina.funcionarioId)}</p>
      </div>

      <div className="relative mb-3">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou matrícula…"
          className="w-full rounded-xl border-2 border-brand-100 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-brand-400"
        />
      </div>

      <div className="thin-scroll mb-4 max-h-64 space-y-1.5 overflow-y-auto">
        {lista.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setSel(f.id)}
            className={cx(
              'flex w-full items-center justify-between rounded-xl border-2 px-3 py-2.5 text-left transition active:scale-[0.98]',
              sel === f.id
                ? 'border-brand-600 bg-brand-50'
                : 'border-brand-100 bg-white hover:bg-brand-50',
            )}
          >
            <span className="text-sm font-semibold text-brand-900">{f.nome}</span>
            <span className="flex items-center gap-2 text-xs text-brand-400">
              {f.matricula}
              {sel === f.id && <UserCheck size={16} className="text-brand-600" />}
            </span>
          </button>
        ))}
      </div>

      <p className="mb-3 text-xs text-brand-400">
        A troca registra o horário e gera automaticamente um incidente do tipo “troca de
        funcionário”, preservando o histórico de produção anterior.
      </p>

      <button
        type="button"
        disabled={!sel}
        onClick={confirmar}
        className="w-full rounded-2xl bg-brand-600 py-3.5 text-base font-bold text-white shadow-lift transition active:scale-95 disabled:opacity-40"
      >
        Confirmar troca
      </button>
    </BottomSheet>
  )
}
