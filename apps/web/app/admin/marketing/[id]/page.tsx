import { notFound } from 'next/navigation'

import { AdminShell } from '@/components/layout/AdminShell'
import { apiGet } from '@/lib/api/server'
import { getAdminShellUser } from '@/lib/admin/me'

import { CampanhaDetailView } from './view'

import type { CampaignStatus } from '../page'

export interface CampaignDetail {
  id: string
  subject: string
  title: string
  body: string
  ctaText: string | null
  ctaUrl: string | null
  status: CampaignStatus
  estimatedReach: number | null
  createdAt: string
  updatedAt: string
  sentAt: string | null
  createdBy: { name: string; email: string }
  // Counts por DeliveryStatus (QUEUED, SENT, DELIVERED, OPENED, CLICKED,
  // BOUNCED, FAILED). Vazio = nenhum delivery ainda.
  stats: Record<string, number>
}

interface PageProps {
  params: Promise<{ id: string }>
}

export const metadata = { title: 'Campanha · Admin' }

export default async function AdminCampanhaPage({ params }: PageProps) {
  const { id } = await params

  const [shellUser, campaign] = await Promise.all([
    getAdminShellUser(),
    apiGet<CampaignDetail>(`/admin/marketing-campaigns/${id}`).catch(() => null),
  ])

  if (!campaign) notFound()

  return (
    <AdminShell
      breadcrumbs={['Admin', 'Marketing', campaign.title]}
      user={shellUser}
    >
      <CampanhaDetailView initial={campaign} />
    </AdminShell>
  )
}
