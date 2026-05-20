import { currentUser } from '@clerk/nextjs/server'

import { apiGet } from '@/lib/api/server'

import { PerfilView } from './view'

interface Saldo {
  available: number
  reserved: number
  total: number
}

export const metadata = { title: 'Perfil · TPC Painel' }

export default async function PerfilPage() {
  const [user, saldo] = await Promise.all([
    currentUser(),
    apiGet<Saldo>('/me/saldo').catch(() => ({
      available: 0,
      reserved: 0,
      total: 0,
    })),
  ])

  const firstName =
    user?.firstName ?? user?.emailAddresses[0]?.emailAddress?.split('@')[0] ?? 'Cliente'
  const lastName = user?.lastName ?? ''
  const fullName = `${firstName} ${lastName}`.trim()
  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
      : (firstName[0] ?? 'T').toUpperCase()
  const email = user?.emailAddresses[0]?.emailAddress ?? '—'
  const phone = user?.phoneNumbers[0]?.phoneNumber ?? '—'
  const id = user?.id?.slice(-5).toUpperCase() ?? '—'

  return (
    <PerfilView
      saldo={saldo}
      user={{
        firstName,
        fullName,
        initials,
        email,
        phone,
        id,
      }}
    />
  )
}
