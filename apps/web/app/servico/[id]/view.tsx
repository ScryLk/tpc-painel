'use client'

import Link from 'next/link'

import { fitsBalance, isServiceCompatibleWithCar } from '@tpc/lib/business'
import { formatBRL, formatPoints } from '@tpc/lib/formatters'
import { Button, Card, DiagonalStripes } from '@tpc/ui'

import { ClientShell } from '@/components/layout/ClientShell'

interface Servico {
  id: string
  name: string
  description: string
  category: 'PERFORMANCE' | 'AESTHETIC' | 'CONFIG'
  pts: number
  priceAvulsoCents: number
  motorTypes: string[]
  durationDays: number
  popular: boolean
}

interface Saldo {
  available: number
  reserved: number
  total: number
}

interface CarLite {
  id: string
  brand: string
  model: string
  motorType: string
  isActive: boolean
}

interface Props {
  servico: Servico
  saldo: Saldo
  activeCar: CarLite | null
}

export const ServicoDetalheView = ({ servico, saldo, activeCar }: Props) => {
  const compatible = activeCar
    ? isServiceCompatibleWithCar(servico.motorTypes, activeCar.motorType)
    : false
  const hasBalance = fitsBalance(servico.pts, saldo)
  const canBook = compatible && hasBalance && Boolean(activeCar)

  return (
    <ClientShell
      breadcrumbs={['Catálogo', servico.name]}
      saldoAvailable={saldo.available}
    >
      <div className="mx-auto max-w-[1280px] px-6 py-7 md:px-10">
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0">
            <Card elevated className="relative overflow-hidden p-6">
              <div className="pointer-events-none absolute right-0 top-0 opacity-40">
                <DiagonalStripes
                  width={220}
                  height={180}
                  thickness={1.5}
                  spacing={11}
                  mask="top-right"
                />
              </div>
              <div className="relative">
                <div className="tpc-eyebrow">{categoryLabel(servico.category)}</div>
                <h1 className="mt-1.5 text-[28px] font-bold leading-tight tracking-[-0.03em]">
                  {servico.name}
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-tpc-text-secondary">
                  {servico.description}
                </p>

                <div className="mt-5 flex items-baseline gap-3 border-t border-tpc-border pt-4">
                  <div className="tpc-num text-[40px] font-semibold leading-none tracking-tight">
                    {formatPoints(servico.pts)}
                  </div>
                  <div className="text-xs text-tpc-text-secondary">pontos</div>
                  {servico.priceAvulsoCents > 0 && (
                    <div className="ml-auto font-mono text-[11px] tracking-wider text-tpc-text-tertiary line-through">
                      {formatBRL(servico.priceAvulsoCents)} avulso
                    </div>
                  )}
                </div>
              </div>
            </Card>

            <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
              <InfoTile
                eyebrow="Duração"
                value={servico.durationDays === 1 ? '1 dia' : `${servico.durationDays} dias`}
              />
              <InfoTile
                eyebrow="Compatibilidade"
                value={
                  servico.motorTypes.length > 0
                    ? servico.motorTypes.slice(0, 3).join(' · ')
                    : 'Todos motores'
                }
              />
              <InfoTile
                eyebrow="Modalidade"
                value="Presencial · oficina TPC"
              />
            </div>
          </div>

          <aside className="lg:sticky lg:top-4 lg:self-start">
            <Card elevated className="p-5">
              <div className="tpc-eyebrow">Resumo</div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="tpc-num text-[32px] font-semibold leading-none tracking-tight text-tpc-text">
                  {formatPoints(servico.pts)}
                </span>
                <span className="text-xs text-tpc-text-secondary">pts</span>
              </div>
              {servico.priceAvulsoCents > 0 && (
                <div className="mt-1.5 font-mono text-[11px] text-tpc-text-tertiary line-through">
                  R$ {Math.round(servico.priceAvulsoCents / 100)} avulso
                </div>
              )}

              <div className="mt-4 space-y-2 border-t border-tpc-border pt-4 text-[12px]">
                <SummaryRow label="Seu saldo" value={`${formatPoints(saldo.available)} pts`} />
                <SummaryRow
                  label="Saldo após"
                  value={`${formatPoints(Math.max(0, saldo.available - servico.pts))} pts`}
                />
              </div>

              {activeCar ? (
                <div className="mt-4 rounded-lg border border-tpc-border bg-tpc-surface p-3">
                  <div className="tpc-eyebrow mb-1">Carro ativo</div>
                  <div className="text-sm font-semibold tracking-tight">
                    {activeCar.brand} {activeCar.model}
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-tpc-text-secondary">
                    Motor {activeCar.motorType}
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-tpc-yellow/30 bg-tpc-yellow/10 p-3">
                  <div className="text-sm font-semibold text-tpc-yellow">
                    Cadastra um carro
                  </div>
                  <p className="mt-1 text-xs text-tpc-text-secondary">
                    Pra agendar, precisa de carro ativo.{' '}
                    <Link href="/garagem" className="text-tpc-text underline">
                      Abrir garagem
                    </Link>
                  </p>
                </div>
              )}

              {!hasBalance && (
                <div className="mt-3 rounded-lg border border-tpc-yellow/30 bg-tpc-yellow/10 p-3">
                  <div className="text-sm font-semibold text-tpc-yellow">
                    Saldo insuficiente
                  </div>
                  <p className="mt-1 text-xs text-tpc-text-secondary">
                    Faltam {formatPoints(servico.pts - saldo.available)} pts.{' '}
                    <Link href="/pontos/comprar" className="text-tpc-text underline">
                      Carregar
                    </Link>
                  </p>
                </div>
              )}

              {activeCar && !compatible && (
                <div className="mt-3 rounded-lg border border-tpc-yellow/30 bg-tpc-yellow/10 p-3">
                  <div className="text-sm font-semibold text-tpc-yellow">
                    Não compatível
                  </div>
                  <p className="mt-1 text-xs text-tpc-text-secondary">
                    O carro ativo é {activeCar.motorType}. Este serviço requer:{' '}
                    {servico.motorTypes.join(', ')}.
                  </p>
                </div>
              )}

              <div className="mt-5">
                {canBook ? (
                  <Link href={`/servico/${servico.id}/agendar`} className="block">
                    <Button fullWidth>
                      Solicitar serviço · {formatPoints(servico.pts)} pts
                    </Button>
                  </Link>
                ) : (
                  <Button fullWidth disabled>
                    {!activeCar
                      ? 'Cadastra um carro'
                      : !compatible
                        ? 'Não compatível'
                        : 'Saldo insuficiente'}
                  </Button>
                )}
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </ClientShell>
  )
}

function InfoTile({ eyebrow, value }: { eyebrow: string; value: string }) {
  return (
    <div className="rounded-xl border border-tpc-border bg-tpc-surface p-3">
      <div className="tpc-eyebrow">{eyebrow}</div>
      <div className="mt-1 text-sm font-semibold tracking-tight">{value}</div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-tpc-text-secondary">{label}</span>
      <span className="tpc-num font-semibold text-tpc-text">{value}</span>
    </div>
  )
}

const categoryLabel = (cat: Servico['category']): string =>
  cat === 'PERFORMANCE'
    ? 'Performance'
    : cat === 'AESTHETIC'
      ? 'Som & estética'
      : 'Configuração'
