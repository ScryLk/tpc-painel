import { apiGet } from '@/lib/api/server'

import { LeadsListView } from './view'

interface Me {
  id: string
  name: string
  email: string
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN'
}

export interface LeadListItem {
  id: string
  name: string
  email: string
  phone: string | null
  vehicle: string | null
  year: string | null
  messagePreview: string
  status: 'NEW' | 'REPLIED' | 'ARCHIVED'
  createdAt: string
  repliedAt: string | null
}

interface LeadsResponse {
  items: LeadListItem[]
  nextCursor: string | null
  counts: { NEW: number; REPLIED: number; ARCHIVED: number }
}

export const metadata = { title: 'Leads · Admin' }

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function AdminLeadsPage({ searchParams }: PageProps) {
  const { status: rawStatus } = await searchParams
  const status =
    rawStatus === 'REPLIED' || rawStatus === 'ARCHIVED' ? rawStatus : 'NEW'

  const [me, leads] = await Promise.all([
    apiGet<Me>('/me').catch(() => null),
    apiGet<LeadsResponse>(`/admin/leads?status=${status}`).catch(() => ({
      items: [],
      nextCursor: null,
      counts: { NEW: 0, REPLIED: 0, ARCHIVED: 0 },
    })),
  ])

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
    <LeadsListView
      currentStatus={status}
      items={leads.items}
      counts={leads.counts}
      user={{ firstName, initials, role: me?.role ?? 'STAFF' }}
    />
  )
}
