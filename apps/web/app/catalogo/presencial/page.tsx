import { CatalogoView } from './view'
import { apiGet } from '@/lib/api/server'

interface Servico {
  id: string
  slug: string
  name: string
  description: string
  category: 'PERFORMANCE' | 'AESTHETIC' | 'CONFIG'
  pts: number
  priceAvulsoCents: number
  motorTypes: string[]
  durationDays: number
  popular: boolean
}

interface Saldo {
  available: number
  reserved: number
  total: number
}

interface CarLite {
  id: string
  brand: string
  model: string
  motorType: string
  isActive: boolean
}

export const metadata = { title: 'Catálogo presencial · TPC Painel' }

export default async function CatalogoPresencialPage() {
  const [servicosRes, saldo, carsRes] = await Promise.all([
    apiGet<{ servicos: Servico[] }>('/servicos', { requireAuth: false }),
    apiGet<Saldo>('/me/saldo').catch(() => ({ available: 0, reserved: 0, total: 0 })),
    apiGet<{ cars: CarLite[] }>('/me/cars').catch(() => ({ cars: [] })),
  ])

  const activeCar = carsRes.cars.find((c) => c.isActive) ?? null

  return <CatalogoView servicos={servicosRes.servicos} saldo={saldo} activeCar={activeCar} />
}
