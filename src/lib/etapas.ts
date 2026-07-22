import type { EtapaPeca, Peca } from '../types'

/** Ordem canônica das etapas da jornada da peça. */
export const ETAPA_ORDER: EtapaPeca[] = [
  'aprovada',
  'medicao',
  'corte',
  'producao',
  'acabamento',
  'lavanderia',
  'embalagem',
  'expedicao',
]

/** Rótulos amigáveis por etapa. */
export const ETAPA_LABEL: Record<EtapaPeca, string> = {
  aprovada: 'Aprovada',
  medicao: 'Medição',
  corte: 'Corte',
  producao: 'Produção',
  acabamento: 'Acabamento',
  lavanderia: 'Lavanderia',
  embalagem: 'Embalagem',
  expedicao: 'Expedição',
}

/**
 * Tom monocromático por etapa (claro → escuro no sentido do fluxo).
 * Usado para colorir barras/segmentos e diferenciar etapas visualmente.
 */
export const ETAPA_SHADE: Record<EtapaPeca, { bg: string; dot: string; text: string }> = {
  aprovada:   { bg: 'bg-brand-300', dot: 'bg-brand-300', text: 'text-brand-500' },
  medicao:    { bg: 'bg-brand-400', dot: 'bg-brand-400', text: 'text-brand-600' },
  corte:      { bg: 'bg-brand-500', dot: 'bg-brand-500', text: 'text-brand-600' },
  producao:   { bg: 'bg-brand-600', dot: 'bg-brand-600', text: 'text-brand-700' },
  acabamento: { bg: 'bg-brand-700', dot: 'bg-brand-700', text: 'text-brand-700' },
  lavanderia: { bg: 'bg-brand-800', dot: 'bg-brand-800', text: 'text-brand-800' },
  embalagem:  { bg: 'bg-brand-900', dot: 'bg-brand-900', text: 'text-brand-900' },
  expedicao:  { bg: 'bg-brand-950', dot: 'bg-brand-950', text: 'text-brand-950' },
}

/** Quantidade acumulada que alcançou a etapa (0 se ausente). */
export function qtdEtapa(peca: Peca, etapa: EtapaPeca): number {
  return peca.etapas?.[etapa]?.qtd ?? 0
}

/** Percentual (0..1) da OP que já alcançou a etapa. */
export function pctEtapa(peca: Peca, etapa: EtapaPeca): number {
  if (peca.quantidadeTotal <= 0) return 0
  return qtdEtapa(peca, etapa) / peca.quantidadeTotal
}

/** Índice a partir do qual as etapas carregam quantidade física (corte em diante). */
const IDX_PRIMEIRA_PRODUCAO = 2 // 'corte'

/** True se a etapa carrega quantidade de peças (corte → expedição). */
export function etapaEhProducao(etapa: EtapaPeca): boolean {
  return ETAPA_ORDER.indexOf(etapa) >= IDX_PRIMEIRA_PRODUCAO
}

/**
 * Etapa "frente": a produção mais avançada com qtd > 0. Se a produção ainda não
 * começou, retorna o primeiro marco (aprovada/medição) ainda não concluído.
 */
export function etapaFrente(peca: Peca): EtapaPeca {
  for (let i = ETAPA_ORDER.length - 1; i >= IDX_PRIMEIRA_PRODUCAO; i--) {
    if (qtdEtapa(peca, ETAPA_ORDER[i]) > 0) return ETAPA_ORDER[i]
  }
  if (!peca.etapas?.aprovada?.realizado) return 'aprovada'
  if (!peca.etapas?.medicao?.realizado) return 'medicao'
  return 'corte'
}

/**
 * WIP (peças que estão "paradas" em cada etapa neste momento) =
 * quantidade que alcançou a etapa menos a que já avançou para a próxima.
 * A soma de todas as etapas equivale ao total da OP.
 */
export function wipPorEtapa(peca: Peca): Record<EtapaPeca, number> {
  const out = {} as Record<EtapaPeca, number>
  for (let i = 0; i < ETAPA_ORDER.length; i++) {
    const atual = qtdEtapa(peca, ETAPA_ORDER[i])
    const prox = i + 1 < ETAPA_ORDER.length ? qtdEtapa(peca, ETAPA_ORDER[i + 1]) : 0
    out[ETAPA_ORDER[i]] = Math.max(0, atual - prox)
  }
  return out
}

/** Estado de uma etapa para a peça: concluída, em andamento ou não iniciada. */
export function estadoEtapa(peca: Peca, etapa: EtapaPeca): 'done' | 'active' | 'todo' {
  const qtd = qtdEtapa(peca, etapa)
  if (qtd <= 0) return 'todo'
  if (qtd >= peca.quantidadeTotal) return 'done'
  return 'active'
}

/**
 * Uma peça "está" numa etapa quando há WIP > 0 ali (produção) ou quando aquele
 * marco é a frente atual (aprovada/medição).
 */
export function pecaEstaEmEtapa(peca: Peca, etapa: EtapaPeca): boolean {
  if (etapaEhProducao(etapa)) return wipPorEtapa(peca)[etapa] > 0
  return etapaFrente(peca) === etapa
}

/**
 * Total de peças (unidades) numa etapa, somando todas as OPs — estável,
 * independente de filtros. Produção soma o WIP; marcos somam o total das OPs
 * cuja frente é aquele marco. O somatório de todas as etapas = total geral.
 */
export function qtdPecasNaEtapa(pecas: Peca[], etapa: EtapaPeca): number {
  if (etapaEhProducao(etapa)) {
    return pecas.reduce((s, p) => s + wipPorEtapa(p)[etapa], 0)
  }
  return pecas.reduce((s, p) => s + (etapaFrente(p) === etapa ? p.quantidadeTotal : 0), 0)
}

/**
 * Conta quantas referências (Peca distintas) estão presentes em cada etapa —
 * independente da quantidade de unidades. Retorna números pequenos (ex: 2, 4, 3).
 */
export function qtdRefsPorEtapa(pecas: Peca[], etapa: EtapaPeca): number {
  return pecas.filter((p) => pecaEstaEmEtapa(p, etapa)).length
}
