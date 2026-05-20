import { ComprarPontosView } from './view'
import { apiGet } from '@/lib/api/server'

interface Pacote {
  id: string
  tier: string
  name: string
  points: number
  priceCents: number
  bonusPoints: number
  bonusPct: number
  popular: boolean
  sortOrder: number
}

interface Saldo {
  available: number
  reserved: number
  total: number
}

export const metadata = { title: 'Carregar pontos · TPC Painel' }

export default async function ComprarPontosPage() {
  const [pacotesRes, saldo] = await Promise.all([
    apiGet<{ pacotes: Pacote[] }>('/pacotes', {
      requireAuth: false,
      cache: 'no-store',
    }).catch(() => ({ pacotes: [] })),
    apiGet<Saldo>('/me/saldo').catch(() => ({ available: 0, reserved: 0, total: 0 })),
  ])

  return <ComprarPontosView pacotes={pacotesRes.pacotes} saldo={saldo} />
}
