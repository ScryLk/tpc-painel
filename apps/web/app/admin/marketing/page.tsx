import { AdminShell } from '@/components/layout/AdminShell'
import { apiGet } from '@/lib/api/server'
import { getAdminShellUser } from '@/lib/admin/me'

import { CampanhasView } from './view'

export type CampaignStatus = 'DRAFT' | 'SENDING' | 'SENT' | 'FAILED'

export interface CampaignListItem {
  id: string
  subject: string
  title: string
  status: CampaignStatus
  ctaText: string | null
  ctaUrl: string | null
  estimatedReach: number | null
  createdAt: string
  updatedAt: string
  sentAt: string | null
  createdBy: { name: string; email: string }
  deliveriesCount: number
}

export const metadata = { title: 'Marketing · Admin' }

export default async function AdminMarketingPage() {
  const [shellUser, campaigns] = await Promise.all([
    getAdminShellUser(),
    apiGet<{ items: CampaignListItem[] }>('/admin/marketing-campaigns').catch(
      () => ({ items: [] as CampaignListItem[] }),
    ),
  ])

  return (
    <AdminShell breadcrumbs={['Admin', 'Marketing']} user={shellUser}>
      <CampanhasView campaigns={campaigns.items} />
    </AdminShell>
  )
}
