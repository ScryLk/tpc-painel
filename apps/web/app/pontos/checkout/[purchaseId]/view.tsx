'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { useApi } from '@/lib/api/client'
import { formatBRL, formatCountdown, formatPoints } from '@tpc/lib/formatters'
import {
  BackButton,
  BrandPill,
  Card,
  ScreenChrome,
  TPCHeader,
  cn,
} from '@tpc/ui'

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
    <ScreenChrome>
      <TPCHeader
        back={<BackButton onClick={() => router.push('/pontos/comprar')} />}
        title="Confirmar compra"
        subtitle={purchase.method === 'PIX' ? 'Pague com Pix' : 'Pague no cartão'}
      />

      <main className="tpc-scroll flex-1 overflow-y-auto px-4 pb-6 pt-3.5">
        <OrderSummary purchase={purchase} />

        {purchase.method === 'PIX' ? (
          <PixView purchase={purchase} />
        ) : (
          <CardView purchase={purchase} />
        )}

        <div className="mt-4 flex items-center justify-center gap-2.5 font-mono text-[8.5px] uppercase tracking-[0.16em] text-tpc-text-tertiary">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-tpc-green">
            <rect x="4" y="11" width="16" height="11" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          <span>Pagamento protegido por Mercado Pago</span>
        </div>
      </main>
    </ScreenChrome>
  )
}

function OrderSummary({ purchase }: { purchase: Purchase }) {
  const { name, points, bonusPoints } = purchase.package
  const total = points + bonusPoints

  return (
    <Card elevated className="mb-3.5">
      <div className="tpc-eyebrow">Seu pacote</div>
      <div className="mt-1.5 text-lg font-bold tracking-tight">
        {name} · {formatPoints(points)} pts
      </div>
      {bonusPoints > 0 && (
        <div className="mt-1 flex items-center gap-2">
          <span className="rounded border border-tpc-green/30 bg-tpc-green/10 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-tpc-green">
            +{formatPoints(bonusPoints)} BÔNUS
          </span>
          <span className="text-xs text-tpc-text-secondary">
            = {formatPoints(total)} pts no total
          </span>
        </div>
      )}
      <div className="mt-3.5 flex items-baseline justify-between border-t border-tpc-border pt-3.5">
        <span className="text-sm text-tpc-text-secondary">Total a pagar</span>
        <span className="tpc-num text-2xl font-semibold tracking-tight">
          {formatBRL(purchase.amountCents)}
        </span>
      </div>
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
          <div className="tpc-eyebrow mb-2.5 text-center">Ou escaneie com outro celular</div>
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
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
  )

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)))
    }, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

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
      <div className="tpc-eyebrow mb-2">Pagamento por cartão</div>
      <p className="text-sm text-tpc-text-secondary">
        Em modo desenvolvimento o pagamento por cartão redireciona pra um checkout simulado do
        Mercado Pago. Em produção esta tela vira o formulário com detecção de bandeira e
        parcelamento (próximo PR).
      </p>

      <div className="mt-3 flex items-center gap-2">
        <BrandPill kind="visa" />
        <BrandPill kind="master" />
        <BrandPill kind="elo" />
      </div>

      {purchase.checkoutUrl ? (
        <a
          href={purchase.checkoutUrl}
          target="_blank"
          rel="noopener"
          className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-tpc-red px-4 py-3.5 text-sm font-semibold tracking-tight text-tpc-text shadow-lg shadow-tpc-red/40 transition hover:bg-tpc-red-dark"
        >
          Pagar {formatBRL(purchase.amountCents)}
          {purchase.installments > 1 && (
            <span className="font-mono text-[10px] text-tpc-text/80">
              ({purchase.installments}x sem juros)
            </span>
          )}
        </a>
      ) : (
        <p className="mt-4 text-sm text-tpc-text-tertiary">
          URL de checkout indisponível. Tenta voltar e gerar de novo.
        </p>
      )}
    </Card>
  )
}
