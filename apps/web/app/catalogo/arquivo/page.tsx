import { apiGet } from '@/lib/api/server'

import { CatalogoArquivoView } from './view'

interface RemapService {
  id: string
  slug: string
  name: string
  description: string
  category: 'Performance' | 'Estética' | 'Diagnóstico' | 'Configuração' | 'Custom'
  pts: number
  priceAvulsoCents: number
  supports: string[]
  isCustom: boolean
  sortOrder: number
}

interface Saldo {
  available: number
  reserved: number
  total: number
}

export const metadata = { title: 'Catálogo por arquivo · TPC Painel' }

export default async function CatalogoArquivoPage() {
  const [servicesRes, saldo] = await Promise.all([
    apiGet<{ services: RemapService[] }>('/remap-services', {
      requireAuth: false,
    }).catch(() => ({ services: [] as RemapService[] })),
    apiGet<Saldo>('/me/saldo').catch(() => ({ available: 0, reserved: 0, total: 0 })),
  ])

  return <CatalogoArquivoView services={servicesRes.services} saldo={saldo} />
}
