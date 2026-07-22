import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useStore } from '../store'
import { useNav } from '../nav'
import { TopBar } from '../components/TopBar'
import { cx } from '../lib/format'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type TimerState = {
  elapsed: number       // ms acumulado
  running: boolean
  startedAt: number | null  // timestamp quando o cronômetro iniciou (já descontando elapsed anterior)
}

type Registro = {
  id: string
  funcionarioId: string
  operacaoId: string
  tempos: number[]  // ms
  media: number     // ms
  tPadrao: number   // ms  — placeholder: media * 1.3
  pcHora: number
  criadoEm: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtTempo(ms: number): string {
  if (ms <= 0) return '0:00'
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

/** Cálculos placeholder — exatos serão definidos futuramente */
function calcularMetricas(tempoMs: number[]): { media: number; tPadrao: number; pcHora: number } {
  const media = tempoMs.reduce((s, t) => s + t, 0) / tempoMs.length
  const tPadrao = media * 1.3       // 30 % de folga (placeholder)
  const pcHora = Math.round(3_600_000 / tPadrao)
  return { media, tPadrao, pcHora }
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function CronometragemScreen({ pecaId }: { pecaId: string }) {
  const { pecas, operacoes, funcionarios } = useStore()
  useNav() // registra o contexto de navegação (back é tratado pela TopBar)

  const peca = pecas.find((p) => p.id === pecaId)!

  const [funcionarioId, setFuncionarioId] = useState(funcionarios[0]?.id ?? '')
  const [operacaoId, setOperacaoId] = useState(operacoes[0]?.id ?? '')

  const [timers, setTimers] = useState<TimerState[]>(() =>
    Array.from({ length: 3 }, () => ({ elapsed: 0, running: false, startedAt: null })),
  )

  const [resultado, setResultado] = useState<{
    media: number
    tPadrao: number
    pcHora: number
  } | null>(null)

  const [registros, setRegistros] = useState<Registro[]>([])

  // Atualiza o display dos cronômetros em execução a cada 50 ms
  useEffect(() => {
    const id = setInterval(() => {
      setTimers((prev) =>
        prev.map((t) =>
          t.running && t.startedAt !== null
            ? { ...t, elapsed: Date.now() - t.startedAt }
            : t,
        ),
      )
    }, 50)
    return () => clearInterval(id)
  }, [])

  const toggleTimer = (i: number) => {
    const now = Date.now()
    setTimers((prev) =>
      prev.map((t, idx) => {
        if (idx !== i) return t
        if (t.running) {
          return { ...t, running: false, elapsed: now - (t.startedAt ?? now), startedAt: null }
        }
        return { ...t, running: true, startedAt: now - t.elapsed }
      }),
    )
    setResultado(null)
  }

  const resetTimer = (i: number) => {
    setTimers((prev) =>
      prev.map((t, idx) =>
        idx !== i ? t : { elapsed: 0, running: false, startedAt: null },
      ),
    )
    setResultado(null)
  }

  const podeCalcular = timers.every((t) => !t.running && t.elapsed > 0)

  const calcular = () => {
    if (!podeCalcular) return
    setResultado(calcularMetricas(timers.map((t) => t.elapsed)))
  }

  const registrar = () => {
    if (!resultado) return
    const tempos = timers.map((t) => t.elapsed)
    setRegistros((prev) => [
      {
        id: `r-${Date.now()}`,
        funcionarioId,
        operacaoId,
        tempos,
        ...resultado,
        criadoEm: new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
      ...prev,
    ])
    // Reinicia para próxima medição
    setTimers(Array.from({ length: 3 }, () => ({ elapsed: 0, running: false, startedAt: null })))
    setResultado(null)
  }

  return (
    <div className="flex h-full flex-col bg-brand-100">
      <TopBar title="Estudo de Tempos" subtitle={peca.nome} />

      <div className="thin-scroll flex-1 overflow-y-auto">
        {/* ---- Seletores ------------------------------------------------- */}
        <section className="px-4 pt-4">
          <div className="rounded-2xl border border-brand-100/60 bg-white shadow-card">
            <div className="px-4 pb-4 pt-4 space-y-3">
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-brand-400">
                  Nome da Costureira
                </label>
                <select
                  value={funcionarioId}
                  onChange={(e) => setFuncionarioId(e.target.value)}
                  className="w-full rounded-xl border border-brand-200 bg-brand-50 px-3 py-3 text-sm font-semibold text-brand-900 outline-none focus:border-brand-500 focus:bg-white transition"
                >
                  {funcionarios.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-brand-400">
                  Operação
                </label>
                <select
                  value={operacaoId}
                  onChange={(e) => setOperacaoId(e.target.value)}
                  className="w-full rounded-xl border border-brand-200 bg-brand-50 px-3 py-3 text-sm font-semibold text-brand-900 outline-none focus:border-brand-500 focus:bg-white transition"
                >
                  {operacoes.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* ---- Cronômetros ----------------------------------------------- */}
        <section className="px-4 pt-3">
          <div className="rounded-2xl border border-brand-100/60 bg-white p-4 shadow-card">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-brand-400">
              Medições
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              {timers.map((t, i) => (
                <div
                  key={i}
                  className={cx(
                    'flex flex-col items-center gap-3 rounded-2xl border-2 px-2 py-4 transition',
                    t.running
                      ? 'border-red-200 bg-red-50'
                      : t.elapsed > 0
                        ? 'border-brand-200 bg-brand-50'
                        : 'border-brand-100 bg-brand-50/50',
                  )}
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest text-brand-400">
                    TEMPO {i + 1}
                  </p>
                  <p
                    className={cx(
                      'text-2xl font-black tabular-nums leading-none tracking-tight',
                      t.running
                        ? 'text-red-600'
                        : t.elapsed > 0
                          ? 'text-brand-950'
                          : 'text-brand-300',
                    )}
                  >
                    {fmtTempo(t.elapsed)}
                  </p>
                  <button
                    type="button"
                    onClick={() => toggleTimer(i)}
                    className={cx(
                      'w-full rounded-xl py-2.5 text-xs font-bold text-white shadow-card transition active:scale-95',
                      t.running ? 'bg-red-500' : 'bg-brand-900 hover:bg-brand-800',
                    )}
                  >
                    {t.running ? '■ PARAR' : '▶ INICIAR'}
                  </button>
                  <button
                    type="button"
                    onClick={() => resetTimer(i)}
                    className="text-[11px] font-semibold uppercase tracking-wide text-brand-300 transition hover:text-brand-500 active:text-brand-600"
                  >
                    Zerar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---- Calcular -------------------------------------------------- */}
        <section className="px-4 pt-3">
          <button
            type="button"
            onClick={calcular}
            disabled={!podeCalcular}
            className={cx(
              'w-full rounded-2xl py-4 text-sm font-black uppercase tracking-widest transition active:scale-[0.98]',
              podeCalcular
                ? 'bg-red-500 text-white shadow-lift hover:bg-red-600'
                : 'cursor-not-allowed bg-white text-brand-300 shadow-card',
            )}
          >
            Calcular Meta
          </button>
          {!podeCalcular && (
            <p className="mt-2 text-center text-[11px] font-medium text-brand-400">
              {timers.some((t) => t.running)
                ? 'Pare todos os cronômetros para calcular.'
                : 'Colete os 3 tempos para calcular.'}
            </p>
          )}
        </section>

        {/* ---- Resultado ------------------------------------------------- */}
        {resultado && (
          <section className="px-4 pt-3">
            <div className="overflow-hidden rounded-2xl bg-brand-900 shadow-lift">
              <div className="grid grid-cols-3 divide-x divide-white/10 px-5 py-5">
                <div className="pr-4 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/40">
                    Média
                  </p>
                  <p className="mt-2 text-2xl font-black tabular-nums tracking-tight text-white">
                    {fmtTempo(resultado.media)}
                  </p>
                </div>
                <div className="px-4 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/40">
                    T. Padrão
                  </p>
                  <p className="mt-2 text-2xl font-black tabular-nums tracking-tight text-white">
                    {fmtTempo(resultado.tPadrao)}
                  </p>
                </div>
                <div className="pl-4 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-red-400">
                    Pç / Hora
                  </p>
                  <p className="mt-2 text-3xl font-black tabular-nums leading-none text-red-400">
                    {resultado.pcHora.toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={registrar}
              className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-2xl border border-brand-200 bg-white py-3.5 text-sm font-bold text-brand-700 shadow-card transition hover:border-brand-400 hover:shadow-lift active:scale-[0.98]"
            >
              <Plus size={15} />
              Registrar na lista
            </button>
          </section>
        )}

        {/* ---- Lista de registros ---------------------------------------- */}
        {registros.length > 0 && (
          <section className="px-4 pb-10 pt-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-brand-400">
              Histórico desta sessão
            </p>
            <div className="flex flex-col gap-2.5">
              {registros.map((r) => {
                const fn = funcionarios.find((f) => f.id === r.funcionarioId)
                const op = operacoes.find((o) => o.id === r.operacaoId)
                return (
                  <div
                    key={r.id}
                    className="overflow-hidden rounded-2xl border border-brand-100/60 bg-white shadow-card"
                  >
                    {/* Header do card */}
                    <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-brand-950">
                          {op?.nome ?? '–'}
                        </p>
                        <p className="text-xs text-brand-400">
                          {fn?.nome ?? '–'} · {r.criadoEm}
                        </p>
                      </div>
                      <div className="shrink-0 rounded-xl bg-red-50 px-3 py-2 text-center">
                        <p className="text-xl font-black leading-none text-red-600">
                          {r.pcHora.toLocaleString('pt-BR')}
                        </p>
                        <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-red-400">
                          pç/hora
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setRegistros((prev) => prev.filter((x) => x.id !== r.id))
                        }
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-brand-300 transition hover:bg-red-50 hover:text-red-500 active:scale-90"
                        aria-label="Excluir registro"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {/* Tempos */}
                    <div className="flex items-center gap-2 border-t border-brand-100 px-4 py-3">
                      {r.tempos.map((ms, i) => (
                        <div
                          key={i}
                          className="flex flex-1 flex-col items-center gap-0.5 rounded-xl bg-brand-50 py-2"
                        >
                          <span className="text-[9px] font-bold uppercase tracking-wide text-brand-400">
                            T{i + 1}
                          </span>
                          <span className="text-xs font-black tabular-nums text-brand-800">{fmtTempo(ms)}</span>
                        </div>
                      ))}
                      <div className="flex flex-1 flex-col items-center gap-0.5 rounded-xl bg-brand-200/40 py-2">
                        <span className="text-[9px] font-bold uppercase tracking-wide text-brand-500">
                          Média
                        </span>
                        <span className="text-xs font-black tabular-nums text-brand-900">{fmtTempo(r.media)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
