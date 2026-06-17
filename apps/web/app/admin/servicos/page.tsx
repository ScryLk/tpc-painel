import { AdminShell } from '@/components/layout/AdminShell'
import { apiGet } from '@/lib/api/server'
import { getAdminShellUser } from '@/lib/admin/me'

import { ServicosView } from './view'

export interface ServiceItem {
  id: string
  slug: string
  name: string
  description: string
  category: 'PERFORMANCE' | 'AESTHETIC' | 'CONFIG'
  pts: number
  priceAvulsoCents: number
  motorTypes: string[]
  durationDays: number
  popular: boolean
  active: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
  solicitacoesCount: number
}

export interface RemapServiceItem {
  id: string
  slug: string
  name: string
  description: string
  category: string | null
  pts: number
  priceAvulsoCents: number
  supports: string[]
  isCustom: boolean
  active: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
  ordersCount: number
}

interface PageProps {
  searchParams: Promise<{ tab?: string }>
}

export const metadata = { title: 'Serviços · Admin' }

export default async function AdminServicosPage({ searchParams }: PageProps) {
  const { tab } = await searchParams
  const initialTab: 'presencial' | 'arquivo' =
    tab === 'arquivo' ? 'arquivo' : 'presencial'

  const [shellUser, services, remapServices] = await Promise.all([
    getAdminShellUser(),
    apiGet<{ items: ServiceItem[] }>('/admin/services').catch(() => ({
      items: [] as ServiceItem[],
    })),
    apiGet<{ items: RemapServiceItem[] }>('/admin/remap-services').catch(() => ({
      items: [] as RemapServiceItem[],
    })),
  ])

  return (
    <AdminShell breadcrumbs={['Admin', 'Serviços']} user={shellUser}>
      <ServicosView
        initialTab={initialTab}
        services={services.items}
        remapServices={remapServices.items}
      />
    </AdminShell>
  )
}
