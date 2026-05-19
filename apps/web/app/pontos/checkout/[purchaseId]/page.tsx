import { redirect } from 'next/navigation'

import { CheckoutView } from './view'
import { apiGet } from '@/lib/api/server'

interface Purchase {
  id: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED'
  method: 'PIX' | 'CREDIT_CARD'
  amountCents: number
  installments: number
  pointsCredited: number
  cpfCnpj: string | null
  qrCode: string | null
  qrCodeBase64: string | null
  checkoutUrl: string | null
  mpExpiresAt: string | null
  paidAt: string | null
  createdAt: string
  package: { tier: string; name: string; points: number; bonusPoints: number }
}

export const metadata = { title: 'Confirmar compra · TPC Painel' }

interface PageProps {
  params: Promise<{ purchaseId: string }>
}

export default async function CheckoutPage({ params }: PageProps) {
  const { purchaseId } = await params

  let purchase: Purchase
  try {
    purchase = await apiGet<Purchase>(`/purchases/${purchaseId}`)
  } catch {
    redirect('/pontos/comprar')
  }

  if (purchase.status === 'APPROVED') {
    redirect(`/pontos/checkout/${purchase.id}/sucesso`)
  }
  if (purchase.status === 'REJECTED') {
    redirect('/pontos/comprar?error=rejected')
  }

  return <CheckoutView purchase={purchase} />
}
