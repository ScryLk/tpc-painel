import { notFound, redirect } from 'next/navigation'

import { SucessoView } from './view'
import { apiGet } from '@/lib/api/server'

interface Purchase {
  id: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED'
  method: 'PIX' | 'CREDIT_CARD'
  amountCents: number
  installments: number
  pointsCredited: number
  paidAt: string | null
  package: { tier: string; name: string; points: number; bonusPoints: number }
}

interface Saldo {
  available: number
  reserved: number
  total: number
}

export const metadata = { title: 'Pontos creditados · TPC Painel' }

interface PageProps {
  params: Promise<{ purchaseId: string }>
}

export default async function SucessoPage({ params }: PageProps) {
  const { purchaseId } = await params

  let purchase: Purchase
  try {
    purchase = await apiGet<Purchase>(`/purchases/${purchaseId}`)
  } catch {
    notFound()
  }

  if (purchase.status === 'PENDING') {
    redirect(`/pontos/checkout/${purchase.id}`)
  }
  if (purchase.status === 'REJECTED' || purchase.status === 'REFUNDED') {
    redirect('/pontos/comprar?error=' + purchase.status.toLowerCase())
  }

  const saldo = await apiGet<Saldo>('/me/saldo').catch(() => ({
    available: 0,
    reserved: 0,
    total: 0,
  }))

  return <SucessoView purchase={purchase} saldo={saldo} />
}
