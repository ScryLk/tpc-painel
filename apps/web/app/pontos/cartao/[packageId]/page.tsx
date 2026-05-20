import { notFound } from 'next/navigation'

import { CartaoView } from './view'
import { apiGet } from '@/lib/api/server'

interface Pacote {
  id: string
  tier: string
  name: string
  points: number
  priceCents: number
  bonusPoints: number
  bonusPct: number
  popular: boolean
}

interface SavedCard {
  id: string
  brand: string
  lastFour: string
  holderName: string
  expMonth: number
  expYear: number
  isDefault: boolean
}

interface Saldo {
  available: number
  reserved: number
  total: number
}

export const metadata = { title: 'Pagar com cartão · TPC Painel' }

interface PageProps {
  params: Promise<{ packageId: string }>
}

export default async function CartaoPage({ params }: PageProps) {
  const { packageId } = await params

  const pacotesRes = await apiGet<{ pacotes: Pacote[] }>('/pacotes', {
    requireAuth: false,
  }).catch(() => ({ pacotes: [] as Pacote[] }))
  const pacote = pacotesRes.pacotes.find((p) => p.id === packageId)
  if (!pacote) notFound()

  const [savedCardsRes, saldo] = await Promise.all([
    apiGet<{ cards: SavedCard[] }>('/me/cartoes-salvos').catch(() => ({ cards: [] })),
    apiGet<Saldo>('/me/saldo').catch(() => ({ available: 0, reserved: 0, total: 0 })),
  ])

  return <CartaoView pacote={pacote} savedCards={savedCardsRes.cards} saldo={saldo} />
}
