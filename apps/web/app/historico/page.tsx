import { apiGet } from '@/lib/api/server'

import { HistoricoView } from './view'

interface Saldo {
  available: number
  reserved: number
  total: number
}

export const metadata = { title: 'Histórico · TPC Painel' }

// [TPC-DECISION] endpoint /me/historico ainda não existe. Mock até o sprint definir
// schema (agrupamento por data + tipos: remap/service/purchase/refund).
export default async function HistoricoPage() {
  const saldo = await apiGet<Saldo>('/me/saldo').catch(() => ({
    available: 0,
    reserved: 0,
    total: 0,
  }))

  return <HistoricoView saldo={saldo} />
}
