import { apiGet } from '@/lib/api/server'
import { AdminShell } from '@/components/layout/AdminShell'
import { getAdminShellUser } from '@/lib/admin/me'

import { UsuariosListView } from './view'

export interface AdminUserListItem {
  id: string
  name: string
  email: string
  phone: string | null
  cpfCnpj: string | null
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN'
  createdAt: string
  deletedAt: string | null
  pendingDeletion: boolean
  balance: { available: number; reserved: number }
  carsCount: number
}

interface UsersResponse {
  items: AdminUserListItem[]
  nextCursor: string | null
}

export const metadata = { title: 'Usuários · Admin' }

export default async function AdminUsuariosPage() {
  const [shellUser, initial] = await Promise.all([
    getAdminShellUser(),
    apiGet<UsersResponse>('/admin/users?limit=50').catch(() => ({
      items: [],
      nextCursor: null,
    })),
  ])

  return (
    <AdminShell breadcrumbs={['Admin', 'Usuários']} user={shellUser}>
      <UsuariosListView
        initialItems={initial.items}
        initialNextCursor={initial.nextCursor}
        canChangeRoles={shellUser.role === 'ADMIN'}
      />
    </AdminShell>
  )
}
