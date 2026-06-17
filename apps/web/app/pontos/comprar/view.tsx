'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { useApi } from '@/lib/api/client'
import { totalCreditedPoints } from '@tpc/lib/business'
import { formatBRL, formatPoints } from '@tpc/lib/formatters'
import { BrandPill, Card, SecHeading, cn } from '@tpc/ui'

import { ClientShell } from '@/components/layout/ClientShell'

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

interface CheckoutResponse {
  purchaseId: string
  method: 'pix' | 'card'
}

interface Props {
  pacotes: Pacote[]
  saldo: Saldo
}

export const ComprarPontosView = ({ pacotes, saldo }: Props) => {
  const router = useRouter()
  const api = useApi()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const initialTier = pacotes.find((p) => p.popular)?.id ?? pacotes[0]?.id
  const [selectedId, setSelectedId] = useState<string | undefined>(initialTier)
  const selected = pacotes.find((p) => p.id === selectedId) ?? pacotes[0]

  const handlePagarPix = () => {
    if (!selected) return
    setError(null)
    startTransition(async () => {
      try {
        const res = await api.post<CheckoutResponse>('/checkout', {
          packageId: selected.id,
          method: 'pix',
        })
        router.push(`/pontos/checkout/${res.purchaseId}`)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Falha ao iniciar checkout.'
        setError(message)
      }
    })
  }

  const handleAbrirCartao = () => {
    if (!selected) return
    router.push(`/pontos/cartao/${selected.id}`)
  }

  if (!selected) {
    return (
      <ClientShell
        breadcrumbs={['Pontos', 'Carregar']}
        saldoAvailable={saldo.available}
      >
        <div className="mx-auto max-w-[1280px] px-6 py-8 md:px-10">
          <h1 className="text-[26px] font-bold tracking-[-0.03em] text-tpc-text">
            Carregar pontos
          </h1>
          <p className="mt-2 text-sm text-tpc-text-secondary">
            Os pacotes ainda não foram cadastrados. Tenta de novo em alguns minutos.
          </p>
        </div>
      </ClientShell>
    )
  }

  return (
    <ClientShell
      breadcrumbs={['Pontos', 'Carregar']}
      saldoAvailable={saldo.available}
    >
      <div className="mx-auto max-w-[1280px] px-6 py-7 md:px-10">
        <div className="mb-6">
          <h1 className="text-[26px] font-bold leading-tight tracking-[-0.03em] text-tpc-text">
            Carregar pontos
          </h1>
          <p className="mt-1 text-[13px] text-tpc-text-secondary">
            Quanto mais, mais barato. Pontos não expiram. Pix instantâneo ou cartão até 3x.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {pacotes.map((p) => (
                <PackageCard
                  key={p.id}
                  pkg={p}
                  selected={p.id === selectedId}
                  onSelect={() => setSelectedId(p.id)}
                />
              ))}
            </div>

            <SecHeading className="px-0 pb-2 pt-6">Compare os pacotes</SecHeading>
            <Card className="overflow-hidden p-0" elevated={false}>
              <table className="w-full">
                <thead>
                  <tr className="bg-tpc-bg/60">
                    <Th>Pacote</Th>
                    <Th align="right">Pts</Th>
                    <Th align="right">Bônus</Th>
                    <Th align="right">Total</Th>
                    <Th align="right">Preço</Th>
                  </tr>
                </thead>
                <tbody>
                  {pacotes.map((p, i) => (
                    <Row
                      key={p.id}
                      name={p.name}
                      pts={formatPoints(p.points)}
                      bonus={p.bonusPoints > 0 ? `+${formatPoints(p.bonusPoints)}` : '—'}
                      total={formatPoints(totalCreditedPoints(p))}
                      price={formatBRL(p.priceCents)}
                      highlight={p.id === selectedId}
                      last={i === pacotes.length - 1}
                    />
                  ))}
                </tbody>
              </table>
            </Card>

            <div className="mt-6">
              <div className="tpc-eyebrow mb-2 flex items-center gap-2">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-tpc-green"
                  aria-hidden
                >
                  <rect x="4" y="11" width="16" height="11" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
                <span>Compra 100% segura · Mercado Pago</span>
              </div>
              <div className="flex items-center gap-2">
                <BrandPill kind="pix" />
                <BrandPill kind="visa" />
                <BrandPill kind="master" />
                <BrandPill kind="elo" />
              </div>
            </div>
          </div>

          <aside className="lg:sticky lg:top-4 lg:self-start">
            <CheckoutSidebar
              pkg={selected}
              error={error}
              isPending={isPending}
              onPix={handlePagarPix}
              onCard={handleAbrirCartao}
            />
          </aside>
        </div>
      </div>
    </ClientShell>
  )
}

function PackageCard({
  pkg,
  selected,
  onSelect,
}: {
  pkg: Pacote
  selected: boolean
  onSelect: () => void
}) {
  const total = totalCreditedPoints(pkg)
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'relative cursor-pointer rounded-2xl border border-tpc-border bg-tpc-surface p-3.5 text-left transition',
        selected
          ? 'bg-tpc-elevated ring-2 ring-tpc-red ring-offset-2 ring-offset-tpc-bg shadow-[0_8px_24px_rgba(0,0,0,0.4)]'
          : 'hover:border-tpc-red/40',
      )}
    >
      {pkg.popular && (
        <span className="absolute -top-2 right-3 rounded bg-tpc-red px-1.5 py-0.5 font-mono text-[8px] font-bold tracking-[0.16em] text-tpc-text shadow-md shadow-tpc-red/30">
          MAIS ESCOLHIDO
        </span>
      )}
      {!pkg.popular && pkg.bonusPct > 0 && (
        <span className="absolute -top-2 right-3 rounded border border-tpc-green/40 bg-tpc-green/15 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-[0.12em] text-tpc-green backdrop-blur-sm">
          +{pkg.bonusPct}%
        </span>
      )}

      <div className="tpc-eyebrow !text-tpc-text-secondary">{pkg.name}</div>

      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span className="tpc-num text-[30px] font-medium leading-none tracking-tight">
          {formatPoints(pkg.points)}
        </span>
        <span className="text-[11px] text-tpc-text-secondary">pts</span>
      </div>

      {pkg.bonusPoints > 0 && (
        <div className="mt-1 flex flex-wrap items-center gap-1 font-mono text-[10px] text-tpc-green">
          <span>+{formatPoints(pkg.bonusPoints)} bônus</span>
          <span className="text-tpc-text-tertiary">·</span>
          <span className="text-tpc-text">{formatPoints(total)} total</span>
        </div>
      )}

      <div className="mt-2.5 border-t border-tpc-border pt-2.5">
        <div className="tpc-eyebrow mb-0.5">Preço</div>
        <div className="tpc-num whitespace-nowrap text-[18px] font-semibold leading-none tracking-tight">
          {formatBRL(pkg.priceCents)}
        </div>
      </div>
    </button>
  )
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      className={cn(
        'tpc-eyebrow border-b border-tpc-border px-3.5 py-3',
        align === 'right' ? 'text-right' : 'text-left',
      )}
    >
      {children}
    </th>
  )
}

function Row({
  name,
  pts,
  bonus,
  total,
  price,
  highlight,
  last,
}: {
  name: string
  pts: string
  bonus: string
  total: string
  price: string
  highlight: boolean
  last: boolean
}) {
  return (
    <tr
      className={cn(
        !last && 'border-b border-tpc-border',
        highlight && 'bg-tpc-red/[0.05]',
      )}
    >
      <td className="px-3.5 py-3 text-sm font-medium">
        <span className="flex items-center gap-2">
          {highlight && (
            <span className="h-3.5 w-[3px] rounded-sm bg-tpc-red shadow-[0_0_6px_rgba(225,38,28,0.5)]" />
          )}
          {name}
        </span>
      </td>
      <td className="tpc-num px-3.5 py-3 text-right text-xs">{pts}</td>
      <td
        className={cn(
          'px-3.5 py-3 text-right font-mono text-xs font-medium',
          bonus === '—' ? 'text-tpc-text-tertiary' : 'text-tpc-green',
        )}
      >
        {bonus}
      </td>
      <td className="tpc-num px-3.5 py-3 text-right text-xs font-semibold">{total}</td>
      <td className="tpc-num px-3.5 py-3 text-right text-xs">{price}</td>
    </tr>
  )
}

function CheckoutSidebar({
  pkg,
  error,
  isPending,
  onPix,
  onCard,
}: {
  pkg: Pacote
  error: string | null
  isPending: boolean
  onPix: () => void
  onCard: () => void
}) {
  const total = totalCreditedPoints(pkg)
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-tpc-border bg-tpc-elevated/40 p-5">
        <div className="tpc-eyebrow mb-1.5">Pacote selecionado</div>
        <div className="text-lg font-bold tracking-[-0.02em] text-tpc-text">
          {pkg.name}
        </div>
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="tpc-num text-[36px] font-semibold leading-none tracking-tight text-tpc-text">
            {formatPoints(total)}
          </span>
          <span className="text-xs text-tpc-text-secondary">pts totais</span>
        </div>
        {pkg.bonusPoints > 0 && (
          <div className="mt-1.5 font-mono text-[11px] text-tpc-green">
            {formatPoints(pkg.points)} +{formatPoints(pkg.bonusPoints)} bônus
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="mb-4 flex items-baseline justify-between">
          <span className="text-[13px] text-tpc-text-secondary">Total</span>
          <span className="tpc-num text-2xl font-semibold tracking-tight text-tpc-text">
            {formatBRL(pkg.priceCents)}
          </span>
        </div>

        <button
          type="button"
          onClick={onPix}
          disabled={isPending}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-tpc-red px-4 py-3 font-sans text-sm font-semibold tracking-tight text-tpc-text shadow-lg shadow-tpc-red/40 transition hover:bg-tpc-red-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? 'Carregando…' : `Pagar com Pix · ${formatBRL(pkg.priceCents)}`}
        </button>
        <button
          type="button"
          onClick={onCard}
          disabled={isPending}
          className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-tpc-border-strong bg-tpc-elevated px-4 py-3 text-sm font-medium text-tpc-text transition hover:bg-tpc-elevated-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Pagar com cartão · até 3x
        </button>

        {error && (
          <div className="mt-3 rounded-lg border border-tpc-red/40 bg-tpc-red/10 px-3 py-2 text-xs text-tpc-red">
            {error}
          </div>
        )}

        <p className="mt-4 text-[11px] leading-relaxed text-tpc-text-tertiary">
          Pix cai na hora. Cartão até 3x sem juros. Pontos não expiram.
        </p>
      </div>
    </Card>
  )
}
