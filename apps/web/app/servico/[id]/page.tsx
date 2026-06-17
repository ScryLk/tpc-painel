import { notFound } from 'next/navigation'

import { apiGet } from '@/lib/api/server'

import { ServicoArquivoView } from './view-arquivo'
import { ServicoDetalheView } from './view'

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

export const metadata = { title: 'Detalhe do serviço · TPC Painel' }

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ canal?: string }>
}

export default async function ServicoDetalhePage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { canal } = await searchParams

  if (canal === 'arquivo') {
    let remapRes: { service: RemapService }
    try {
      remapRes = await apiGet<{ service: RemapService }>(`/remap-services/${id}`, {
        requireAuth: false,
      })
    } catch {
      notFound()
    }
    const [saldo, carsRes] = await Promise.all([
      apiGet<Saldo>('/me/saldo').catch(() => ({
        available: 0,
        reserved: 0,
        total: 0,
      })),
      apiGet<{ cars: CarLite[] }>('/me/cars').catch(() => ({ cars: [] })),
    ])
    const activeCar = carsRes.cars.find((c) => c.isActive) ?? carsRes.cars[0] ?? null
    return (
      <ServicoArquivoView
        service={remapRes.service}
        saldo={saldo}
        activeCar={activeCar}
      />
    )
  }

  let servicoRes: { servico: Servico }
  try {
    servicoRes = await apiGet<{ servico: Servico }>(`/servicos/${id}`, {
      requireAuth: false,
    })
  } catch {
    notFound()
  }

  const [saldo, carsRes] = await Promise.all([
    apiGet<Saldo>('/me/saldo').catch(() => ({ available: 0, reserved: 0, total: 0 })),
    apiGet<{ cars: CarLite[] }>('/me/cars').catch(() => ({ cars: [] })),
  ])

  const activeCar = carsRes.cars.find((c) => c.isActive) ?? null

  return (
    <ServicoDetalheView servico={servicoRes.servico} saldo={saldo} activeCar={activeCar} />
  )
}
