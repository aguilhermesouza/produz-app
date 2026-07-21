import { DeviceFrame } from './components/DeviceFrame'
import { ToastProvider } from './components/Toast'
import { StoreProvider } from './store'
import { NavProvider, useNav } from './nav'
import { EmpresasScreen } from './screens/EmpresasScreen'
import { DashboardScreen } from './screens/DashboardScreen'
import { MapaHorarioScreen } from './screens/MapaHorarioScreen'
import { RegistroScreen } from './screens/RegistroScreen'
import { ConfigMaquinasScreen } from './screens/ConfigMaquinasScreen'
import { AlertasScreen } from './screens/AlertasScreen'
import { PecaDetalheScreen } from './screens/PecaDetalheScreen'

function Router() {
  const { current } = useNav()
  switch (current.name) {
    case 'empresas':
      return <EmpresasScreen />
    case 'dashboard':
      return <DashboardScreen empresaId={current.empresaId} />
    case 'mapa':
      return (
        <MapaHorarioScreen
          empresaId={current.empresaId}
          hourIndex={current.hourIndex}
          pecaId={current.pecaId}
        />
      )
    case 'registro':
      return (
        <RegistroScreen
          empresaId={current.empresaId}
          hourIndex={current.hourIndex}
          pecaId={current.pecaId}
          maquinaId={current.maquinaId}
        />
      )
    case 'config':
      return <ConfigMaquinasScreen empresaId={current.empresaId} />
    case 'alertas':
      return <AlertasScreen empresaId={current.empresaId} />
    case 'peca':
      return <PecaDetalheScreen pecaId={current.pecaId} />
  }
}

export default function App() {
  return (
    <StoreProvider>
      <NavProvider>
        <DeviceFrame>
          <ToastProvider>
            <Router />
          </ToastProvider>
        </DeviceFrame>
      </NavProvider>
    </StoreProvider>
  )
}
