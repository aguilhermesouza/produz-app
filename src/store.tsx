import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Incidente, Maquina, Operacao, Peca, ProducaoMap, TipoIncidente } from './types'
import {
  EMPRESAS,
  FUNCIONARIOS,
  INCIDENTES,
  MAQUINAS,
  OPERACOES,
  PECAS,
  PRODUCAO,
} from './data/mock'
import { TOTAL_JANELAS } from './lib/status'

interface StoreValue {
  empresas: typeof EMPRESAS
  funcionarios: typeof FUNCIONARIOS
  operacoes: Operacao[]
  pecas: Peca[]
  maquinas: Maquina[]
  producao: ProducaoMap
  incidentes: Incidente[]

  // seletores
  maquinasDaEmpresa: (empresaId: string) => Maquina[]
  pecasDaEmpresa: (empresaId: string) => Peca[]
  peca: (pecaId: string) => Peca | undefined
  operacao: (operacaoId: string) => Operacao | undefined
  funcionarioNome: (id: string | null) => string
  incidentesDaMaquina: (maquinaId: string, hourIndex?: number) => Incidente[]

  // ações
  setProducao: (maquinaId: string, hourIndex: number, valor: number | null) => void
  addIncidente: (
    maquinaId: string,
    hourIndex: number,
    tipo: TipoIncidente,
    descricao?: string,
    minutosParado?: number,
  ) => void
  updateMaquina: (id: string, patch: Partial<Maquina>) => void
  bulkUpdateMaquinas: (ids: string[], patch: Partial<Maquina>) => void
  addMaquina: (m: Omit<Maquina, 'id' | 'codigo'>) => void
  removeMaquina: (id: string) => void
  trocarFuncionario: (maquinaId: string, novoFuncionarioId: string) => void
  updatePecaMeta: (pecaId: string, metaHora: number) => void
  realizadoDia: Record<string, number>
  updateRealizadoDia: (pecaId: string, total: number) => void
}

const StoreContext = createContext<StoreValue | null>(null)

let novaMaquinaSeq = 1000

export function StoreProvider({ children }: { children: ReactNode }) {
  const [maquinas, setMaquinas] = useState<Maquina[]>(MAQUINAS)
  const [pecas, setPecas] = useState<Peca[]>(PECAS)
  const [producao, setProducaoState] = useState<ProducaoMap>(PRODUCAO)
  const [incidentes, setIncidentes] = useState<Incidente[]>(INCIDENTES)

  const maquinasDaEmpresa = useCallback(
    (empresaId: string) => maquinas.filter((m) => m.empresaId === empresaId),
    [maquinas],
  )

  const pecasDaEmpresa = useCallback(
    (empresaId: string) => {
      const ids = new Set(maquinas.filter((m) => m.empresaId === empresaId).map((m) => m.pecaId))
      return pecas.filter((p) => ids.has(p.id))
    },
    [maquinas, pecas],
  )

  const peca = useCallback((pecaId: string) => pecas.find((p) => p.id === pecaId), [pecas])
  const operacao = useCallback((id: string) => OPERACOES.find((o) => o.id === id), [])
  const funcionarioNome = useCallback((id: string | null) => {
    if (!id) return 'Sem funcionário'
    return FUNCIONARIOS.find((f) => f.id === id)?.nome ?? 'Desconhecido'
  }, [])

  const incidentesDaMaquina = useCallback(
    (maquinaId: string, hourIndex?: number) =>
      incidentes.filter(
        (i) => i.maquinaId === maquinaId && (hourIndex === undefined || i.hourIndex === hourIndex),
      ),
    [incidentes],
  )

  const setProducao = useCallback((maquinaId: string, hourIndex: number, valor: number | null) => {
    setProducaoState((prev) => {
      const arr = prev[maquinaId] ? [...prev[maquinaId]] : new Array(TOTAL_JANELAS).fill(null)
      arr[hourIndex] = valor
      return { ...prev, [maquinaId]: arr }
    })
  }, [])

  const addIncidente = useCallback(
    (
      maquinaId: string,
      hourIndex: number,
      tipo: TipoIncidente,
      descricao?: string,
      minutosParado?: number,
    ) => {
      const criadoEm = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })
      setIncidentes((prev) => [
        ...prev,
        { id: `inc-${Date.now()}`, maquinaId, hourIndex, tipo, descricao, minutosParado, criadoEm },
      ])
    },
    [],
  )

  const updateMaquina = useCallback((id: string, patch: Partial<Maquina>) => {
    setMaquinas((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }, [])

  const bulkUpdateMaquinas = useCallback((ids: string[], patch: Partial<Maquina>) => {
    const set = new Set(ids)
    setMaquinas((prev) => prev.map((m) => (set.has(m.id) ? { ...m, ...patch } : m)))
  }, [])

  const addMaquina = useCallback((m: Omit<Maquina, 'id' | 'codigo'>) => {
    novaMaquinaSeq += 1
    const id = `maq-${novaMaquinaSeq}`
    const codigo = `M-${novaMaquinaSeq - 900}`
    setMaquinas((prev) => [...prev, { ...m, id, codigo }])
    setProducaoState((prev) => ({ ...prev, [id]: new Array(TOTAL_JANELAS).fill(null) }))
  }, [])

  const removeMaquina = useCallback((id: string) => {
    setMaquinas((prev) => prev.filter((m) => m.id !== id))
  }, [])

  const trocarFuncionario = useCallback(
    (maquinaId: string, novoFuncionarioId: string) => {
      setMaquinas((prev) =>
        prev.map((m) => (m.id === maquinaId ? { ...m, funcionarioId: novoFuncionarioId } : m)),
      )
      const hourIndex = 7
      const criadoEm = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      setIncidentes((prev) => [
        ...prev,
        {
          id: `inc-${Date.now()}`,
          maquinaId,
          hourIndex,
          tipo: 'troca',
          descricao: 'Substituição de funcionário durante o expediente.',
          criadoEm,
        },
      ])
    },
    [],
  )

  const updatePecaMeta = useCallback((pecaId: string, metaHora: number) => {
    setPecas((prev) => prev.map((p) => (p.id === pecaId ? { ...p, metaHora } : p)))
  }, [])

  const [realizadoDia, setRealizadoDia] = useState<Record<string, number>>({})
  const updateRealizadoDia = useCallback((pecaId: string, total: number) => {
    setRealizadoDia((prev) => ({ ...prev, [pecaId]: total }))
  }, [])

  const value = useMemo<StoreValue>(
    () => ({
      empresas: EMPRESAS,
      funcionarios: FUNCIONARIOS,
      operacoes: OPERACOES,
      pecas,
      maquinas,
      producao,
      incidentes,
      maquinasDaEmpresa,
      pecasDaEmpresa,
      peca,
      operacao,
      funcionarioNome,
      incidentesDaMaquina,
      setProducao,
      addIncidente,
      updateMaquina,
      bulkUpdateMaquinas,
      addMaquina,
      removeMaquina,
      trocarFuncionario,
      updatePecaMeta,
      realizadoDia,
      updateRealizadoDia,
    }),
    [
      maquinas,
      pecas,
      producao,
      incidentes,
      realizadoDia,
      maquinasDaEmpresa,
      pecasDaEmpresa,
      peca,
      operacao,
      funcionarioNome,
      incidentesDaMaquina,
      setProducao,
      addIncidente,
      updateMaquina,
      bulkUpdateMaquinas,
      addMaquina,
      removeMaquina,
      trocarFuncionario,
      updatePecaMeta,
      updateRealizadoDia,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore deve ser usado dentro de StoreProvider')
  return ctx
}
