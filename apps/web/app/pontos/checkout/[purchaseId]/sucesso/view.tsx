'use client'

import Link from 'next/link'

import { formatBRL, formatPoints } from '@tpc/lib/formatters'
import { Button } from '@tpc/ui'

import { ClientShell } from '@/components/layout/ClientShell'

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
    <ClientShell
      breadcrumbs={['Pontos', 'Sucesso']}
      saldoAvailable={saldo.available}
    >
      <div className="relative mx-auto flex min-h-full max-w-[820px] flex-col items-center justify-center px-6 py-10 text-center md:px-10">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[5%] h-[500px] w-[500px] -translate-x-1/2 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(225,38,28,0.18) 0%, transparent 60%)',
          }}
        />

        <div className="relative mb-6 h-52 w-52">
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

        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.03em] text-tpc-text">
          Pontos creditados!
        </h1>
        <p className="mt-2 max-w-md text-sm text-tpc-text-secondary">
          Saldo agora ·{' '}
          <span className="tpc-num font-semibold text-tpc-text">
            {formatPoints(newBalance)} pontos
          </span>
        </p>

        <div className="mt-5 inline-flex flex-wrap items-center justify-center gap-3 rounded-lg border border-tpc-border bg-tpc-surface px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.06em] text-tpc-text-secondary">
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
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-tpc-green"
            aria-hidden
          >
            <path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 8.4 8.4 0 0 1-3.7-.8L3 21l1.5-4.7A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z" />
          </svg>
          <span>Confirmação enviada no WhatsApp (em breve)</span>
        </div>

        <div className="relative mt-8 flex w-full max-w-md flex-col gap-2.5">
          <Link href="/catalogo/presencial" className="block">
            <Button fullWidth>Solicitar serviço agora</Button>
          </Link>
          <div className="flex gap-2.5">
            <Link href="/dashboard" className="flex-1">
              <Button variant="secondary" fullWidth>
                Voltar pro painel
              </Button>
            </Link>
            <Link href="/historico" className="flex-1">
              <Button variant="secondary" fullWidth>
                Ver histórico
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </ClientShell>
  )
}
