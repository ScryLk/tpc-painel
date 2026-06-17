import { notFound } from 'next/navigation'

import { apiGet } from '@/lib/api/server'

import { LeadDetailView } from './view'

interface Me {
  id: string
  name: string
  email: string
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN'
}

export interface LeadDetail {
  id: string
  name: string
  email: string
  phone: string | null
  vehicle: string | null
  year: string | null
  message: string
  source: string
  status: 'NEW' | 'REPLIED' | 'ARCHIVED'
  replyMessage: string | null
  repliedAt: string | null
  repliedBy: { name: string; email: string } | null
  createdAt: string
}

export const metadata = { title: 'Lead · Admin' }

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminLeadDetailPage({ params }: PageProps) {
  const { id } = await params

  let res: { lead: LeadDetail }
  try {
    res = await apiGet<{ lead: LeadDetail }>(`/admin/leads/${id}`)
  } catch {
    notFound()
  }

  const me = await apiGet<Me>('/me').catch(() => null)

  const firstName = me?.name?.split(' ')[0] ?? 'Admin'
  const initials = me?.name
    ? me.name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join('')
    : 'A'

  return (
    <LeadDetailView
      lead={res.lead}
      user={{ firstName, initials, role: me?.role ?? 'STAFF' }}
    />
  )
}
