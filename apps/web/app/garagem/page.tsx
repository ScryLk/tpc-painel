import { GaragemView } from './view'
import { apiGet } from '@/lib/api/server'

interface ActiveOrder {
  type: 'remap' | 'presencial'
  id: string
  label: string
}

export interface CarItem {
  id: string
  brand: string
  model: string
  year: number
  motorType: string
  plate: string
  color: string | null
  isActive: boolean
  mapState: 'STOCK' | 'STAGE1' | 'STAGE2' | 'STAGE3'
  createdAt: string
  activeOrder: ActiveOrder | null
  extraOrders: number
  warranty: { pct: number; text: string } | null
}

interface Saldo {
  available: number
  reserved: number
  total: number
}

export const metadata = { title: 'Garagem · TPC Painel' }

export default async function GaragemPage() {
  const [carsRes, saldo] = await Promise.all([
    apiGet<{ cars: CarItem[]; meta: { count: number; limit: number } }>('/me/cars'),
    apiGet<Saldo>('/me/saldo').catch(() => ({ available: 0, reserved: 0, total: 0 })),
  ])

  return <GaragemView cars={carsRes.cars} meta={carsRes.meta} saldo={saldo} />
}
