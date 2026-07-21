import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Device = 'mobile' | 'tablet' | 'desktop'

interface DeviceCtx {
  device: Device
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  /** true para tablet e desktop (largura confortável). */
  wide: boolean
}

const DeviceContext = createContext<DeviceCtx>({
  device: 'mobile',
  isMobile: true,
  isTablet: false,
  isDesktop: false,
  wide: false,
})

// eslint-disable-next-line react-refresh/only-export-components
export function useDevice() {
  return useContext(DeviceContext)
}

function deviceFromWidth(w: number): Device {
  if (w >= 1024) return 'desktop'
  if (w >= 640) return 'tablet'
  return 'mobile'
}

export function DeviceFrame({ children }: { children: ReactNode }) {
  const [device, setDevice] = useState<Device>(() =>
    typeof window === 'undefined' ? 'mobile' : deviceFromWidth(window.innerWidth),
  )

  useEffect(() => {
    const onResize = () => setDevice(deviceFromWidth(window.innerWidth))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const ctx: DeviceCtx = {
    device,
    isMobile: device === 'mobile',
    isTablet: device === 'tablet',
    isDesktop: device === 'desktop',
    wide: device !== 'mobile',
  }

  return (
    <DeviceContext.Provider value={ctx}>
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-brand-100">
        {children}
      </div>
    </DeviceContext.Provider>
  )
}
