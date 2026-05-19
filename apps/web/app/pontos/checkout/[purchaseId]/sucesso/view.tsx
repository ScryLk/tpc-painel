'use client'

import Link from 'next/link'

import { formatBRL, formatPoints } from '@tpc/lib/formatters'
import { Button, ScreenChrome } from '@tpc/ui'

interface Purchase {
  id: string
  method: 'PIX' | 'CREDIT_CARD'
  amountCents: number
  pointsCredited: number
  package: { tier: string; name: string; points: number; bonusPoints: number }
}

interface Saldo {
  available: number
  reserved: number
  total: number
}

interface Props {
  purchase: Purchase
  saldo: Saldo
}

const methodLabel = (m: Purchase['method']): string => (m === 'PIX' ? 'Pix' : 'Cartão')

export const SucessoView = ({ purchase, saldo }: Props) => {
  const { pointsCredited, package: pkg } = purchase
  const newBalance = saldo.available

  return (
    <ScreenChrome>
      <main className="relative flex flex-1 flex-col overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[10%] h-[400px] w-[400px] -translate-x-1/2 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(225,38,28,0.2) 0%, transparent 60%)',
          }}
        />

        <div className="relative flex flex-1 flex-col items-center justify-center px-8 text-center">
          <div className="relative mb-5 h-44 w-44">
            <svg viewBox="0 0 200 200" className="h-full w-full">
              <circle cx="100" cy="100" r="80" fill="none" stroke="#1a1a1a" strokeWidth="14" />
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="#e1261c"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 80}`}
                strokeDashoffset={`${2 * Math.PI * 80 * 0.05}`}
                transform="rotate(-90 100 100)"
                style={{ filter: 'drop-shadow(0 0 8px #e1261c)' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="tpc-num text-5xl font-semibold leading-none tracking-[-0.06em]">
                +{formatPoints(pointsCredited)}
              </div>
              <div className="mt-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-tpc-red">
                pontos
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-bold leading-tight tracking-tight">Pontos creditados!</h1>
          <p className="mt-1.5 max-w-xs text-sm text-tpc-text-secondary">
            Saldo agora ·{' '}
            <span className="tpc-num font-semibold text-tpc-text">
              {formatPoints(newBalance)} pontos
            </span>
          </p>

          <div className="mt-5 inline-flex items-center gap-3 rounded-lg border border-tpc-border bg-tpc-surface px-3.5 py-2.5 font-mono text-[10px] uppercase tracking-[0.06em] text-tpc-text-secondary">
            <span>
              <span className="font-semibold text-tpc-text">{pkg.name}</span> ·{' '}
              {formatPoints(pkg.points)}
              {pkg.bonusPoints > 0 && `+${formatPoints(pkg.bonusPoints)}`} pts
            </span>
            <span className="text-tpc-text-tertiary">·</span>
            <span>{formatBRL(purchase.amountCents)}</span>
            <span className="text-tpc-text-tertiary">·</span>
            <span>{methodLabel(purchase.method)}</span>
          </div>

          <div className="mt-3 inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-tpc-text-tertiary">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-tpc-green">
              <path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 8.4 8.4 0 0 1-3.7-.8L3 21l1.5-4.7A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z" />
            </svg>
            <span>Confirmação enviada no WhatsApp (em breve)</span>
          </div>
        </div>

        <div className="relative flex flex-col gap-2.5 px-6 pb-6">
          <Link href="/dashboard" className="w-full">
            <Button fullWidth>Solicitar serviço agora</Button>
          </Link>
          <div className="flex gap-2.5">
            <Link href="/dashboard" className="flex-1">
              <Button variant="secondary" fullWidth>
                Voltar pro painel
              </Button>
            </Link>
            <Link href={`/pontos/checkout/${purchase.id}/comprovante`} className="flex-1">
              <Button variant="secondary" fullWidth>
                Comprovante
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </ScreenChrome>
  )
}
