import { notFound } from 'next/navigation'

import { apiGet } from '@/lib/api/server'

import { PedidoView } from './view'

interface RemapOrder {
  id: string
  protocol: string
  status:
    | 'AWAITING_QUOTE'
    | 'QUOTE_SENT'
    | 'ANALYZING'
    | 'MAPPING'
    | 'AWAITING_REVIEW'
    | 'APPROVED'
    | 'NEEDS_REVISION'
    | 'CANCELLED'
  isCustomQuote: boolean
  serviceId: string | null
  carId: string | null
  ecuModel: string | null
  hardwareUsed: string | null
  readMode: string | null
  vehicleVin: string | null
  mileage: number | null
  description: string | null
  quotePoints: number | null
  quoteAccepted: boolean | null
  pointsReserved: number
  pointsDebited: number
  createdAt: string
  approvedAt: string | null
  cancelledAt: string | null
  remapService: { name: string; category: string; pts: number; supports: string[] } | null
  car: { brand: string; model: string; year: number; plate: string; motorType: string } | null
  reservationExpiresAt: string | null
}

interface Saldo {
  available: number
  reserved: number
  total: number
}

export const metadata = { title: 'Pedido · TPC Painel' }

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PedidoPage({ params }: PageProps) {
  const { id } = await params

  let order: RemapOrder
  try {
    order = await apiGet<RemapOrder>(`/remap-orders/${id}`)
  } catch {
    notFound()
  }

  const saldo = await apiGet<Saldo>('/me/saldo').catch(() => ({
    available: 0,
    reserved: 0,
    total: 0,
  }))

  return <PedidoView order={order} saldo={saldo} />
}
