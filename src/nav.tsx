import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

export type Screen =
  | { name: 'empresas' }
  | { name: 'dashboard'; empresaId: string }
  | { name: 'mapa'; empresaId: string; hourIndex: number; pecaId?: string }
  | { name: 'registro'; empresaId: string; hourIndex: number; pecaId?: string; maquinaId?: string }
  | { name: 'config'; empresaId: string }
  | { name: 'alertas'; empresaId?: string }

interface NavValue {
  current: Screen
  go: (s: Screen) => void
  replace: (s: Screen) => void
  back: () => void
  canBack: boolean
}

const NavContext = createContext<NavValue | null>(null)

export function NavProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Screen[]>([{ name: 'empresas' }])

  const go = useCallback((s: Screen) => setStack((prev) => [...prev, s]), [])
  const replace = useCallback(
    (s: Screen) => setStack((prev) => [...prev.slice(0, -1), s]),
    [],
  )
  const back = useCallback(
    () => setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev)),
    [],
  )

  const value = useMemo<NavValue>(
    () => ({
      current: stack[stack.length - 1],
      go,
      replace,
      back,
      canBack: stack.length > 1,
    }),
    [stack, go, replace, back],
  )

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNav() {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error('useNav deve ser usado dentro de NavProvider')
  return ctx
}
