'use client'

import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { formatBRL, formatDateTimeBR, formatPoints } from '@tpc/lib/formatters'
import {
  Card,
  DiagonalStripes,
  FuelBar,
  PointsDisplay,
  ScreenChrome,
  SecHeading,
  cn,
} from '@tpc/ui'

interface Saldo {
  available: number
  reserved: number
  total: number
}

interface AtividadeItem {
  id: string
  type: 'CREDIT' | 'DEBIT' | 'RESERVE' | 'UNRESERVE'
  amount: number
  balanceAfter: number
  title: string
  subtitle: string
  createdAt: string
}

interface Props {
  firstName: string
  avatar: string
  saldo: Saldo
  atividade: AtividadeItem[]
}

// Custo médio de pacote pra estimar R$ equivalente. Usa o preço/pt do tier
// Pro (R$ 0,85/pt incluindo bônus) como aproximação visual.
const APPROX_PRICE_PER_POINT_CENTS = 85

const VIP_TOTAL_POINTS = 2400

export const DashboardView = ({ firstName, avatar, saldo, atividade }: Props) => {
  const equivCents = saldo.available * APPROX_PRICE_PER_POINT_CENTS
  const gaugePct = Math.min(saldo.available / VIP_TOTAL_POINTS, 1)

  return (
    <ScreenChrome>
      <header className="flex items-center gap-3 border-b border-tpc-border bg-tpc-bg px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-tpc-border bg-tpc-elevated font-mono text-xs font-semibold text-tpc-text">
          {avatar}
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold tracking-tight">
            Olá, {firstName.split(' ')[0]}
          </div>
          <div className="text-[11px] text-tpc-text-secondary">bem-vindo de volta</div>
        </div>
        <PointsDisplay balance={saldo.available} />
        <UserButton afterSignOutUrl="/" />
      </header>

      <main className="tpc-scroll flex-1 overflow-y-auto pb-6">
        <section className="px-4 pt-4">
          <Card elevated className="relative overflow-hidden p-5">
            <div className="pointer-events-none absolute right-0 top-0 opacity-45">
              <DiagonalStripes width={120} height={120} thickness={1.5} spacing={9} />
            </div>
            <div className="relative flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="relative inline-flex h-2 w-2">
                    <span className="absolute inset-0 animate-[tpc-pulse_1.8s_ease-in-out_infinite] rounded-full bg-tpc-red" />
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-tpc-text-tertiary">
                    Extrato
                  </span>
                </div>
                <div className="text-base font-semibold tracking-tight">
                  ≈ {formatBRL(equivCents)} em serviços
                </div>
                <div className="mt-0.5 text-[11px] text-tpc-text-secondary">
                  {saldo.available > 0
                    ? `${formatPoints(saldo.available)} pontos disponíveis`
                    : 'Carrega pontos pra desbloquear o catálogo'}
                </div>
              </div>
              <Link
                href="/historico"
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-tpc-border px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-tpc-text-secondary transition hover:bg-tpc-elevated-2"
              >
                Detalhes
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
            <div className="mt-3.5">
              <FuelBar pct={gaugePct} />
            </div>
            {saldo.reserved > 0 && (
              <div className="mt-3 flex items-center gap-2 text-[11px] text-tpc-text-secondary">
                <span className="h-1.5 w-1.5 rounded-full bg-tpc-yellow" />
                <span>{formatPoints(saldo.reserved)} pts reservados em pedidos pendentes</span>
              </div>
            )}
          </Card>
        </section>

        <SecHeading>Atalhos</SecHeading>
        <div className="grid grid-cols-2 gap-2.5 px-4">
          <Shortcut
            href="/pontos/comprar"
            title="Carregar pontos"
            subtitle="Pix ou cartão · até 3x"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
              </svg>
            }
          />
          <Shortcut
            href="/catalogo/presencial"
            title="Solicitar serviço"
            subtitle="Stage 1, Pop & Bang, DPF"
            disabled
            badge="Sprint 2"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 1 0 1.4l-1.3 1.3a1 1 0 0 0 0 1.4l1.3 1.3a1 1 0 0 1 0 1.4l-2.6 2.6a1 1 0 0 1-1.4 0l-1.3-1.3a1 1 0 0 0-1.4 0l-1.3 1.3a1 1 0 0 1-1.4 0L3 12.9a1 1 0 0 1 0-1.4l5.6-5.6a1 1 0 0 1 1.4 0z" />
              </svg>
            }
          />
          <Shortcut
            href="/historico"
            title="Histórico"
            subtitle="Compras + serviços"
            disabled
            badge="Sprint 4"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <path d="M3 4v5h5" />
                <path d="M12 8v5l3 2" />
              </svg>
            }
          />
          <Shortcut
            href="/perfil"
            title="Perfil & LGPD"
            subtitle="Dados, consentimento"
            disabled
            badge="Sprint 4"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M3 21c1-4 4-6 9-6s8 2 9 6" />
              </svg>
            }
          />
        </div>

        <SecHeading>Meus carros</SecHeading>
        <div className="px-4">
          <Card className="flex flex-col items-start gap-2 border-dashed">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-tpc-border-strong bg-tpc-elevated-2 text-tpc-red">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">
                Ainda não tem carro cadastrado
              </div>
              <div className="text-[11px] text-tpc-text-tertiary">
                Garagem chega na Sprint 2. Por enquanto cadastra teu carro com o tuner por
                WhatsApp.
              </div>
            </div>
          </Card>
        </div>

        <SecHeading
          action={
            <Link
              href="/historico"
              className="text-[11px] text-tpc-text-secondary transition hover:text-tpc-text"
            >
              Ver tudo →
            </Link>
          }
        >
          Atividade recente
        </SecHeading>
        <div className="relative px-6 pb-2">
          {atividade.length === 0 ? (
            <p className="text-sm text-tpc-text-tertiary">
              Nenhuma atividade ainda. Tua próxima compra de pontos aparece aqui.
            </p>
          ) : (
            <>
              <span
                aria-hidden
                className="absolute bottom-3 left-[28px] top-3 w-px bg-tpc-border"
              />
              {atividade.map((item, i) => (
                <Timeline
                  key={item.id}
                  item={item}
                  last={i === atividade.length - 1}
                />
              ))}
            </>
          )}
        </div>
      </main>
    </ScreenChrome>
  )
}

interface ShortcutProps {
  href: string
  title: string
  subtitle: string
  icon: ReactNode
  disabled?: boolean
  badge?: string
}

function Shortcut({ href, title, subtitle, icon, disabled, badge }: ShortcutProps) {
  const inner = (
    <div
      className={cn(
        'flex h-full flex-col gap-3 rounded-2xl border bg-tpc-surface p-3.5 transition',
        disabled
          ? 'border-tpc-border opacity-60'
          : 'border-tpc-border hover:bg-tpc-elevated',
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-tpc-red/25 bg-tpc-red/10 text-tpc-red">
          {icon}
        </div>
        {badge && (
          <span className="rounded border border-tpc-border bg-tpc-elevated-2 px-1.5 py-0.5 font-mono text-[8px] font-medium uppercase tracking-[0.12em] text-tpc-text-tertiary">
            {badge}
          </span>
        )}
      </div>
      <div>
        <div className="text-sm font-semibold tracking-tight">{title}</div>
        <div className="mt-0.5 text-[11px] leading-tight text-tpc-text-tertiary">
          {subtitle}
        </div>
      </div>
    </div>
  )

  if (disabled) {
    return (
      <div role="link" aria-disabled className="cursor-not-allowed">
        {inner}
      </div>
    )
  }
  return <Link href={href}>{inner}</Link>
}

function Timeline({ item, last }: { item: AtividadeItem; last: boolean }) {
  const iconBg =
    item.type === 'CREDIT'
      ? 'bg-tpc-red'
      : item.type === 'DEBIT'
        ? 'bg-tpc-green'
        : 'bg-tpc-text-tertiary'
  const valuePrefix =
    item.type === 'CREDIT' ? '+' : item.type === 'DEBIT' ? '-' : item.type === 'RESERVE' ? '·' : '↻'
  const valueColor =
    item.type === 'CREDIT'
      ? 'text-tpc-green'
      : item.type === 'DEBIT'
        ? 'text-tpc-text-secondary'
        : 'text-tpc-text-tertiary'

  return (
    <div className={cn('flex gap-3.5 py-3', last ? '' : 'border-b border-transparent')}>
      <div
        className={cn(
          'relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-tpc-text shadow-[0_0_0_3px_var(--color-tpc-bg)]',
          iconBg,
        )}
      >
        {item.type === 'CREDIT' && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        )}
        {item.type === 'DEBIT' && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12l5 5L20 7" />
          </svg>
        )}
        {(item.type === 'RESERVE' || item.type === 'UNRESERVE') && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        )}
      </div>
      <div className="flex-1 pt-0.5">
        <div className="text-sm font-semibold tracking-tight">{item.title}</div>
        <div className="text-[11px] text-tpc-text-secondary">
          {item.subtitle ? `${item.subtitle} · ` : ''}
          {formatDateTimeBR(item.createdAt)}
        </div>
      </div>
      <div className={cn('shrink-0 pt-1 font-mono text-xs font-medium', valueColor)}>
        {valuePrefix}
        {formatPoints(item.amount)}
      </div>
    </div>
  )
}
