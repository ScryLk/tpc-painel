'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

import { formatBRL, formatDateTimeBR, formatPoints } from '@tpc/lib/formatters'
import { Card, DiagonalStripes, SecHeading, cn } from '@tpc/ui'

import { ClientShell } from '@/components/layout/ClientShell'

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

const APPROX_PRICE_PER_POINT_CENTS = 85

export const DashboardView = ({ firstName, avatar, saldo, atividade }: Props) => {
  const greeting = getGreeting()
  const pendingCount = atividade.filter((a) => a.type === 'RESERVE').length

  return (
    <ClientShell
      breadcrumbs={['Painel']}
      saldoAvailable={saldo.available}
      user={{ firstName: firstName.split(' ')[0], initials: avatar }}
    >
      <div className="mx-auto max-w-[1280px] px-6 py-5 md:px-10">
        <div className="mb-4">
          <h1 className="text-[22px] font-bold leading-tight tracking-tight text-tpc-text">
            {greeting}, {firstName.split(' ')[0]}
          </h1>
          <p className="mt-0.5 text-[13px] tracking-tight text-tpc-text-secondary">
            {pendingCount > 0
              ? `Tu tem ${pendingCount} pedido${pendingCount > 1 ? 's' : ''} em andamento e ${formatPoints(saldo.available)} pts disponíveis.`
              : `Tu tem ${formatPoints(saldo.available)} pts disponíveis pra usar.`}
          </p>
        </div>

        <div className="mb-3 grid gap-3 md:grid-cols-[1.4fr_1fr]">
          <SaldoHeroCard saldo={saldo} />
          <ProximoServicoCard />
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2.5 md:grid-cols-4">
          <StatCard
            label="Saldo equivalente"
            value={formatBRL(saldo.available * APPROX_PRICE_PER_POINT_CENTS)}
            sub="em serviços"
            color="green"
          />
          <StatCard
            label="Pontos reservados"
            value={formatPoints(saldo.reserved)}
            sub="em pedidos pendentes"
            color={saldo.reserved > 0 ? 'yellow' : 'default'}
          />
          <StatCard
            label="Atividade"
            value={String(atividade.length)}
            sub="últimas movimentações"
          />
          <StatCard
            label="Carros cadastrados"
            value="0"
            sub="até 3 por conta"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <SecHeading className="px-0 pb-2 pt-0">Atalhos</SecHeading>
            <div className="grid grid-cols-2 gap-2.5">
              <ShortcutCard
                href="/pontos/comprar"
                icon="bolt"
                label="Carregar pontos"
                sub="Pix ou cartão · até 3x"
                color="red"
              />
              <ShortcutCard
                href="/catalogo/presencial"
                icon="wrench"
                label="Solicitar serviço"
                sub="Stage 1, Pop & Bang, DPF"
                color="green"
              />
              <ShortcutCard
                href="/garagem/adicionar"
                icon="plus"
                label="Adicionar carro"
                sub="até 3 carros por conta"
                color="red"
              />
              <ShortcutCard
                href="/historico"
                icon="history"
                label="Histórico"
                sub="compras + serviços"
                color="red"
                disabled
              />
            </div>
          </div>

          <div>
            <SecHeading
              className="px-0 pb-2 pt-0"
              action={
                <Link
                  href="/historico"
                  className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-tpc-red"
                >
                  Ver tudo →
                </Link>
              }
            >
              Última atividade
            </SecHeading>
            <Card className="overflow-hidden p-0">
              {atividade.length === 0 ? (
                <p className="p-5 text-sm text-tpc-text-tertiary">
                  Nenhuma atividade ainda. Tua próxima compra de pontos aparece aqui.
                </p>
              ) : (
                atividade.map((item, i) => (
                  <ActivityRow
                    key={item.id}
                    item={item}
                    last={i === atividade.length - 1}
                  />
                ))
              )}
            </Card>
          </div>
        </div>
      </div>
    </ClientShell>
  )
}

const SaldoHeroCard = ({ saldo }: { saldo: Saldo }) => {
  return (
    <Card className="relative overflow-hidden p-5">
      <div className="pointer-events-none absolute right-0 top-0 opacity-50">
        <DiagonalStripes
          width={300}
          height={200}
          thickness={1.5}
          spacing={11}
          mask="top-right"
        />
      </div>
      <div className="relative">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-tpc-text-tertiary">
          Seu saldo
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="tpc-num text-[44px] font-bold leading-none tracking-[-0.05em] text-tpc-text">
            {formatPoints(saldo.available + saldo.reserved)}
          </span>
          <span className="text-base font-medium text-tpc-text-secondary">pontos</span>
        </div>

        <div className="mt-3 flex gap-5 border-t border-tpc-border pt-3">
          <div>
            <div className="font-mono text-[8px] uppercase tracking-[0.16em] text-tpc-text-tertiary">
              Disponível
            </div>
            <div className="tpc-num mt-0.5 text-[18px] font-semibold tracking-[-0.03em] text-tpc-text">
              {formatPoints(saldo.available)}
            </div>
          </div>
          <div className="w-px bg-tpc-border" />
          <div>
            <div className="font-mono text-[8px] uppercase tracking-[0.16em] text-tpc-text-tertiary">
              Reservado
            </div>
            <div
              className={cn(
                'tpc-num mt-0.5 text-[18px] font-semibold tracking-[-0.03em]',
                saldo.reserved > 0 ? 'text-tpc-yellow' : 'text-tpc-text',
              )}
            >
              {formatPoints(saldo.reserved)}
            </div>
          </div>
        </div>

        <div className="mt-3.5 flex gap-2">
          <Link
            href="/pontos/comprar"
            className="inline-flex items-center gap-2 rounded-lg bg-tpc-red px-3.5 py-2 text-[13px] font-semibold text-tpc-text shadow-md shadow-tpc-red/25 transition hover:bg-tpc-red-dark"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M13 2L4 14h8l-1 8 9-12h-8l1-8z" />
            </svg>
            Recarregar pontos
          </Link>
          <Link
            href="/historico"
            className="inline-flex items-center rounded-lg border border-tpc-border bg-tpc-elevated px-3.5 py-2 text-[13px] font-medium text-tpc-text transition hover:bg-tpc-elevated-2"
          >
            Ver histórico
          </Link>
        </div>
      </div>
    </Card>
  )
}

const ProximoServicoCard = () => {
  return (
    <Card className="flex flex-col p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-tpc-text-tertiary">
          Próximo serviço
        </span>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-1.5 py-2 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-tpc-border bg-tpc-elevated text-tpc-text-tertiary">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
        <p className="text-[13px] font-medium text-tpc-text">Sem pedidos em andamento</p>
        <p className="text-[11px] text-tpc-text-tertiary">
          Quando agendar algo, aparece aqui.
        </p>
      </div>
      <Link
        href="/catalogo/presencial"
        className="mt-2 inline-flex items-center justify-center rounded-lg border border-tpc-border bg-tpc-elevated py-2 text-xs font-medium text-tpc-text transition hover:bg-tpc-elevated-2"
      >
        Ver catálogo
      </Link>
    </Card>
  )
}

const StatCard = ({
  label,
  value,
  sub,
  color = 'default',
}: {
  label: string
  value: string
  sub: string
  color?: 'default' | 'green' | 'yellow' | 'red'
}) => {
  const valueColor = {
    default: 'text-tpc-text',
    green: 'text-tpc-green',
    yellow: 'text-tpc-yellow',
    red: 'text-tpc-red',
  }[color]
  return (
    <Card className="p-3.5">
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-tpc-text-tertiary">
        {label}
      </div>
      <div
        className={cn(
          'tpc-num mt-1.5 text-[18px] font-bold leading-none tracking-[-0.04em]',
          valueColor,
        )}
      >
        {value}
      </div>
      <div className="mt-1 text-[10.5px] text-tpc-text-tertiary">{sub}</div>
    </Card>
  )
}

interface ShortcutCardProps {
  href: string
  icon: 'bolt' | 'wrench' | 'plus' | 'history'
  label: string
  sub: string
  color: 'red' | 'green'
  disabled?: boolean
}

const ShortcutCard = ({
  href,
  icon,
  label,
  sub,
  color,
  disabled,
}: ShortcutCardProps) => {
  const colorClass = color === 'red' ? 'text-tpc-red' : 'text-tpc-green'
  const borderColor = color === 'red' ? 'border-tpc-red/30' : 'border-tpc-green/30'
  const bgColor = color === 'red' ? 'bg-tpc-red/10' : 'bg-tpc-green/10'
  const boxBorder = color === 'red' ? 'border-tpc-red/40' : 'border-tpc-green/40'

  const inner = (
    <div
      className={cn(
        'flex h-full items-center gap-2.5 rounded-xl border bg-tpc-surface p-2.5 transition',
        disabled
          ? 'border-tpc-border opacity-50'
          : cn(borderColor, 'hover:bg-tpc-elevated'),
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border',
          bgColor,
          boxBorder,
          colorClass,
        )}
      >
        <ShortcutIcon kind={icon} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12.5px] font-semibold tracking-tight text-tpc-text">
          {label}
        </div>
        <div className="mt-0.5 truncate text-[10px] text-tpc-text-tertiary">{sub}</div>
      </div>
    </div>
  )
  if (disabled) {
    return <div aria-disabled className="cursor-not-allowed">{inner}</div>
  }
  return <Link href={href}>{inner}</Link>
}

const ShortcutIcon = ({ kind }: { kind: ShortcutCardProps['icon'] }) => {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  if (kind === 'bolt')
    return (
      <svg {...common}>
        <path d="M13 2L4 14h8l-1 8 9-12h-8l1-8z" />
      </svg>
    )
  if (kind === 'wrench')
    return (
      <svg {...common}>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    )
  if (kind === 'plus')
    return (
      <svg {...common}>
        <path d="M12 5v14M5 12h14" />
      </svg>
    )
  return (
    <svg {...common}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
      <path d="M12 8v5l3 2" />
    </svg>
  )
}

const ActivityRow = ({
  item,
  last,
}: {
  item: AtividadeItem
  last: boolean
}) => {
  const iconBg = {
    CREDIT: 'bg-tpc-green/15 text-tpc-green border-tpc-green/30',
    DEBIT: 'bg-tpc-red/15 text-tpc-red border-tpc-red/30',
    RESERVE: 'bg-tpc-yellow/15 text-tpc-yellow border-tpc-yellow/30',
    UNRESERVE: 'bg-tpc-elevated text-tpc-text-tertiary border-tpc-border',
  }[item.type]
  const valueColor = {
    CREDIT: 'text-tpc-green',
    DEBIT: 'text-tpc-red',
    RESERVE: 'text-tpc-yellow',
    UNRESERVE: 'text-tpc-text-tertiary',
  }[item.type]
  const prefix = {
    CREDIT: '+',
    DEBIT: '-',
    RESERVE: '·',
    UNRESERVE: '↻',
  }[item.type]

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3',
        last ? '' : 'border-b border-tpc-border',
      )}
    >
      <div
        className={cn(
          'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] border',
          iconBg,
        )}
      >
        <ActivityIcon type={item.type} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium tracking-tight text-tpc-text">
          {item.title}
        </div>
        <div className="mt-0.5 truncate text-[10.5px] text-tpc-text-tertiary">
          {item.subtitle ? `${item.subtitle} · ` : ''}
          {formatDateTimeBR(item.createdAt)}
        </div>
      </div>
      <div
        className={cn(
          'tpc-num shrink-0 text-[13px] font-semibold tabular-nums',
          valueColor,
        )}
      >
        {prefix}
        {formatPoints(item.amount)}
      </div>
    </div>
  )
}

const ActivityIcon = ({ type }: { type: AtividadeItem['type'] }) => {
  const common = {
    width: 14,
    height: 14,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 2.2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  if (type === 'CREDIT')
    return (
      <svg {...common}>
        <path d="M12 5v14M5 12h14" />
      </svg>
    )
  if (type === 'DEBIT')
    return (
      <svg {...common}>
        <path d="M5 12h14" />
      </svg>
    )
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}
