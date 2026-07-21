import { useMemo } from 'react'
import { useStore } from '../store'
import { agregarPeca, combinarPecas, type DiaAgg } from '../lib/aggregates'
import type { Peca } from '../types'
import { getHoraAtualIndex, statusJanela } from '../lib/status'

export interface PecaResumo {
  peca: Peca
  agg: DiaAgg
  qtdMaquinas: number
}

export interface EmpresaResumo {
  total: DiaAgg
  pecas: PecaResumo[]
  qtdMaquinasAtivas: number
  qtdAtencao: number // amarelas + vermelhas na hora atual
  qtdVermelhas: number
  qtdAmarelas: number
}

export function useEmpresaResumo(empresaId: string, ateIndex = getHoraAtualIndex()): EmpresaResumo {
  const { maquinasDaEmpresa, pecasDaEmpresa, producao } = useStore()

  return useMemo(() => {
    const maquinas = maquinasDaEmpresa(empresaId).filter((m) => m.ativa)
    const pecas = pecasDaEmpresa(empresaId)

    const resumoPecas: PecaResumo[] = pecas.map((p) => {
      const maquinasPeca = maquinas.filter((m) => m.pecaId === p.id)
      return {
        peca: p,
        agg: agregarPeca(maquinasPeca, producao, p.metaHora, ateIndex),
        qtdMaquinas: maquinasPeca.length,
      }
    })

    const total = combinarPecas(resumoPecas.map((r) => r.agg))

    let qtdAmarelas = 0
    let qtdVermelhas = 0
    for (const m of maquinas) {
      const nivel = statusJanela(producao[m.id]?.[ateIndex] ?? null, m.metaHora)
      if (nivel === 'warn') qtdAmarelas += 1
      if (nivel === 'bad') qtdVermelhas += 1
    }

    return {
      total,
      pecas: resumoPecas,
      qtdMaquinasAtivas: maquinas.length,
      qtdAtencao: qtdAmarelas + qtdVermelhas,
      qtdVermelhas,
      qtdAmarelas,
    }
  }, [empresaId, maquinasDaEmpresa, pecasDaEmpresa, producao, ateIndex])
}
