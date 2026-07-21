import type { StatusNivel } from '../types'

/** Janelas de hora do expediente (fechamento ao final de cada hora). */
export const HORAS = ['08h', '09h', '10h', '11h', '13h', '14h', '15h', '16h', '17h']

/** Hora de início (real) de cada janela, para cálculo dinâmico. */
const HORA_INICIO = [8, 9, 10, 11, 13, 14, 15, 16, 17]

/** Índice fixo usado apenas para geração de mock (16h fechado). */
export const HORA_ATUAL_INDEX = 7

/**
 * Retorna o índice da última janela **fechada** com base na hora real do sistema.
 * Ex.: 11h → index 2 (10h é o último fechamento concluído).
 * Retorna -1 antes do expediente (< 09h).
 */
export function getHoraAtualIndex(): number {
  const h = new Date().getHours()
  let last = -1
  for (let i = 0; i < HORA_INICIO.length; i++) {
    if (h > HORA_INICIO[i]) last = i
    else break
  }
  return last
}

export const TOTAL_JANELAS = HORAS.length

/**
 * Converte uma razão realizado/meta em nível de status.
 * >= 1.0 atingiu a meta (verde) | >= 0.85 alerta (amarelo) | abaixo (vermelho)
 */
export function statusPorRazao(razao: number): StatusNivel {
  if (razao >= 1) return 'ok'
  if (razao >= 0.85) return 'warn'
  return 'bad'
}

/** Status de uma janela isolada (máquina em uma hora). */
export function statusJanela(realizado: number | null, meta: number): StatusNivel | null {
  if (realizado === null || realizado === undefined) return null
  if (meta <= 0) return 'ok'
  return statusPorRazao(realizado / meta)
}

/**
 * Status acumulado do dia: compara o total realizado com a meta acumulada
 * (meta por hora × janelas já fechadas). Uma hora fraca pode ser compensada.
 */
export function statusAcumulado(
  valores: (number | null)[],
  metaHora: number,
  ateIndex: number,
): { nivel: StatusNivel; realizado: number; meta: number; razao: number } {
  let realizado = 0
  let janelas = 0
  for (let i = 0; i <= ateIndex; i++) {
    const v = valores[i]
    if (v !== null && v !== undefined) {
      realizado += v
      janelas += 1
    }
  }
  const meta = metaHora * Math.max(janelas, 0)
  const razao = meta > 0 ? realizado / meta : 1
  return { nivel: statusPorRazao(razao), realizado, meta, razao }
}

export interface StatusTokens {
  texto: string
  cor: string
  corTexto: string
  bg: string
  borda: string
  chip: string
  rotulo: string
}

/** Tokens visuais (Tailwind) por nível de status. */
export const STATUS_TOKENS: Record<StatusNivel, StatusTokens> = {
  ok: {
    texto: 'No ritmo',
    cor: 'bg-ok',
    corTexto: 'text-ok',
    bg: 'bg-green-50',
    borda: 'border-green-200',
    chip: 'bg-green-100 text-green-800',
    rotulo: 'Verde',
  },
  warn: {
    texto: 'Alerta',
    cor: 'bg-warn',
    corTexto: 'text-warn',
    bg: 'bg-amber-50',
    borda: 'border-amber-200',
    chip: 'bg-amber-100 text-amber-800',
    rotulo: 'Amarelo',
  },
  bad: {
    texto: 'Abaixo',
    cor: 'bg-bad',
    corTexto: 'text-bad',
    bg: 'bg-red-50',
    borda: 'border-red-200',
    chip: 'bg-red-100 text-red-800',
    rotulo: 'Vermelho',
  },
}

export function pct(razao: number): number {
  return Math.round(razao * 100)
}
