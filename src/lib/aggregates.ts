import type { Maquina, ProducaoMap, StatusNivel } from '../types'
import { HORA_ATUAL_INDEX, TOTAL_JANELAS, statusHora, statusJanela, statusPorRazao } from './status'

export interface HoraAgg {
  index: number
  realizado: number | null
  meta: number
  nivel: StatusNivel | null
  futura: boolean
}

export interface DiaAgg {
  horas: HoraAgg[]
  realizado: number
  meta: number
  razao: number
  nivel: StatusNivel
}

/**
 * Agrega uma peça (célula): a produção finalizada por hora é estimada pela média
 * das operações naquela janela (throughput da linha balanceada), comparada com a
 * meta de peças/hora da peça.
 */
export function agregarPeca(
  maquinasPeca: Maquina[],
  producao: ProducaoMap,
  metaHoraPeca: number,
  ateIndex = HORA_ATUAL_INDEX,
): DiaAgg {
  const horas: HoraAgg[] = []
  let realizadoDia = 0
  let janelasFechadas = 0

  for (let h = 0; h < TOTAL_JANELAS; h++) {
    const valores = maquinasPeca
      .map((m) => producao[m.id]?.[h])
      .filter((v): v is number => v !== null && v !== undefined)

    const futura = h > ateIndex
    let realizado: number | null = null
    if (valores.length > 0) {
      realizado = Math.round(valores.reduce((a, b) => a + b, 0) / valores.length)
    }

    if (realizado !== null && !futura) {
      realizadoDia += realizado
      janelasFechadas += 1
    }

    horas.push({
      index: h,
      realizado,
      meta: metaHoraPeca,
      nivel: futura ? null : statusHora(realizado, metaHoraPeca),
      futura,
    })
  }

  const meta = metaHoraPeca * janelasFechadas
  const razao = meta > 0 ? realizadoDia / meta : 1
  return { horas, realizado: realizadoDia, meta, razao, nivel: statusPorRazao(razao) }
}

/** Combina várias peças em um agregado único (visão total da empresa). */
export function combinarPecas(aggs: DiaAgg[]): DiaAgg {
  const horas: HoraAgg[] = []
  for (let h = 0; h < TOTAL_JANELAS; h++) {
    let realizado = 0
    let meta = 0
    let temValor = false
    let futura = true
    for (const a of aggs) {
      const hora = a.horas[h]
      if (!hora) continue
      if (!hora.futura) futura = false
      // só acumula horas já fechadas (não futuras)
      if (!hora.futura && hora.realizado !== null) {
        realizado += hora.realizado
        meta += hora.meta
        temValor = true
      }
    }
    horas.push({
      index: h,
      realizado: temValor ? realizado : null,
      meta,
      nivel: !futura && temValor ? statusHora(realizado, meta) : null,
      futura,
    })
  }
  const realizado = aggs.reduce((a, b) => a + b.realizado, 0)
  const meta = aggs.reduce((a, b) => a + b.meta, 0)
  const razao = meta > 0 ? realizado / meta : 1
  return { horas, realizado, meta, razao, nivel: statusPorRazao(razao) }
}

export interface ContagemStatus {
  ok: number
  warn: number
  bad: number
  total: number
}

/** Conta máquinas por status em uma janela específica. */
export function contarStatusNaHora(
  maquinas: Maquina[],
  producao: ProducaoMap,
  hourIndex: number,
): ContagemStatus {
  const c: ContagemStatus = { ok: 0, warn: 0, bad: 0, total: 0 }
  for (const m of maquinas) {
    const nivel = statusJanela(producao[m.id]?.[hourIndex] ?? null, m.metaHora)
    if (!nivel) continue
    c[nivel] += 1
    c.total += 1
  }
  return c
}
