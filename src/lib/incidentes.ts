import { AlertTriangle, Boxes, PackageX, Settings, UserCog, Wrench } from 'lucide-react'
import type { TipoIncidente } from '../types'

export const TIPOS_INCIDENTE: {
  id: TipoIncidente
  label: string
  icon: typeof Wrench
}[] = [
  { id: 'agulha', label: 'Agulha quebrada', icon: AlertTriangle },
  { id: 'manutencao', label: 'Manutenção', icon: Wrench },
  { id: 'material', label: 'Falta de material', icon: PackageX },
  { id: 'ajuste', label: 'Ajuste de máquina', icon: Settings },
  { id: 'troca', label: 'Troca de funcionário', icon: UserCog },
  { id: 'outro', label: 'Outro', icon: Boxes },
]

export function rotuloIncidente(tipo: TipoIncidente): string {
  return TIPOS_INCIDENTE.find((t) => t.id === tipo)?.label ?? 'Incidente'
}
