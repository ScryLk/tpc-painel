'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import { formatPoints } from '@tpc/lib/formatters'
import { Card, cn } from '@tpc/ui'

import { ClientShell } from '@/components/layout/ClientShell'

type RemapStatus =
  | 'AWAITING_QUOTE'
  | 'QUOTE_SENT'
  | 'ANALYZING'
  | 'MAPPING'
  | 'AWAITING_REVIEW'
  | 'APPROVED'
  | 'NEEDS_REVISION'
  | 'CANCELLED'

type PresencialStatus =
  | 'PENDENTE'
  | 'CONFIRMADA'
  | 'EM_EXEC'
  | 'CONCLUIDA'
  | 'CANCELADA'

type PedidoStatus = RemapStatus | PresencialStatus

export interface PedidoItem {
  kind: 'remap' | 'presencial'
  id: string
  protocol: string
  status: PedidoStatus
  isCustomQuote: boolean
  pointsReserved: number
  pointsDebited: number
  createdAt: string
  serviceName: string | null
  car: { brand: string; model: string; plate: string } | null
  // Só pra presencial: data agendada
  scheduledDate?: string
}

interface Saldo {
  available: number
  reserved: number
  total: number
}

const ACTIVE_STATUSES: PedidoStatus[] = [
  // file service
  'AWAITING_QUOTE',
  'QUOTE_SENT',
  'ANALYZING',
  'MAPPING',
  'AWAITING_REVIEW',
  'NEEDS_REVISION',
  // presencial
  'PENDENTE',
  'CONFIRMADA',
  'EM_EXEC',
]

const DONE_STATUSES: PedidoStatus[] = ['APPROVED', 'CONCLUIDA']
const CANCEL_STATUSES: PedidoStatus[] = ['CANCELLED', 'CANCELADA']

const STATUS_CFG: Record<
  PedidoStatus,
  { label: string; classes: string; dot: string; pulse: boolean }
> = {
  // file service
  AWAITING_QUOTE: {
    label: 'Aguardando orçamento',
    classes: 'border-tpc-yellow/40 bg-tpc-yellow/10 text-tpc-yellow',
    dot: 'bg-tpc-yellow',
    pulse: true,
  },
  QUOTE_SENT: {
    label: 'Orçamento enviado',
    classes: 'border-tpc-yellow/40 bg-tpc-yellow/10 text-tpc-yellow',
    dot: 'bg-tpc-yellow',
    pulse: true,
  },
  ANALYZING: {
    label: 'Em análise',
    classes: 'border-tpc-red/40 bg-tpc-red/10 text-tpc-red',
    dot: 'bg-tpc-red',
    pulse: true,
  },
  MAPPING: {
    label: 'Em mapeamento',
    classes: 'border-tpc-red/40 bg-tpc-red/10 text-tpc-red',
    dot: 'bg-tpc-red',
    pulse: true,
  },
  AWAITING_REVIEW: {
    label: 'Pronto pra aprovar',
    classes: 'border-tpc-green/40 bg-tpc-green/10 text-tpc-green',
    dot: 'bg-tpc-green',
    pulse: true,
  },
  NEEDS_REVISION: {
    label: 'Precisa revisão',
    classes: 'border-tpc-yellow/40 bg-tpc-yellow/10 text-tpc-yellow',
    dot: 'bg-tpc-yellow',
    pulse: false,
  },
  APPROVED: {
    label: 'Concluído',
    classes: 'border-tpc-green/40 bg-tpc-green/10 text-tpc-green',
    dot: 'bg-tpc-green',
    pulse: false,
  },
  CANCELLED: {
    label: 'Cancelado',
    classes: 'border-tpc-border bg-tpc-elevated-2 text-tpc-text-tertiary',
    dot: 'bg-tpc-text-tertiary',
    pulse: false,
  },
  // presencial
  PENDENTE: {
    label: 'Aguardando confirmação',
    classes: 'border-tpc-yellow/40 bg-tpc-yellow/10 text-tpc-yellow',
    dot: 'bg-tpc-yellow',
    pulse: true,
  },
  CONFIRMADA: {
    label: 'Confirmado',
    classes: 'border-tpc-green/40 bg-tpc-green/10 text-tpc-green',
    dot: 'bg-tpc-green',
    pulse: true,
  },
  EM_EXEC: {
    label: 'Em execução',
    classes: 'border-tpc-red/40 bg-tpc-red/10 text-tpc-red',
    dot: 'bg-tpc-red',
    pulse: true,
  },
  CONCLUIDA: {
    label: 'Concluído',
    classes: 'border-tpc-green/40 bg-tpc-green/10 text-tpc-green',
    dot: 'bg-tpc-green',
    pulse: false,
  },
  CANCELADA: {
    label: 'Cancelado',
    classes: 'border-tpc-border bg-tpc-elevated-2 text-tpc-text-tertiary',
    dot: 'bg-tpc-text-tertiary',
    pulse: false,
  },
}

type Filter = 'todos' | 'abertos' | 'concluidos' | 'cancelados'

export const PedidosView = ({
  items,
  saldo,
}: {
  items: PedidoItem[]
  saldo: Saldo
}) => {
  const [filter, setFilter] = useState<Filter>('todos')

  const buckets = useMemo(() => {
    const active = items.filter((o) => ACTIVE_STATUSES.includes(o.status))
    const done = items.filter((o) => DONE_STATUSES.includes(o.status))
    const cancelled = items.filter((o) => CANCEL_STATUSES.includes(o.status))
    return { active, done, cancelled }
  }, [items])

  const visible = useMemo(() => {
    if (filter === 'abertos') return buckets.active
    if (filter === 'concluidos') return buckets.done
    if (filter === 'cancelados') return buckets.cancelled
    return items
  }, [filter, items, buckets])

  return (
    <ClientShell breadcrumbs={['Pedidos']} saldoAvailable={saldo.available}>
      <div className="mx-auto max-w-[1280px] px-6 py-7 md:px-10">
        <div className="mb-6 flex flex-col items-start justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h1 className="text-[26px] font-bold leading-tight tracking-[-0.03em] text-tpc-text">
              Pedidos
            </h1>
            <p className="mt-1 text-[13px] text-tpc-text-secondary">
              Tuas conversas com a TPC. Abertos no topo, finalizados embaixo.
            </p>
          </div>
          <Link
            href="/catalogo/arquivo"
            className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] bg-tpc-red px-4 py-2.5 text-[13px] font-semibold text-tpc-text shadow-md shadow-tpc-red/20 transition hover:bg-tpc-red-dark"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Novo pedido
          </Link>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Abertos"
            value={String(buckets.active.length)}
            sub="aguardando ação"
            color={buckets.active.length > 0 ? 'red' : 'default'}
          />
          <StatCard
            label="Pontos reservados"
            value={formatPoints(
              buckets.active.reduce((acc, o) => acc + o.pointsReserved, 0),
            )}
            sub="em pedidos abertos"
            color="yellow"
          />
          <StatCard
            label="Concluídos"
            value={String(buckets.done.length)}
            sub="arquivos disponíveis"
            color="green"
          />
          <StatCard
            label="Total"
            value={String(items.length)}
            sub="histórico completo"
          />
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {(
            [
              ['todos', 'Todos', items.length],
              ['abertos', 'Abertos', buckets.active.length],
              ['concluidos', 'Concluídos', buckets.done.length],
              ['cancelados', 'Cancelados', buckets.cancelled.length],
            ] as Array<[Filter, string, number]>
          ).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                'inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition',
                filter === key
                  ? 'bg-tpc-red text-tpc-text'
                  : 'border border-tpc-border text-tpc-text-secondary hover:bg-tpc-surface',
              )}
            >
              {label}
              <span
                className={cn(
                  'font-mono text-[10px]',
                  filter === key ? 'text-tpc-text/80' : 'text-tpc-text-tertiary',
                )}
              >
                {count}
              </span>
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <Card className="overflow-hidden p-0">
            {visible.map((o, i) => (
              <PedidoRow key={o.id} pedido={o} last={i === visible.length - 1} />
            ))}
          </Card>
        )}
      </div>
    </ClientShell>
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
  color?: 'default' | 'red' | 'green' | 'yellow'
}) => {
  const valueColor = {
    default: 'text-tpc-text',
    red: 'text-tpc-red',
    green: 'text-tpc-green',
    yellow: 'text-tpc-yellow',
  }[color]
  return (
    <Card className="p-3.5">
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-tpc-text-tertiary">
        {label}
      </div>
      <div
        className={cn(
          'tpc-num mt-1.5 text-[20px] font-bold leading-none tracking-[-0.04em]',
          valueColor,
        )}
      >
        {value}
      </div>
      <div className="mt-1 text-[10.5px] text-tpc-text-tertiary">{sub}</div>
    </Card>
  )
}

const PedidoRow = ({ pedido, last }: { pedido: PedidoItem; last: boolean }) => {
  const cfg = STATUS_CFG[pedido.status]
  const title =
    pedido.serviceName ??
    (pedido.isCustomQuote
      ? 'Atendimento personalizado'
      : `Pedido #${pedido.protocol}`)
  // Rota muda por canal: file service vai pro chat, presencial pro
  // agendamento.
  const href =
    pedido.kind === 'presencial'
      ? `/agendamento/${pedido.id}`
      : `/pedido/${pedido.id}`
  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-3 px-5 py-3.5 transition hover:bg-tpc-surface',
        !last && 'border-b border-tpc-border',
      )}
    >
      <div
        className={cn(
          'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-tpc-border bg-tpc-elevated-2 text-tpc-red',
        )}
      >
        {pedido.kind === 'presencial' ? (
          // Marcador local (presencial)
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
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        ) : (
          // Chat bubble (file service)
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
            <path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 8.4 8.4 0 0 1-3.7-.8L3 21l1.5-4.7A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z" />
          </svg>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-[14px] font-semibold tracking-[-0.01em] text-tpc-text">
            {title}
          </span>
          <span
            className={cn(
              'rounded border px-1.5 py-[2px] font-mono text-[8px] font-bold uppercase tracking-[0.14em]',
              pedido.kind === 'presencial'
                ? 'border-tpc-border bg-tpc-elevated text-tpc-text-tertiary'
                : 'border-tpc-border bg-tpc-elevated text-tpc-text-tertiary',
            )}
          >
            {pedido.kind === 'presencial' ? 'Presencial' : 'Arquivo'}
          </span>
          {pedido.isCustomQuote && (
            <span className="rounded border border-tpc-yellow/40 bg-tpc-yellow/10 px-1.5 py-[2px] font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-tpc-yellow">
              Custom
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 font-mono text-[10.5px] tracking-[0.04em] text-tpc-text-tertiary">
          <span>#{pedido.protocol}</span>
          <span>·</span>
          <span>{formatDate(pedido.createdAt)}</span>
          {pedido.scheduledDate && (
            <>
              <span>·</span>
              <span className="text-tpc-text-secondary">
                agendado{' '}
                {new Date(pedido.scheduledDate).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                })}
              </span>
            </>
          )}
          {pedido.car && (
            <>
              <span>·</span>
              <span className="text-tpc-text-secondary">
                {pedido.car.brand} {pedido.car.model}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-3">
        {pedido.pointsReserved > 0 && !DONE_STATUSES.includes(pedido.status) && (
          <span className="hidden font-mono text-[11px] text-tpc-yellow md:inline">
            {formatPoints(pedido.pointsReserved)} pts reservados
          </span>
        )}
        {pedido.pointsDebited > 0 && (
          <span className="hidden font-mono text-[11px] text-tpc-text-tertiary md:inline">
            -{formatPoints(pedido.pointsDebited)} pts
          </span>
        )}
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em]',
            cfg.classes,
          )}
        >
          {cfg.pulse && (
            <span
              className={cn(
                'inline-block h-[5px] w-[5px] animate-[tpc-pulse_1.8s_ease-in-out_infinite] rounded-full shadow-[0_0_5px_currentColor]',
                cfg.dot,
              )}
            />
          )}
          {cfg.label}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-tpc-text-tertiary transition group-hover:translate-x-0.5 group-hover:text-tpc-text"
          aria-hidden
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </div>
    </Link>
  )
}

const EmptyState = ({ filter }: { filter: Filter }) => {
  const copy = {
    todos: {
      title: 'Nenhum pedido ainda',
      body: 'Quando tu abrir um atendimento ou solicitar um arquivo, aparece aqui.',
      ctaLabel: 'Abrir novo pedido',
      ctaHref: '/catalogo/arquivo',
    },
    abertos: {
      title: 'Nenhum pedido aberto',
      body: 'Todos os teus pedidos estão finalizados ou cancelados.',
      ctaLabel: 'Abrir novo pedido',
      ctaHref: '/catalogo/arquivo',
    },
    concluidos: {
      title: 'Nenhum pedido concluído ainda',
      body: 'Pedidos aprovados aparecem aqui com link pro arquivo modificado.',
      ctaLabel: 'Ver catálogo',
      ctaHref: '/catalogo/arquivo',
    },
    cancelados: {
      title: 'Nenhum pedido cancelado',
      body: 'Boa, sem cancelamentos.',
      ctaLabel: 'Ver todos',
      ctaHref: '#',
    },
  }[filter]

  return (
    <Card className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-tpc-border bg-tpc-elevated text-tpc-text-tertiary">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 8.4 8.4 0 0 1-3.7-.8L3 21l1.5-4.7A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z" />
        </svg>
      </div>
      <div className="text-[15px] font-semibold tracking-tight text-tpc-text">
        {copy.title}
      </div>
      <p className="max-w-sm text-[12px] leading-relaxed text-tpc-text-secondary">
        {copy.body}
      </p>
      {copy.ctaHref !== '#' && (
        <Link
          href={copy.ctaHref}
          className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-full bg-tpc-red px-5 py-2.5 text-[13px] font-semibold text-tpc-text shadow-md shadow-tpc-red/30 transition hover:bg-tpc-red-dark"
        >
          {copy.ctaLabel}
        </Link>
      )}
    </Card>
  )
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
