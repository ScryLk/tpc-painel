import { apiGet } from '@/lib/api/server'

interface AdminMe {
  id: string
  name: string
  email: string
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN'
}

export interface AdminShellUser {
  id: string | null
  firstName: string
  initials: string
  role: AdminMe['role']
}

// Server-side helper compartilhado pelas pages do admin. Busca /me uma vez e
// devolve o shape que o AdminShell consome. Se /me falhar, devolve fallback
// neutro pra não quebrar a página (o layout do admin já filtra por role).
export const getAdminShellUser = async (): Promise<AdminShellUser> => {
  const me = await apiGet<AdminMe>('/me').catch(() => null)

  const fullName = me?.name?.trim() || me?.email?.split('@')[0] || 'Admin'
  const firstName = fullName.split(' ')[0] ?? 'Admin'
  const parts = fullName.split(/\s+/)
  const initials =
    parts.length >= 2
      ? `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
      : (firstName[0] ?? 'A').toUpperCase()

  return {
    id: me?.id ?? null,
    firstName,
    initials,
    role: me?.role ?? 'STAFF',
  }
}
