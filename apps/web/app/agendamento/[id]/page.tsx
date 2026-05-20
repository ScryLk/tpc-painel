import { notFound } from 'next/navigation'

import { AgendamentoView } from './view'
import { apiGet } from '@/lib/api/server'

interface Solicitacao {
  id: string
  protocol: string
  status: 'PENDENTE' | 'CONFIRMADA' | 'EM_EXEC' | 'CONCLUIDA' | 'CANCELADA'
  scheduledDate: string
  endDate: string | null
  slot: 'MANHA' | 'TARDE'
  observations: string | null
  pointsReserved: number
  pointsDebited: number
  cancelReason: string | null
  refundPct: number | null
  confirmedAt: string | null
  startedAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  createdAt: string
  reservationExpiresAt: string | null
  service: { name: string; category: string; pts: number; durationDays: number }
  car: { brand: string; model: string; year: number; plate: string; motorType: string }
}

export const metadata = { title: 'Agendamento · TPC Painel' }

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AgendamentoPage({ params }: PageProps) {
  const { id } = await params

  let s: Solicitacao
  try {
    s = await apiGet<Solicitacao>(`/solicitacoes/${id}`)
  } catch {
    notFound()
  }

  return <AgendamentoView solicitacao={s} />
}
