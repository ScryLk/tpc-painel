import { apiGet } from '@/lib/api/server'

import { PedidosView, type PedidoItem } from './view'

interface Saldo {
  available: number
  reserved: number
  total: number
}

// Shapes crus da API (mantenho aqui pra não vazar pro view).
interface RawRemapOrder {
  id: string
  protocol: string
  status:
    | 'AWAITING_QUOTE'
    | 'QUOTE_SENT'
    | 'ANALYZING'
    | 'MAPPING'
    | 'AWAITING_REVIEW'
    | 'APPROVED'
    | 'NEEDS_REVISION'
    | 'CANCELLED'
  isCustomQuote: boolean
  pointsReserved: number
  pointsDebited: number
  createdAt: string
  approvedAt: string | null
  cancelledAt: string | null
  remapService: { name: string; category: string } | null
  car: { brand: string; model: string; plate: string } | null
}

interface RawSolicitacao {
  id: string
  protocol: string
  status: 'PENDENTE' | 'CONFIRMADA' | 'EM_EXEC' | 'CONCLUIDA' | 'CANCELADA'
  scheduledDate: string
  endDate: string | null
  slot: 'MANHA' | 'TARDE'
  pointsReserved: number
  pointsDebited: number
  createdAt: string
  service: { name: string; category: string } | null
  car: { brand: string; model: string; plate: string } | null
}

export const metadata = { title: 'Pedidos · TPC Painel' }

export default async function PedidosPage() {
  // Busca os dois tipos em paralelo: file service (RemapOrder) e presencial
  // (Solicitacao). Cada falha individual degrada pra lista vazia, mas não
  // mata a página inteira.
  const [remapRes, solicRes, saldo] = await Promise.all([
    apiGet<{ items: RawRemapOrder[] }>('/me/remap-orders?limit=50').catch(
      () => ({ items: [] as RawRemapOrder[] }),
    ),
    apiGet<{ items: RawSolicitacao[] }>('/me/solicitacoes?limit=50').catch(
      () => ({ items: [] as RawSolicitacao[] }),
    ),
    apiGet<Saldo>('/me/saldo').catch(() => ({
      available: 0,
      reserved: 0,
      total: 0,
    })),
  ])

  // Normaliza pra shape unificado, com discriminador `kind`. Junta e ordena
  // por createdAt desc — mais recente primeiro, independente do canal.
  const merged: PedidoItem[] = [
    ...remapRes.items.map(
      (o): PedidoItem => ({
        kind: 'remap',
        id: o.id,
        protocol: o.protocol,
        status: o.status,
        isCustomQuote: o.isCustomQuote,
        pointsReserved: o.pointsReserved,
        pointsDebited: o.pointsDebited,
        createdAt: o.createdAt,
        serviceName: o.remapService?.name ?? null,
        car: o.car,
      }),
    ),
    ...solicRes.items.map(
      (s): PedidoItem => ({
        kind: 'presencial',
        id: s.id,
        protocol: s.protocol,
        status: s.status,
        isCustomQuote: false,
        pointsReserved: s.pointsReserved,
        pointsDebited: s.pointsDebited,
        createdAt: s.createdAt,
        serviceName: s.service?.name ?? null,
        car: s.car,
        scheduledDate: s.scheduledDate,
      }),
    ),
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  return <PedidosView items={merged} saldo={saldo} />
}
