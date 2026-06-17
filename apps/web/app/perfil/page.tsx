import { apiGet } from '@/lib/api/server'

import { PerfilView } from './view'

interface Saldo {
  available: number
  reserved: number
  total: number
}

interface Me {
  id: string
  email: string
  name: string
  phone: string | null
  cpfCnpj: string | null
  avatarUrl: string | null
  address: {
    cep: string
    street: string
    number: string
    complement: string | null
    neighborhood: string
    city: string
    state: string
  } | null
}

export const metadata = { title: 'Perfil · TPC Painel' }

// Mesma decisão do dashboard: GET /me (DB local, synced via Clerk webhook)
// substitui currentUser(), economizando round-trip pra clerk.com.
export default async function PerfilPage() {
  const [me, saldo] = await Promise.all([
    apiGet<Me>('/me').catch(() => null),
    apiGet<Saldo>('/me/saldo').catch(() => ({
      available: 0,
      reserved: 0,
      total: 0,
    })),
  ])

  const fullName = me?.name?.trim() || me?.email?.split('@')[0] || 'Cliente'
  const firstName = fullName.split(' ')[0] ?? 'Cliente'
  const parts = fullName.split(/\s+/)
  const initials =
    parts.length >= 2
      ? `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
      : (firstName[0] ?? 'T').toUpperCase()

  return (
    <PerfilView
      saldo={saldo}
      user={{
        firstName,
        fullName,
        initials,
        email: me?.email ?? '',
        phone: me?.phone ?? '',
        cpfCnpj: me?.cpfCnpj ?? '',
        avatarUrl: me?.avatarUrl ?? null,
        address: me?.address ?? null,
        id: me?.id?.slice(-5).toUpperCase() ?? '—',
      }}
    />
  )
}
