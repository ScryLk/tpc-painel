import { notFound } from 'next/navigation'

import { AdminShell } from '@/components/layout/AdminShell'
import { apiGet } from '@/lib/api/server'
import { getAdminShellUser } from '@/lib/admin/me'

import { UsuarioDetailView } from './view'

export interface AdminUserDetail {
  id: string
  clerkId: string
  name: string
  email: string
  phone: string | null
  cpfCnpj: string | null
  avatarUrl: string | null
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN'
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  pendingDeletion: boolean
  address: {
    cep: string
    street: string
    number: string
    complement: string | null
    neighborhood: string
    city: string
    state: string
  } | null
  balance: { available: number; reserved: number }
  consent: {
    marketingEmail: boolean
    marketingWhatsapp: boolean
    transactionalEmail: boolean
    transactionalWhatsapp: boolean
    transactionalPush: boolean
  } | null
  counts: {
    cars: number
    purchases: number
    solicitacoes: number
    remapOrders: number
  }
  recentTransactions: Array<{
    id: string
    type: 'CREDIT' | 'DEBIT' | 'RESERVE' | 'UNRESERVE'
    amount: number
    balanceAfter: number
    createdAt: string
  }>
}

interface PageProps {
  params: Promise<{ id: string }>
}

export const metadata = { title: 'Usuário · Admin' }

export default async function AdminUsuarioDetailPage({ params }: PageProps) {
  const { id } = await params

  const [shellUser, target] = await Promise.all([
    getAdminShellUser(),
    apiGet<AdminUserDetail>(`/admin/users/${id}`).catch(() => null),
  ])

  if (!target) notFound()

  return (
    <AdminShell
      breadcrumbs={['Admin', 'Usuários', target.name]}
      user={shellUser}
    >
      <UsuarioDetailView
        initial={target}
        actorIsAdmin={shellUser.role === 'ADMIN'}
        actorIsSelf={shellUser.id === target.id}
      />
    </AdminShell>
  )
}
