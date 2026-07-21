// Modelo de domínio do sistema de produtividade em confecção.

export type StatusNivel = 'ok' | 'warn' | 'bad'

export interface Funcionario {
  id: string
  nome: string
  matricula: string
}

export interface Operacao {
  id: string
  nome: string
}

export type EtapaPeca = 'aprovada' | 'medicao' | 'producao' | 'entrega'

export interface EtapaInfo {
  /** Data planejada para início/conclusão da etapa ('YYYY-MM-DD'). */
  planejado: string
  /** Data real de conclusão ('YYYY-MM-DD'). Ausente enquanto a etapa não foi concluída. */
  realizado?: string
}

export interface Peca {
  id: string
  nome: string
  descricao: string
  fotoUrl: string
  /** Meta de peças finalizadas por hora para esta peça/célula. */
  metaHora: number
  /** Etapa atual no fluxo de produção. */
  etapa: EtapaPeca
  /** Datas planejadas e realizadas por etapa. */
  etapas?: Partial<Record<EtapaPeca, EtapaInfo>>
}

export interface Maquina {
  id: string
  empresaId: string
  codigo: string // ex.: "M-01"
  operacaoId: string
  pecaId: string
  funcionarioId: string | null
  /** Meta individual de peças/hora desta operação. */
  metaHora: number
  ativa: boolean
}

export type TipoIncidente =
  | 'agulha'
  | 'manutencao'
  | 'material'
  | 'ajuste'
  | 'troca'
  | 'outro'

export interface Incidente {
  id: string
  maquinaId: string
  hourIndex: number
  tipo: TipoIncidente
  descricao?: string
  minutosParado?: number
  criadoEm: string
}

export interface Empresa {
  id: string
  nome: string
  cidade: string
  cor: string // cor de destaque do card
}

/** Produção por máquina: array com 9 posições (uma por janela de hora). */
export type ProducaoMap = Record<string, (number | null)[]>
