import type {
  Empresa,
  Funcionario,
  Incidente,
  Maquina,
  Operacao,
  Peca,
  ProducaoMap,
} from '../types'
import { HORA_ATUAL_INDEX, TOTAL_JANELAS } from '../lib/status'

// Gerador pseudoaleatório determinístico (mesmos dados a cada carregamento).
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(20260717)
const rnd = (min: number, max: number) => min + rand() * (max - min)

// ---------------------------------------------------------------------------
// Catálogos
// ---------------------------------------------------------------------------

export const OPERACOES: Operacao[] = [
  { id: 'op-manga', nome: 'Pregar manga' },
  { id: 'op-lateral', nome: 'Fechar lateral' },
  { id: 'op-gola', nome: 'Pregar gola' },
  { id: 'op-barra', nome: 'Barra' },
  { id: 'op-pesponto', nome: 'Pesponto' },
  { id: 'op-casear', nome: 'Casear' },
  { id: 'op-botao', nome: 'Pregar botão' },
  { id: 'op-overlock', nome: 'Overlock' },
  { id: 'op-cos', nome: 'Pregar cós' },
  { id: 'op-bolso', nome: 'Pregar bolso' },
  { id: 'op-ziper', nome: 'Pregar zíper' },
  { id: 'op-acabamento', nome: 'Acabamento' },
]

export const PECAS: Peca[] = [
  {
    id: 'pc-camiseta',
    nome: 'Camiseta Básica',
    descricao: 'Malha 100% algodão, gola careca, manga curta.',
    fotoUrl:
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=400&q=60',
    metaHora: 120,
  },
  {
    id: 'pc-jeans',
    nome: 'Calça Jeans',
    descricao: 'Jeans reto, 5 bolsos, lavagem média.',
    fotoUrl:
      'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=400&q=60',
    metaHora: 45,
  },
  {
    id: 'pc-bermuda',
    nome: 'Bermuda Moletom',
    descricao: 'Moletom flanelado, cós com cordão.',
    fotoUrl:
      'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=400&q=60',
    metaHora: 80,
  },
  {
    id: 'pc-vestido',
    nome: 'Vestido Midi',
    descricao: 'Viscose estampada, comprimento midi.',
    fotoUrl:
      'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=400&q=60',
    metaHora: 60,
  },
  {
    id: 'pc-camisa',
    nome: 'Camisa Social',
    descricao: 'Tricoline, punho duplo, colarinho estruturado.',
    fotoUrl:
      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=400&q=60',
    metaHora: 55,
  },
]

export const EMPRESAS: Empresa[] = [
  { id: 'emp-bela', nome: 'Confecção Bela Moda', cidade: 'Cianorte · PR', cor: '#404040' },
  { id: 'emp-saojose', nome: 'Malhas São José', cidade: 'Maringá · PR', cor: '#525252' },
  { id: 'emp-jeansprime', nome: 'Jeans Prime', cidade: 'Toritama · PE', cor: '#262626' },
  { id: 'emp-flor', nome: 'Moda Íntima Flor', cidade: 'Nova Friburgo · RJ', cor: '#737373' },
]

const NOMES = [
  'Maria Aparecida',
  'Ana Paula Souza',
  'Josefa Lima',
  'Rita de Cássia',
  'Fernanda Oliveira',
  'Cláudia Santos',
  'Marta Ferreira',
  'Vera Lúcia',
  'Sandra Regina',
  'Luciana Alves',
  'Patrícia Gomes',
  'Rosângela Dias',
  'Simone Rocha',
  'Adriana Costa',
  'Elaine Cristina',
  'Juliana Martins',
  'Terezinha Ramos',
  'Gilmara Nunes',
  'Cleusa Barbosa',
  'Neusa Cardoso',
  'Rosana Teixeira',
  'Ivone Batista',
  'Débora Correia',
  'Kelly Fernandes',
  'Michele Araújo',
  'Vanessa Pinto',
  'Solange Moreira',
  'Edna Ribeiro',
  'Marlene Freitas',
  'Sônia Carvalho',
  'Cristina Melo',
  'Aline Duarte',
  'Bruna Cavalcante',
  'Camila Azevedo',
  'Daniela Vieira',
  'Eliane Monteiro',
  'Fabiana Lopes',
  'Gabriela Rezende',
  'Helena Farias',
  'Isabel Cunha',
  'Jaqueline Pires',
  'Karina Macedo',
  'Larissa Brito',
  'Márcia Nogueira',
  'Nádia Fonseca',
  'Olívia Sampaio',
  'Priscila Tavares',
  'Quitéria Andrade',
  'Renata Camargo',
  'Sabrina Moura',
  'Tatiane Guimarães',
  'Ubiratã Silva',
  'Valéria Peixoto',
  'Wanessa Prado',
  'Ximena Rios',
  'Yara Bezerra',
  'Zilda Antunes',
  'Antônio Carlos',
  'Benedito Souza',
  'Carlos Eduardo',
]

export const FUNCIONARIOS: Funcionario[] = NOMES.map((nome, i) => ({
  id: `func-${i + 1}`,
  nome,
  matricula: String(1000 + i),
}))

// ---------------------------------------------------------------------------
// Máquinas por empresa (definidas como células: peça + operações + qtd)
// ---------------------------------------------------------------------------

interface CelulaDef {
  pecaId: string
  operacoes: string[]
  repeticoes: number // quantas máquinas por operação (linhas paralelas)
}

const CELULAS: Record<string, CelulaDef[]> = {
  'emp-bela': [
    {
      pecaId: 'pc-camiseta',
      operacoes: ['op-overlock', 'op-gola', 'op-manga', 'op-lateral', 'op-barra', 'op-acabamento'],
      repeticoes: 4,
    },
    {
      pecaId: 'pc-jeans',
      operacoes: ['op-bolso', 'op-ziper', 'op-cos', 'op-lateral', 'op-barra', 'op-pesponto', 'op-botao'],
      repeticoes: 3,
    },
  ],
  'emp-saojose': [
    {
      pecaId: 'pc-bermuda',
      operacoes: ['op-overlock', 'op-cos', 'op-lateral', 'op-bolso', 'op-barra', 'op-acabamento'],
      repeticoes: 3,
    },
  ],
  'emp-jeansprime': [
    {
      pecaId: 'pc-jeans',
      operacoes: ['op-bolso', 'op-ziper', 'op-cos', 'op-lateral', 'op-barra', 'op-pesponto'],
      repeticoes: 2,
    },
    {
      pecaId: 'pc-camisa',
      operacoes: ['op-gola', 'op-manga', 'op-casear', 'op-botao', 'op-barra', 'op-acabamento'],
      repeticoes: 2,
    },
  ],
  'emp-flor': [
    {
      pecaId: 'pc-vestido',
      operacoes: ['op-overlock', 'op-lateral', 'op-ziper', 'op-barra', 'op-acabamento', 'op-gola'],
      repeticoes: 2,
    },
  ],
}

// Fator de desempenho por máquina (uns performam melhor que outros).
function fatorDesempenho(): number {
  const r = rand()
  if (r < 0.12) return rnd(0.7, 0.85) // costumam ficar vermelhos
  if (r < 0.32) return rnd(0.86, 0.96) // ficam em alerta
  return rnd(0.97, 1.12) // no ritmo
}

let maquinaSeq = 0
let funcCursor = 0

function proximaFuncionaria(): string {
  const f = FUNCIONARIOS[funcCursor % FUNCIONARIOS.length]
  funcCursor += 1
  return f.id
}

export const MAQUINAS: Maquina[] = []
export const PRODUCAO: ProducaoMap = {}

interface MetaHoraOp {
  // meta por operação: um pouco acima da meta da peça para dar folga de linha
  [pecaId: string]: number
}
const META_OP: MetaHoraOp = {
  'pc-camiseta': 130,
  'pc-jeans': 50,
  'pc-bermuda': 88,
  'pc-vestido': 66,
  'pc-camisa': 60,
}

for (const empresa of EMPRESAS) {
  const celulas = CELULAS[empresa.id] ?? []
  for (const celula of celulas) {
    for (let rep = 0; rep < celula.repeticoes; rep++) {
      for (const opId of celula.operacoes) {
        maquinaSeq += 1
        const id = `maq-${maquinaSeq}`
        const codigo = `M-${String(maquinaSeq).padStart(2, '0')}`
        const metaHora = META_OP[celula.pecaId] ?? 60

        // Poucas máquinas ficam sem funcionário (para demonstrar o alerta de vínculo).
        const semFuncionario = rand() < 0.05
        const funcionarioId = semFuncionario ? null : proximaFuncionaria()

        const maquina: Maquina = {
          id,
          empresaId: empresa.id,
          codigo,
          operacaoId: opId,
          pecaId: celula.pecaId,
          funcionarioId,
          metaHora,
          ativa: true,
        }
        MAQUINAS.push(maquina)

        // Gera produção por janela até a hora atual.
        const fator = fatorDesempenho()
        const valores: (number | null)[] = new Array(TOTAL_JANELAS).fill(null)
        if (funcionarioId) {
          for (let h = 0; h <= HORA_ATUAL_INDEX; h++) {
            const ruido = rnd(0.85, 1.15)
            valores[h] = Math.max(0, Math.round(metaHora * fator * ruido))
          }
        }
        PRODUCAO[id] = valores
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Incidentes de exemplo
// ---------------------------------------------------------------------------

export const INCIDENTES: Incidente[] = [
  {
    id: 'inc-1',
    maquinaId: MAQUINAS[3]?.id ?? 'maq-4',
    hourIndex: 5,
    tipo: 'agulha',
    descricao: 'Agulha quebrou, troca demorou.',
    minutosParado: 18,
    criadoEm: '14:22',
  },
  {
    id: 'inc-2',
    maquinaId: MAQUINAS[10]?.id ?? 'maq-11',
    hourIndex: 6,
    tipo: 'material',
    descricao: 'Faltou linha na cor.',
    minutosParado: 25,
    criadoEm: '15:10',
  },
  {
    id: 'inc-3',
    maquinaId: MAQUINAS[18]?.id ?? 'maq-19',
    hourIndex: 4,
    tipo: 'manutencao',
    minutosParado: 12,
    criadoEm: '13:40',
  },
]

// Rebaixa a produção das máquinas com incidente na janela afetada.
for (const inc of INCIDENTES) {
  const arr = PRODUCAO[inc.maquinaId]
  if (arr && arr[inc.hourIndex] != null) {
    arr[inc.hourIndex] = Math.round((arr[inc.hourIndex] as number) * 0.55)
  }
}
