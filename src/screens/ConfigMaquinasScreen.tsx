import { useMemo, useState } from 'react'
import {
  CheckSquare,
  Layers,
  Pencil,
  Plus,
  Power,
  Search,
  Square,
  Trash2,
  UserCog,
} from 'lucide-react'
import { useStore } from '../store'
import { useDevice } from '../components/DeviceFrame'
import { TopBar } from '../components/TopBar'
import { BottomSheet } from '../components/BottomSheet'
import { TrocaFuncionarioSheet } from './TrocaFuncionarioSheet'
import { useToast } from '../components/Toast'
import { Chip } from '../components/ui'
import { cx } from '../lib/format'
import type { Maquina } from '../types'

export function ConfigMaquinasScreen({ empresaId }: { empresaId: string }) {
  const { empresas, maquinasDaEmpresa, operacao, peca, funcionarioNome } = useStore()
  const { wide } = useDevice()
  const toast = useToast()
  const empresa = empresas.find((e) => e.id === empresaId)!
  const maquinas = maquinasDaEmpresa(empresaId)
  const pecas = useMemo(
    () => Array.from(new Set(maquinas.map((m) => m.pecaId))).map((id) => peca(id)!),
    [maquinas, peca],
  )

  const [busca, setBusca] = useState('')
  const [filtroPeca, setFiltroPeca] = useState<string | null>(null)
  const [filtroPendencia, setFiltroPendencia] = useState<'semFunc' | 'inativa' | null>(null)
  const [selMode, setSelMode] = useState(false)
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [editar, setEditar] = useState<Maquina | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [troca, setTroca] = useState<Maquina | null>(null)

  const filtradas = maquinas.filter((m) => {
    const q = busca.trim().toLowerCase()
    if (q && !m.codigo.toLowerCase().includes(q) && !funcionarioNome(m.funcionarioId).toLowerCase().includes(q))
      return false
    if (filtroPeca && m.pecaId !== filtroPeca) return false
    if (filtroPendencia === 'semFunc' && m.funcionarioId) return false
    if (filtroPendencia === 'inativa' && m.ativa) return false
    return true
  })

  const semFuncCount = maquinas.filter((m) => !m.funcionarioId).length
  const inativaCount = maquinas.filter((m) => !m.ativa).length

  const toggleSel = (id: string) =>
    setSelecionados((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const sairSelecao = () => {
    setSelMode(false)
    setSelecionados(new Set())
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar
        title="Máquinas & células"
        subtitle={`${empresa.nome} · ${maquinas.length} máquinas`}
        color={empresa.cor}
        right={
          <button
            type="button"
            onClick={() => (selMode ? sairSelecao() : setSelMode(true))}
            className="rounded-xl px-3 py-2 text-sm font-bold text-brand-600 transition hover:bg-brand-100 active:scale-95"
          >
            {selMode ? 'Concluir' : 'Selecionar'}
          </button>
        }
      />

      {/* Busca + filtros */}
      <div className="relative z-10 border-b border-brand-100 bg-white px-3 py-2.5">
        <div className="relative mb-2">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por código ou funcionário…"
            className="w-full rounded-xl border-2 border-brand-100 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-400"
          />
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {pecas.length > 1 && (
            <>
              <Chip active={filtroPeca === null} onClick={() => setFiltroPeca(null)}>
                Todas
              </Chip>
              {pecas.map((p) => (
                <Chip key={p.id} active={filtroPeca === p.id} onClick={() => setFiltroPeca(p.id)}>
                  {p.nome}
                </Chip>
              ))}
            </>
          )}
          {semFuncCount > 0 && (
            <Chip
              active={filtroPendencia === 'semFunc'}
              onClick={() => setFiltroPendencia((v) => (v === 'semFunc' ? null : 'semFunc'))}
            >
              Sem funcionário ({semFuncCount})
            </Chip>
          )}
          {inativaCount > 0 && (
            <Chip
              active={filtroPendencia === 'inativa'}
              onClick={() => setFiltroPendencia((v) => (v === 'inativa' ? null : 'inativa'))}
            >
              Inativas ({inativaCount})
            </Chip>
          )}
        </div>
      </div>

      {/* Lista */}
      <div className="thin-scroll flex-1 overflow-y-auto px-3 pb-24 pt-3">
        <div className={cx('grid gap-2', wide ? 'grid-cols-2' : 'grid-cols-1')}>
          {filtradas.map((m) => {
            const sel = selecionados.has(m.id)
            const semFunc = !m.funcionarioId
            return (
              <div
                key={m.id}
                className={cx(
                  'flex items-center gap-3 rounded-xl border-2 bg-white p-3 transition',
                  sel ? 'border-brand-500 bg-brand-50' : 'border-brand-100',
                  !m.ativa && 'opacity-60',
                )}
              >
                {selMode && (
                  <button type="button" onClick={() => toggleSel(m.id)} aria-label="Selecionar" className="shrink-0 text-brand-600">
                    {sel ? <CheckSquare size={22} /> : <Square size={22} className="text-brand-300" />}
                  </button>
                )}
                <div
                  className={cx(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-black text-white',
                  )}
                  style={{ background: empresa.cor }}
                >
                  {m.codigo.replace('M-', '')}
                </div>
                <div className="min-w-0 flex-1" onClick={() => selMode && toggleSel(m.id)}>
                  <p className="text-sm font-bold text-brand-950">
                    {m.codigo} · <span className="font-medium text-brand-600">{operacao(m.operacaoId)?.nome}</span>
                  </p>
                  <p className="truncate text-xs text-brand-400">
                    {peca(m.pecaId)?.nome} · meta {m.metaHora}/h
                  </p>
                  <p className={cx('truncate text-xs font-medium', semFunc ? 'text-red-500' : 'text-brand-500')}>
                    {semFunc ? '⚠ Sem funcionário' : funcionarioNome(m.funcionarioId)}
                  </p>
                </div>
                {!selMode && (
                  <div className="flex shrink-0 items-center">
                    <IconBtn label="Trocar funcionário" onClick={() => setTroca(m)}>
                      <UserCog size={17} />
                    </IconBtn>
                    <IconBtn label="Editar" onClick={() => setEditar(m)}>
                      <Pencil size={17} />
                    </IconBtn>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {filtradas.length === 0 && (
          <p className="py-10 text-center text-sm text-brand-400">Nenhuma máquina encontrada.</p>
        )}
      </div>

      {/* Barra de ação em massa OU botão adicionar */}
      {selMode && selecionados.size > 0 ? (
        <div className="absolute inset-x-0 bottom-0 z-20 flex items-center gap-2 border-t border-brand-100 bg-white/95 p-3 backdrop-blur">
          <span className="text-sm font-bold text-brand-700">{selecionados.size} selecionadas</span>
          <button
            type="button"
            onClick={() => setBulkOpen(true)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white active:scale-95"
          >
            <Layers size={16} />
            Editar em massa
          </button>
        </div>
      ) : (
        !selMode && (
          <div className="absolute inset-x-0 bottom-0 z-20 border-t border-brand-100 bg-white/95 p-3 backdrop-blur">
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-3.5 text-base font-bold text-white shadow-lift active:scale-95"
            >
              <Plus size={20} />
              Adicionar máquina ao dia
            </button>
          </div>
        )
      )}

      {/* Sheets */}
      <MaquinaFormSheet
        empresaId={empresaId}
        maquina={editar}
        open={editar !== null || addOpen}
        modo={addOpen ? 'novo' : 'editar'}
        onClose={() => {
          setEditar(null)
          setAddOpen(false)
        }}
      />
      <BulkEditSheet
        empresaId={empresaId}
        ids={Array.from(selecionados)}
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onDone={() => {
          setBulkOpen(false)
          sairSelecao()
          toast('Máquinas atualizadas')
        }}
      />
      <TrocaFuncionarioSheet maquina={troca} open={troca !== null} onClose={() => setTroca(null)} />
    </div>
  )
}

function IconBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-brand-500 hover:bg-brand-50 active:scale-95"
    >
      {children}
    </button>
  )
}

// --- Formulário de máquina (novo/editar) --------------------------------------

function MaquinaFormSheet({
  empresaId,
  maquina,
  open,
  modo,
  onClose,
}: {
  empresaId: string
  maquina: Maquina | null
  open: boolean
  modo: 'novo' | 'editar'
  onClose: () => void
}) {
  const { operacoes, pecas, funcionarios, updateMaquina, addMaquina, removeMaquina } = useStore()
  const toast = useToast()

  const [pecaId, setPecaId] = useState(maquina?.pecaId ?? pecas[0]?.id ?? '')
  const [operacaoId, setOperacaoId] = useState(maquina?.operacaoId ?? operacoes[0]?.id ?? '')
  const [funcionarioId, setFuncionarioId] = useState<string>(maquina?.funcionarioId ?? '')
  const [metaHora, setMetaHora] = useState(String(maquina?.metaHora ?? 60))
  const [ativa, setAtiva] = useState(maquina?.ativa ?? true)

  // Reseta o formulário ao abrir com outra máquina.
  const [ultimoId, setUltimoId] = useState<string | null>(null)
  const keyId = maquina?.id ?? '__novo__'
  if (open && keyId !== ultimoId) {
    setUltimoId(keyId)
    setPecaId(maquina?.pecaId ?? pecas[0]?.id ?? '')
    setOperacaoId(maquina?.operacaoId ?? operacoes[0]?.id ?? '')
    setFuncionarioId(maquina?.funcionarioId ?? '')
    setMetaHora(String(maquina?.metaHora ?? 60))
    setAtiva(maquina?.ativa ?? true)
  }

  const salvar = () => {
    const dados = {
      empresaId,
      pecaId,
      operacaoId,
      funcionarioId: funcionarioId || null,
      metaHora: Number(metaHora) || 0,
      ativa,
    }
    if (modo === 'novo') {
      addMaquina(dados)
      toast('Máquina adicionada')
    } else if (maquina) {
      updateMaquina(maquina.id, dados)
      toast(`${maquina.codigo} atualizada`)
    }
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={modo === 'novo' ? 'Nova máquina' : `Editar ${maquina?.codigo ?? ''}`}>
      <Campo label="Peça / célula">
        <Select value={pecaId} onChange={setPecaId} options={pecas.map((p) => ({ value: p.id, label: p.nome }))} />
      </Campo>
      <Campo label="Operação">
        <Select value={operacaoId} onChange={setOperacaoId} options={operacoes.map((o) => ({ value: o.id, label: o.nome }))} />
      </Campo>
      <Campo label="Funcionário">
        <Select
          value={funcionarioId}
          onChange={setFuncionarioId}
          options={[{ value: '', label: '— Sem funcionário —' }, ...funcionarios.map((f) => ({ value: f.id, label: f.nome }))]}
        />
      </Campo>
      <Campo label="Meta por hora">
        <input
          inputMode="numeric"
          value={metaHora}
          onChange={(e) => setMetaHora(e.target.value.replace(/\D/g, '').slice(0, 4))}
          className="w-full rounded-xl border-2 border-brand-100 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
        />
      </Campo>

      <button
        type="button"
        onClick={() => setAtiva((a) => !a)}
        className={cx(
          'mb-4 flex w-full items-center justify-between rounded-xl border-2 px-3 py-3 text-sm font-semibold',
          ativa ? 'border-green-200 bg-green-50 text-green-700' : 'border-brand-100 bg-white text-brand-500',
        )}
      >
        <span className="flex items-center gap-2">
          <Power size={17} />
          {ativa ? 'Máquina ativa no dia' : 'Máquina inativa'}
        </span>
        <span className={cx('h-6 w-11 rounded-full p-0.5 transition', ativa ? 'bg-green-500' : 'bg-brand-200')}>
          <span className={cx('block h-5 w-5 rounded-full bg-white transition', ativa && 'translate-x-5')} />
        </span>
      </button>

      <div className="flex gap-2">
        {modo === 'editar' && maquina && (
          <button
            type="button"
            onClick={() => {
              removeMaquina(maquina.id)
              toast(`${maquina.codigo} removida`)
              onClose()
            }}
            className="inline-flex items-center gap-1.5 rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3.5 text-sm font-bold text-red-600 active:scale-95"
          >
            <Trash2 size={18} />
            Remover
          </button>
        )}
        <button
          type="button"
          onClick={salvar}
          className="flex flex-1 items-center justify-center rounded-2xl bg-brand-600 py-3.5 text-base font-bold text-white shadow-lift active:scale-95"
        >
          Salvar
        </button>
      </div>
    </BottomSheet>
  )
}

// --- Edição em massa ----------------------------------------------------------

function BulkEditSheet({
  empresaId,
  ids,
  open,
  onClose,
  onDone,
}: {
  empresaId: string
  ids: string[]
  open: boolean
  onClose: () => void
  onDone: () => void
}) {
  const { operacoes, pecas, funcionarios, bulkUpdateMaquinas } = useStore()
  void empresaId
  const [aplicarPeca, setAplicarPeca] = useState(false)
  const [aplicarOp, setAplicarOp] = useState(false)
  const [aplicarMeta, setAplicarMeta] = useState(false)
  const [aplicarFunc, setAplicarFunc] = useState(false)
  const [pecaId, setPecaId] = useState(pecas[0]?.id ?? '')
  const [operacaoId, setOperacaoId] = useState(operacoes[0]?.id ?? '')
  const [metaHora, setMetaHora] = useState('60')
  const [funcionarioId, setFuncionarioId] = useState('')

  const aplicar = () => {
    const patch: Record<string, unknown> = {}
    if (aplicarPeca) patch.pecaId = pecaId
    if (aplicarOp) patch.operacaoId = operacaoId
    if (aplicarMeta) patch.metaHora = Number(metaHora) || 0
    if (aplicarFunc) patch.funcionarioId = funcionarioId || null
    if (Object.keys(patch).length > 0) bulkUpdateMaquinas(ids, patch)
    onDone()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={`Editar ${ids.length} máquinas`}>
      <p className="mb-3 text-sm text-brand-500">
        Marque os campos que deseja aplicar a todas as máquinas selecionadas.
      </p>

      <ToggleCampo ativo={aplicarPeca} onToggle={() => setAplicarPeca((v) => !v)} label="Peça / célula">
        <Select value={pecaId} onChange={setPecaId} options={pecas.map((p) => ({ value: p.id, label: p.nome }))} />
      </ToggleCampo>
      <ToggleCampo ativo={aplicarOp} onToggle={() => setAplicarOp((v) => !v)} label="Operação">
        <Select value={operacaoId} onChange={setOperacaoId} options={operacoes.map((o) => ({ value: o.id, label: o.nome }))} />
      </ToggleCampo>
      <ToggleCampo ativo={aplicarMeta} onToggle={() => setAplicarMeta((v) => !v)} label="Meta por hora">
        <input
          inputMode="numeric"
          value={metaHora}
          onChange={(e) => setMetaHora(e.target.value.replace(/\D/g, '').slice(0, 4))}
          className="w-full rounded-xl border-2 border-brand-100 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
        />
      </ToggleCampo>
      <ToggleCampo ativo={aplicarFunc} onToggle={() => setAplicarFunc((v) => !v)} label="Funcionário">
        <Select
          value={funcionarioId}
          onChange={setFuncionarioId}
          options={[{ value: '', label: '— Sem funcionário —' }, ...funcionarios.map((f) => ({ value: f.id, label: f.nome }))]}
        />
      </ToggleCampo>

      <button
        type="button"
        onClick={aplicar}
        disabled={!aplicarPeca && !aplicarOp && !aplicarMeta && !aplicarFunc}
        className="mt-2 w-full rounded-2xl bg-brand-600 py-3.5 text-base font-bold text-white shadow-lift active:scale-95 disabled:opacity-40"
      >
        Aplicar às {ids.length} máquinas
      </button>
    </BottomSheet>
  )
}

// --- Auxiliares de formulário -------------------------------------------------

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-sm font-semibold text-brand-900">{label}</span>
      {children}
    </label>
  )
}

function ToggleCampo({
  ativo,
  onToggle,
  label,
  children,
}: {
  ativo: boolean
  onToggle: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <div className={cx('mb-3 rounded-xl border-2 p-3', ativo ? 'border-brand-400 bg-brand-50/50' : 'border-brand-100')}>
      <button type="button" onClick={onToggle} className="mb-2 flex w-full items-center gap-2 text-sm font-semibold text-brand-900">
        {ativo ? <CheckSquare size={18} className="text-brand-600" /> : <Square size={18} className="text-brand-300" />}
        {label}
      </button>
      {ativo && children}
    </div>
  )
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border-2 border-brand-100 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-400"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
