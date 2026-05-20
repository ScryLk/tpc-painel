'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { useApi } from '@/lib/api/client'
import { formatBRL, formatCountdown, formatPoints } from '@tpc/lib/formatters'
import { Card, cn } from '@tpc/ui'

import { ClientShell } from '@/components/layout/ClientShell'

interface Purchase {
  id: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED'
  method: 'PIX' | 'CREDIT_CARD'
  amountCents: number
  installments: number
  pointsCredited: number
  qrCode: string | null
  qrCodeBase64: string | null
  checkoutUrl: string | null
  mpExpiresAt: string | null
  package: { tier: string; name: string; points: number; bonusPoints: number }
}

interface Props {
  purchase: Purchase
}

const POLL_INTERVAL_MS = 4000

export const CheckoutView = ({ purchase }: Props) => {
  const router = useRouter()
  const api = useApi()
  const [status, setStatus] = useState(purchase.status)

  // Polling pra detectar webhook do MP. Reload da página quando aprovar.
  useEffect(() => {
    if (status !== 'PENDING') return
    const id = setInterval(async () => {
      try {
        const updated = await api.get<{ status: Purchase['status'] }>(
          `/purchases/${purchase.id}`,
        )
        if (updated.status !== 'PENDING') {
          setStatus(updated.status)
          if (updated.status === 'APPROVED') {
            router.push(`/pontos/checkout/${purchase.id}/sucesso`)
          }
        }
      } catch {
        /* polling falha não bloqueia UX */
      }
    }, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [status, purchase.id, api, router])

  return (
    <ClientShell breadcrumbs={['Pontos', 'Checkout']}>
      <div className="mx-auto max-w-[1280px] px-6 py-7 md:px-10">
        <div className="mb-6">
          <h1 className="text-[26px] font-bold leading-tight tracking-[-0.03em] text-tpc-text">
            Confirmar compra
          </h1>
          <p className="mt-1 text-[13px] text-tpc-text-secondary">
            {purchase.method === 'PIX'
              ? 'Use o Pix abaixo. Pontos caem em segundos depois da confirmação.'
              : 'Estamos confirmando o cartão com o Mercado Pago.'}
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0">
            {purchase.method === 'PIX' ? (
              <PixView purchase={purchase} />
            ) : (
              <CardView purchase={purchase} />
            )}

            <div className="mt-4 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-tpc-text-tertiary">
              <svg
                width="10"
                height="10"
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
              <span>Pagamento protegido por Mercado Pago</span>
            </div>
          </div>

          <aside className="lg:sticky lg:top-4 lg:self-start">
            <OrderSummary purchase={purchase} />
          </aside>
        </div>
      </div>
    </ClientShell>
  )
}

function OrderSummary({ purchase }: { purchase: Purchase }) {
  const { name, points, bonusPoints } = purchase.package
  const total = points + bonusPoints

  return (
    <Card elevated>
      <div className="tpc-eyebrow">Seu pacote</div>
      <div className="mt-1.5 text-lg font-bold tracking-tight">{name}</div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="tpc-num text-[36px] font-semibold leading-none tracking-tight text-tpc-text">
          {formatPoints(total)}
        </span>
        <span className="text-xs text-tpc-text-secondary">pts totais</span>
      </div>
      {bonusPoints > 0 && (
        <div className="mt-1.5 font-mono text-[11px] text-tpc-green">
          {formatPoints(points)} +{formatPoints(bonusPoints)} bônus
        </div>
      )}
      <div className="mt-4 flex items-baseline justify-between border-t border-tpc-border pt-4">
        <span className="text-sm text-tpc-text-secondary">Total a pagar</span>
        <span className="tpc-num text-2xl font-semibold tracking-tight">
          {formatBRL(purchase.amountCents)}
        </span>
      </div>
      {purchase.installments > 1 && (
        <div className="mt-2 text-right font-mono text-[10px] text-tpc-text-tertiary">
          {purchase.installments}x de{' '}
          {formatBRL(Math.round(purchase.amountCents / purchase.installments))}
        </div>
      )}
    </Card>
  )
}

function PixView({ purchase }: { purchase: Purchase }) {
  const [copied, setCopied] = useState(false)
  const expiresAt = purchase.mpExpiresAt ? new Date(purchase.mpExpiresAt) : null

  const handleCopy = async () => {
    if (!purchase.qrCode) return
    try {
      await navigator.clipboard.writeText(purchase.qrCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  if (!purchase.qrCode) {
    return (
      <Card elevated>
        <p className="text-sm text-tpc-text-secondary">
          Gerando código Pix… Tenta de novo em alguns segundos.
        </p>
      </Card>
    )
  }

  return (
    <Card elevated>
      <div className="tpc-eyebrow mb-2">Código Pix copia e cola</div>
      <div className="mb-2.5 flex items-center gap-2.5 rounded-lg border border-tpc-border bg-tpc-elevated-2 px-3.5 py-3 font-mono text-[10px] text-tpc-text-secondary">
        <span className="truncate">{purchase.qrCode}</span>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-tpc-red px-4 py-3.5 text-sm font-semibold tracking-tight text-tpc-text shadow-lg shadow-tpc-red/40 transition hover:bg-tpc-red-dark"
      >
        {copied ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12l5 5L20 7" />
            </svg>
            Código copiado
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copiar código Pix
          </>
        )}
      </button>

      <div className="mt-3 rounded-lg border border-tpc-border bg-tpc-bg px-3 py-2.5">
        <div className="tpc-eyebrow mb-1.5">Como pagar</div>
        {[
          'Abra o app do seu banco',
          'Vá em Pix → Copia e cola',
          'Cole o código, confirme valor',
          'Pronto. Pontos caem em segundos',
        ].map((step, i) => (
          <div key={i} className="flex items-center gap-2 py-0.5 text-xs text-tpc-text-secondary">
            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-tpc-red/40 bg-tpc-red/15 font-mono text-[9px] font-semibold text-tpc-red">
              {i + 1}
            </span>
            {step}
          </div>
        ))}
      </div>

      {expiresAt && <ExpiryTimer expiresAt={expiresAt} />}

      {purchase.qrCodeBase64 && (
        <div className="mt-4 border-t border-tpc-border pt-3.5">
          <div className="tpc-eyebrow mb-2.5 text-center">Escaneie o QR code</div>
          <div className="flex justify-center">
            {purchase.qrCodeBase64.startsWith('data:image') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={purchase.qrCodeBase64} alt="QR Code Pix" width={140} height={140} />
            ) : (
              <div className="flex h-[140px] w-[140px] items-center justify-center rounded-lg border border-tpc-border bg-tpc-elevated-2 font-mono text-[10px] text-tpc-text-tertiary">
                QR mock
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

function ExpiryTimer({ expiresAt }: { expiresAt: Date }) {
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    const update = () =>
      setRemaining(Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  if (remaining === null) return null

  const expired = remaining <= 0
  return (
    <div
      className={cn(
        'mt-3 flex items-center justify-center gap-2 rounded-full border px-3.5 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em]',
        expired
          ? 'border-tpc-text-tertiary/30 bg-tpc-elevated-2 text-tpc-text-tertiary'
          : 'border-tpc-red/30 bg-[#1a0a08] text-tpc-red',
      )}
    >
      <span
        className={cn(
          'inline-block h-1.5 w-1.5 rounded-full',
          expired ? 'bg-tpc-text-tertiary' : 'bg-tpc-red shadow-[0_0_6px_currentColor]',
        )}
      />
      {expired ? 'Código expirado' : <>QR válido por <span className="tpc-num">{formatCountdown(remaining)}</span></>}
    </div>
  )
}

function CardView({ purchase }: { purchase: Purchase }) {
  return (
    <Card elevated>
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inset-0 animate-[tpc-pulse_1.8s_ease-in-out_infinite] rounded-full bg-tpc-yellow opacity-70" />
          <span className="relative h-2.5 w-2.5 rounded-full bg-tpc-yellow" />
        </span>
        <div className="tpc-eyebrow !text-tpc-yellow">Processando pagamento</div>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-tpc-text-secondary">
        Estamos confirmando o cartão com o Mercado Pago. Assim que aprovado, os pontos
        caem automaticamente.{' '}
        {purchase.installments > 1 && (
          <>
            Parcelamento: {purchase.installments}x de{' '}
            <span className="text-tpc-text">{formatBRL(Math.round(purchase.amountCents / purchase.installments))}</span> sem juros.
          </>
        )}
      </p>

      {purchase.checkoutUrl && (
        <a
          href={purchase.checkoutUrl}
          target="_blank"
          rel="noopener"
          className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-tpc-border bg-tpc-elevated-2 px-4 py-3 text-sm font-medium text-tpc-text-secondary transition hover:bg-tpc-elevated"
        >
          Abrir Mercado Pago em nova aba
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h6v6M10 14L21 3M21 14v7H3V3h7" />
          </svg>
        </a>
      )}
    </Card>
  )
}
