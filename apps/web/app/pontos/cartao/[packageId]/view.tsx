'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'

import { useApi } from '@/lib/api/client'
import { detectBrand, formatCardNumber, formatExpiry, tokenizeCard } from '@/lib/mp/client'
import { canInstall, installmentValueCents, totalCreditedPoints } from '@tpc/lib/business'
import { formatBRL, formatPoints } from '@tpc/lib/formatters'
import {
  BackButton,
  BrandPill,
  Card,
  PointsDisplay,
  ScreenChrome,
  TPCHeader,
  cn,
} from '@tpc/ui'

interface Pacote {
  id: string
  name: string
  points: number
  priceCents: number
  bonusPoints: number
  bonusPct: number
}

interface SavedCard {
  id: string
  brand: string
  lastFour: string
  holderName: string
  expMonth: number
  expYear: number
  isDefault: boolean
}

interface Saldo {
  available: number
  reserved: number
  total: number
}

interface CheckoutResponse {
  purchaseId: string
  method: 'card'
  mpPaymentId: string
  checkoutUrl?: string | null
}

const brandToPill = (brand: string): 'visa' | 'master' | 'elo' => {
  if (brand === 'master') return 'master'
  if (brand === 'elo') return 'elo'
  return 'visa'
}

export const CartaoView = ({
  pacote,
  savedCards,
  saldo,
}: {
  pacote: Pacote
  savedCards: SavedCard[]
  saldo: Saldo
}) => {
  const router = useRouter()
  const api = useApi()

  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(
    savedCards.find((c) => c.isDefault)?.id ?? null,
  )
  const [installments, setInstallments] = useState<1 | 2 | 3>(1)

  const installmentsEnabled = canInstall(pacote, 2)

  const onPay1Click = (cardId: string) => {
    setError(null)
    startTransition(async () => {
      try {
        const res = await api.post<CheckoutResponse>('/checkout', {
          packageId: pacote.id,
          method: 'card',
          savedCardId: cardId,
          installments,
        })
        router.push(`/pontos/checkout/${res.purchaseId}`)
      } catch (err) {
        const m = err instanceof Error ? err.message : 'Falha ao iniciar pagamento.'
        setError(m)
      }
    })
  }

  return (
    <ScreenChrome>
      <TPCHeader
        back={<BackButton onClick={() => router.push('/pontos/comprar')} />}
        title="Pagar com cartão"
        subtitle={pacote.name}
        right={<PointsDisplay balance={saldo.available} compact />}
      />

      <main className="tpc-scroll flex-1 overflow-y-auto px-4 pb-6 pt-3.5">
        <OrderSummary pacote={pacote} />

        {savedCards.length > 0 && (
          <SavedCardsSection
            cards={savedCards}
            selectedId={selectedSavedId}
            onSelect={setSelectedSavedId}
            installments={installments}
            onInstallmentsChange={setInstallments}
            installmentsEnabled={installmentsEnabled}
            priceCents={pacote.priceCents}
            disabled={isPending}
            onPay={onPay1Click}
          />
        )}

        <NewCardForm
          pacote={pacote}
          installments={installments}
          onInstallmentsChange={setInstallments}
          installmentsEnabled={installmentsEnabled}
          onSubmitError={setError}
          onSubmitting={(value) => {
            // expose loading from form via setError null + onSubmit pattern
            if (value === false) return
          }}
        />

        {error && (
          <div className="mt-4 rounded-lg border border-tpc-red/40 bg-tpc-red/10 px-3 py-2 text-sm text-tpc-red">
            {error}
          </div>
        )}

        <div className="mt-4 flex items-center justify-center gap-2.5 font-mono text-[8.5px] uppercase tracking-[0.16em] text-tpc-text-tertiary">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-tpc-green">
            <rect x="4" y="11" width="16" height="11" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          <span>Transação segura · Mercado Pago</span>
        </div>
      </main>
    </ScreenChrome>
  )
}

function OrderSummary({ pacote }: { pacote: Pacote }) {
  const total = totalCreditedPoints(pacote)
  return (
    <Card elevated className="mb-3.5">
      <div className="tpc-eyebrow">Seu pacote</div>
      <div className="mt-1.5 text-lg font-bold tracking-tight">
        {pacote.name} · {formatPoints(pacote.points)} pts
      </div>
      {pacote.bonusPoints > 0 && (
        <div className="mt-1 flex items-center gap-2">
          <span className="rounded border border-tpc-green/30 bg-tpc-green/10 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-tpc-green">
            +{formatPoints(pacote.bonusPoints)} BÔNUS
          </span>
          <span className="text-xs text-tpc-text-secondary">
            = {formatPoints(total)} pts no total
          </span>
        </div>
      )}
      <div className="mt-3.5 flex items-baseline justify-between border-t border-tpc-border pt-3.5">
        <span className="text-sm text-tpc-text-secondary">Total a pagar</span>
        <span className="tpc-num text-2xl font-semibold tracking-tight">
          {formatBRL(pacote.priceCents)}
        </span>
      </div>
    </Card>
  )
}

function SavedCardsSection({
  cards,
  selectedId,
  onSelect,
  installments,
  onInstallmentsChange,
  installmentsEnabled,
  priceCents,
  disabled,
  onPay,
}: {
  cards: SavedCard[]
  selectedId: string | null
  onSelect: (id: string) => void
  installments: 1 | 2 | 3
  onInstallmentsChange: (n: 1 | 2 | 3) => void
  installmentsEnabled: boolean
  priceCents: number
  disabled: boolean
  onPay: (id: string) => void
}) {
  return (
    <div className="mb-5">
      <div className="tpc-eyebrow mb-2">Cartões salvos · 1-click</div>
      <div className="flex flex-col gap-2">
        {cards.map((c) => {
          const active = c.id === selectedId
          return (
            <button
              type="button"
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={cn(
                'flex items-center gap-3 rounded-xl border p-3 text-left transition',
                active
                  ? 'border-tpc-red bg-tpc-elevated shadow-[0_0_0_3px_rgba(225,38,28,0.12)]'
                  : 'border-tpc-border bg-tpc-surface hover:bg-tpc-elevated',
              )}
            >
              <BrandPill kind={brandToPill(c.brand)} />
              <div className="flex-1">
                <div className="text-sm font-semibold tracking-tight">Final {c.lastFour}</div>
                <div className="mt-0.5 font-mono text-[10px] tracking-wider text-tpc-text-tertiary">
                  {c.holderName.toUpperCase()} · VENC.{' '}
                  {c.expMonth.toString().padStart(2, '0')}/{(c.expYear % 100).toString().padStart(2, '0')}
                </div>
              </div>
              {c.isDefault && (
                <span className="rounded border border-tpc-border bg-tpc-elevated-2 px-2 py-0.5 font-mono text-[9px] tracking-wider text-tpc-text-secondary">
                  PADRÃO
                </span>
              )}
            </button>
          )
        })}
      </div>

      {installmentsEnabled && (
        <InstallmentSelector
          selected={installments}
          onChange={onInstallmentsChange}
          priceCents={priceCents}
          className="mt-3.5"
        />
      )}

      <button
        type="button"
        disabled={!selectedId || disabled}
        onClick={() => selectedId && onPay(selectedId)}
        className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl bg-tpc-red px-4 py-3.5 text-sm font-semibold tracking-tight text-tpc-text shadow-lg shadow-tpc-red/40 transition hover:bg-tpc-red-dark disabled:opacity-60"
      >
        {disabled ? 'Processando…' : `Pagar ${formatBRL(priceCents)} · 1-click`}
      </button>

      <div className="mt-5 flex items-center gap-2.5 text-xs text-tpc-text-secondary">
        <span className="h-px flex-1 bg-tpc-border" />
        ou paga com outro cartão
        <span className="h-px flex-1 bg-tpc-border" />
      </div>
    </div>
  )
}

function NewCardForm({
  pacote,
  installments,
  onInstallmentsChange,
  installmentsEnabled,
  onSubmitError,
  onSubmitting,
}: {
  pacote: Pacote
  installments: 1 | 2 | 3
  onInstallmentsChange: (n: 1 | 2 | 3) => void
  installmentsEnabled: boolean
  onSubmitError: (m: string | null) => void
  onSubmitting: (v: boolean) => void
}) {
  const router = useRouter()
  const api = useApi()

  const [number, setNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [holder, setHolder] = useState('')
  const [saveCard, setSaveCard] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const brand = useMemo(() => detectBrand(number), [number])
  const digits = number.replace(/\D/g, '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    onSubmitError(null)
    setSubmitting(true)
    onSubmitting(true)
    try {
      const [mmRaw, yyRaw] = expiry.split('/')
      const expMonth = Number(mmRaw)
      const expYear = 2000 + Number(yyRaw)
      if (!expMonth || expMonth < 1 || expMonth > 12) {
        throw new Error('Validade inválida')
      }
      if (!expYear || expYear < new Date().getFullYear()) {
        throw new Error('Cartão expirado')
      }
      if (holder.trim().length < 2) {
        throw new Error('Informa o nome do titular')
      }

      const tok = await tokenizeCard({
        cardNumber: digits,
        expMonth,
        expYear,
        cvv,
        holderName: holder.trim(),
      })

      const res = await api.post<CheckoutResponse>('/checkout', {
        packageId: pacote.id,
        method: 'card',
        cardToken: tok.token,
        installments,
        saveCard,
        card: saveCard
          ? {
              brand: tok.brand,
              lastFour: tok.lastFour,
              holderName: holder.trim(),
              expMonth,
              expYear,
            }
          : undefined,
      })

      router.push(`/pontos/checkout/${res.purchaseId}`)
    } catch (err) {
      const m = err instanceof Error ? err.message : 'Falha ao validar cartão'
      onSubmitError(m)
    } finally {
      setSubmitting(false)
      onSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      <FormField
        label="Número do cartão"
        value={formatCardNumber(number)}
        onChange={(v) => setNumber(v)}
        inputMode="numeric"
        autoComplete="cc-number"
        placeholder="4242 4242 4242 4242"
        trailing={digits.length >= 6 ? <BrandPill kind={brandToPill(brand)} /> : null}
      />

      <div className="grid grid-cols-2 gap-2.5">
        <FormField
          label="Validade"
          value={formatExpiry(expiry)}
          onChange={(v) => setExpiry(v)}
          inputMode="numeric"
          autoComplete="cc-exp"
          placeholder="MM/AA"
        />
        <FormField
          label="CVV"
          value={cvv}
          onChange={(v) => setCvv(v.replace(/\D/g, '').slice(0, 4))}
          inputMode="numeric"
          autoComplete="cc-csc"
          placeholder="•••"
        />
      </div>

      <FormField
        label="Nome no cartão"
        value={holder}
        onChange={(v) => setHolder(v.toUpperCase())}
        autoComplete="cc-name"
        placeholder="COMO ESTÁ NO CARTÃO"
      />

      {installmentsEnabled && (
        <InstallmentSelector
          selected={installments}
          onChange={onInstallmentsChange}
          priceCents={pacote.priceCents}
        />
      )}

      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-tpc-border bg-tpc-surface px-3 py-3">
        <input
          type="checkbox"
          checked={saveCard}
          onChange={(e) => setSaveCard(e.target.checked)}
          className="sr-only"
        />
        <span
          className={cn(
            'flex h-5 w-5 items-center justify-center rounded',
            saveCard ? 'bg-tpc-red' : 'border border-tpc-border-strong bg-transparent',
          )}
        >
          {saveCard && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12l5 5L20 7" />
            </svg>
          )}
        </span>
        <span className="text-sm">Salvar cartão pra próxima compra</span>
      </label>

      <button
        type="submit"
        disabled={submitting}
        className="flex items-center justify-center gap-2 rounded-xl bg-tpc-red px-4 py-3.5 text-sm font-semibold tracking-tight text-tpc-text shadow-lg shadow-tpc-red/40 transition hover:bg-tpc-red-dark disabled:opacity-60"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        {submitting
          ? 'Validando…'
          : `Finalizar pagamento · ${formatBRL(pacote.priceCents)}`}
      </button>
    </form>
  )
}

function FormField({
  label,
  value,
  onChange,
  inputMode,
  autoComplete,
  placeholder,
  trailing,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  autoComplete?: string
  placeholder?: string
  trailing?: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="tpc-eyebrow mb-1.5 block">{label}</span>
      <div className="relative flex items-center rounded-xl border border-tpc-border bg-tpc-surface focus-within:border-tpc-red focus-within:ring-2 focus-within:ring-tpc-red/30">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode={inputMode}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="w-full bg-transparent px-3.5 py-3 font-mono text-sm tracking-wide outline-none placeholder:text-tpc-text-tertiary"
        />
        {trailing && <div className="pr-3">{trailing}</div>}
      </div>
    </label>
  )
}

function InstallmentSelector({
  selected,
  onChange,
  priceCents,
  className,
}: {
  selected: 1 | 2 | 3
  onChange: (n: 1 | 2 | 3) => void
  priceCents: number
  className?: string
}) {
  const opts: Array<1 | 2 | 3> = [1, 2, 3]
  return (
    <div className={className}>
      <div className="tpc-eyebrow mb-2">Parcelamento</div>
      <div className="grid grid-cols-3 gap-2">
        {opts.map((n) => {
          const value = installmentValueCents(priceCents, n)
          const active = n === selected
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={cn(
                'rounded-xl border px-2 py-2.5 text-center transition',
                active
                  ? 'border-tpc-red bg-tpc-elevated shadow-[0_0_0_3px_rgba(225,38,28,0.15)]'
                  : 'border-tpc-border bg-tpc-elevated-2',
              )}
            >
              <div className="text-sm font-semibold leading-none">
                {n}x{' '}
                <span className="text-xs font-medium text-tpc-text-secondary">
                  {formatBRL(value)}
                </span>
              </div>
              <div
                className={cn(
                  'mt-1 font-mono text-[8px] tracking-[0.1em]',
                  active ? 'text-tpc-green' : 'text-tpc-text-tertiary',
                )}
              >
                {n === 1 ? 'À VISTA' : 'SEM JUROS'}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
