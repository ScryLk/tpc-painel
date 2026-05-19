import { currentUser } from '@clerk/nextjs/server'

import { DashboardView } from './view'
import { apiGet } from '@/lib/api/server'

interface Saldo {
  available: number
  reserved: number
  total: number
}

interface AtividadeItem {
  id: string
  type: 'CREDIT' | 'DEBIT' | 'RESERVE' | 'UNRESERVE'
  amount: number
  balanceAfter: number
  title: string
  subtitle: string
  createdAt: string
}

export const metadata = { title: 'Painel · TPC Painel' }

export default async function DashboardPage() {
  const user = await currentUser()

  const [saldo, atividade] = await Promise.all([
    apiGet<Saldo>('/me/saldo').catch(() => ({ available: 0, reserved: 0, total: 0 })),
    apiGet<{ items: AtividadeItem[] }>('/me/atividade?limit=5').catch(() => ({ items: [] })),
  ])

  const firstName =
    user?.firstName ?? user?.emailAddresses[0]?.emailAddress?.split('@')[0] ?? 'amigo'
  const avatar =
    user?.firstName && user?.lastName
      ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
      : (firstName[0] ?? 'T').toUpperCase()

  return (
    <DashboardView
      firstName={firstName}
      avatar={avatar}
      saldo={saldo}
      atividade={atividade.items}
    />
  )
}
