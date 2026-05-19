'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { useApi } from '@/lib/api/client'
import { totalCreditedPoints } from '@tpc/lib/business'
import { formatBRL, formatPoints } from '@tpc/lib/formatters'
import {
  BackButton,
  BrandPill,
  Card,
  PointsDisplay,
  ScreenChrome,
  SecHeading,
  TPCHeader,
  cn,
} from '@tpc/ui'

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
      <ScreenChrome>
        <TPCHeader
          back={<BackButton onClick={() => router.back()} />}
          title="Carregar pontos"
          subtitle="Nenhum pacote disponível"
        />
        <main className="flex-1 p-6 text-tpc-text-secondary">
          Os pacotes ainda não foram cadastrados. Tenta de novo em alguns minutos.
        </main>
      </ScreenChrome>
    )
  }

  return (
    <ScreenChrome>
      <TPCHeader
        back={<BackButton onClick={() => router.back()} />}
        title="Carregar pontos"
        subtitle="Quanto mais, mais barato"
        right={<PointsDisplay balance={saldo.available} compact />}
      />

      <div className="tpc-scroll flex-1 overflow-y-auto pb-40">
        <p className="px-5 pb-5 pt-4 text-sm leading-relaxed text-tpc-text-secondary">
          Pontos não expiram. Pix instantâneo ou cartão.{' '}
          <span className="text-tpc-text">Sem pegadinha.</span>
        </p>

        <div className="tpc-scroll flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-3">
          {pacotes.map((p) => (
            <PackageCard
              key={p.id}
              pkg={p}
              selected={p.id === selectedId}
              onSelect={() => setSelectedId(p.id)}
            />
          ))}
        </div>

        <div className="flex justify-center gap-1.5 pb-4">
          {pacotes.map((p) => (
            <span
              key={p.id}
              className={cn(
                'h-1.5 rounded-full transition-all',
                p.id === selectedId ? 'w-5 bg-tpc-red' : 'w-1.5 bg-tpc-border-strong',
              )}
            />
          ))}
        </div>

        <SecHeading>Compare os pacotes</SecHeading>
        <div className="px-5">
          <Card className="overflow-hidden p-0" elevated={false}>
            <table className="w-full">
              <thead>
                <tr className="bg-[#0f0f0f]">
                  <Th>Pacote</Th>
                  <Th align="right">Pts</Th>
                  <Th align="right">Bônus</Th>
                  <Th align="right">Total</Th>
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
                    highlight={p.id === selectedId}
                    last={i === pacotes.length - 1}
                  />
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        <div className="px-5 pt-5">
          <div className="tpc-eyebrow mb-2.5 flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-tpc-green">
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

        {error && (
          <div className="mx-5 mt-5 rounded-lg border border-tpc-red/40 bg-tpc-red/10 px-3 py-2 text-sm text-tpc-red">
            {error}
          </div>
        )}
      </div>

      <BottomCTA
        pkg={selected}
        disabled={isPending}
        onPix={handlePagarPix}
        onCard={handleAbrirCartao}
      />
    </ScreenChrome>
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
        'relative w-[280px] shrink-0 snap-center rounded-2xl p-5 text-left transition',
        selected
          ? 'border-2 border-tpc-red bg-tpc-elevated shadow-[0_0_0_4px_rgba(225,38,28,0.12),0_8px_24px_rgba(0,0,0,0.4)]'
          : 'border border-tpc-border bg-tpc-surface',
      )}
    >
      {pkg.popular && (
        <span className="absolute right-3.5 top-3.5 rounded bg-tpc-red px-2 py-1 font-mono text-[8px] font-bold tracking-[0.18em] text-tpc-text">
          MAIS ESCOLHIDO
        </span>
      )}
      {!pkg.popular && pkg.bonusPct > 0 && (
        <span className="absolute right-3.5 top-3.5 rounded border border-tpc-green/40 bg-tpc-green/10 px-2 py-0.5 font-mono text-[9px] font-bold tracking-[0.12em] text-tpc-green">
          +{pkg.bonusPct}%
        </span>
      )}

      <div className="tpc-eyebrow !text-tpc-text-secondary">{pkg.name}</div>

      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="tpc-num text-5xl font-medium leading-none tracking-tight">
          {formatPoints(pkg.points)}
        </span>
        <span className="text-xs text-tpc-text-secondary">pts</span>
      </div>

      {pkg.bonusPoints > 0 && (
        <div className="mt-2 flex items-center gap-1.5 font-mono text-[10px] text-tpc-green">
          <span>+{formatPoints(pkg.bonusPoints)} pts bônus</span>
          <span className="text-tpc-text-tertiary">·</span>
          <span className="text-tpc-text">{formatPoints(total)} total</span>
        </div>
      )}

      <div className="mt-3.5 border-t border-tpc-border pt-3.5">
        <div className="tpc-eyebrow mb-1">Preço</div>
        <div className="tpc-num text-2xl font-medium leading-none tracking-tight">
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
  highlight,
  last,
}: {
  name: string
  pts: string
  bonus: string
  total: string
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
      <td className="flex items-center gap-2 px-3.5 py-3 text-sm font-medium">
        {highlight && (
          <span className="h-3.5 w-[3px] rounded-sm bg-tpc-red shadow-[0_0_6px_rgba(225,38,28,0.5)]" />
        )}
        {name}
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
    </tr>
  )
}

function BottomCTA({
  pkg,
  disabled,
  onPix,
  onCard,
}: {
  pkg: Pacote
  disabled: boolean
  onPix: () => void
  onCard: () => void
}) {
  const total = totalCreditedPoints(pkg)
  return (
    <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[420px] border-t border-tpc-border bg-tpc-bg px-5 pb-5 pt-3.5 shadow-[0_-8px_24px_rgba(0,0,0,0.5)]">
      <div className="mb-2.5 flex items-center gap-2 font-mono text-[10px] font-semibold tracking-[0.08em] text-tpc-text">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-tpc-red drop-shadow-[0_0_4px_rgba(225,38,28,0.4)]">
          <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
        </svg>
        <span className="uppercase text-tpc-text-secondary">{pkg.name}</span>
        <span className="text-tpc-text-tertiary">·</span>
        <span>{formatPoints(pkg.points)}</span>
        {pkg.bonusPoints > 0 && (
          <>
            <span className="text-tpc-green">+{formatPoints(pkg.bonusPoints)}</span>
            <span className="text-tpc-text-tertiary">= {formatPoints(total)} pts</span>
          </>
        )}
        {pkg.bonusPoints === 0 && <span className="text-tpc-text-tertiary">pts</span>}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onPix}
          disabled={disabled}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-tpc-red px-4 py-3.5 font-sans text-sm font-semibold tracking-tight text-tpc-text shadow-lg shadow-tpc-red/40 transition hover:bg-tpc-red-dark disabled:opacity-60"
        >
          {disabled ? 'Carregando…' : <>Pagar {formatBRL(pkg.priceCents)}</>}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onCard}
          disabled={disabled}
          className="flex shrink-0 items-center justify-center rounded-xl border border-tpc-border-strong bg-tpc-elevated px-4 py-3.5 text-sm font-medium text-tpc-text transition hover:bg-tpc-elevated-2 disabled:opacity-60"
          aria-label="Pagar com cartão"
        >
          Cartão
        </button>
      </div>
    </div>
  )
}
