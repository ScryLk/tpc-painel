import { DashboardView } from './view'
import { apiGet } from '@/lib/api/server'

interface Saldo {
  available: number
  reserved: number
  total: number
}

interface AtividadeItem {
  id: string
  type: 'CREDIT' | 'DEBIT' | 'RESERVE' | 'UNRESERVE'
  amount: number
  balanceAfter: number
  title: string
  subtitle: string
  createdAt: string
}

interface Me {
  id: string
  email: string
  name: string
  phone: string | null
  role: string
  onboardingDismissedAt: string | null
}

interface CarsResponse {
  cars: unknown[]
  meta: { count: number; limit: number }
}

export const metadata = { title: 'Painel · TPC Painel' }

// Usa nosso GET /me (synced via Clerk webhook) em vez de currentUser() do
// Clerk: economiza um round-trip pra clerk.com (50-200ms em dev keys).
// Dados são os mesmos (User table mantida sincronizada).
export default async function DashboardPage() {
  const [me, saldo, atividade, cars] = await Promise.all([
    apiGet<Me>('/me').catch(() => null),
    apiGet<Saldo>('/me/saldo').catch(() => ({ available: 0, reserved: 0, total: 0 })),
    apiGet<{ items: AtividadeItem[] }>('/me/atividade?limit=5').catch(() => ({ items: [] })),
    apiGet<CarsResponse>('/me/cars').catch(() => ({ cars: [], meta: { count: 0, limit: 3 } })),
  ])

  const fullName = me?.name ?? me?.email?.split('@')[0] ?? 'amigo'
  const firstName = fullName.split(' ')[0] ?? 'amigo'
  const parts = fullName.trim().split(/\s+/)
  const initials =
    parts.length >= 2
      ? `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
      : (firstName[0] ?? 'T').toUpperCase()

  const carsCount = cars.meta.count
  const hasCar = carsCount > 0
  const shouldShowWelcome = me ? !me.onboardingDismissedAt && !hasCar : false

  return (
    <DashboardView
      firstName={firstName}
      avatar={initials}
      saldo={saldo}
      atividade={atividade.items}
      carsCount={carsCount}
      hasCar={hasCar}
      shouldShowWelcome={shouldShowWelcome}
    />
  )
}
