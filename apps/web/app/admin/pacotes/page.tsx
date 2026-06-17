import { AdminShell } from '@/components/layout/AdminShell'
import { apiGet } from '@/lib/api/server'
import { getAdminShellUser } from '@/lib/admin/me'

import { PacotesView } from './view'

export interface PackageItem {
  id: string
  tier: string
  name: string
  points: number
  priceCents: number
  bonusPoints: number
  bonusPct: number
  popular: boolean
  active: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
  purchasesCount: number
}

export const metadata = { title: 'Pacotes · Admin' }

export default async function AdminPacotesPage() {
  const [shellUser, packages] = await Promise.all([
    getAdminShellUser(),
    apiGet<{ items: PackageItem[] }>('/admin/packages').catch(() => ({
      items: [] as PackageItem[],
    })),
  ])

  return (
    <AdminShell breadcrumbs={['Admin', 'Pacotes']} user={shellUser}>
      <PacotesView packages={packages.items} />
    </AdminShell>
  )
}
