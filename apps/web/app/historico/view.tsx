'use client'

import { useMemo, useState } from 'react'

import { Card, DesktopDrawer, SecHeading, cn } from '@tpc/ui'

import { ClientShell } from '@/components/layout/ClientShell'

interface Saldo {
  available: number
  reserved: number
  total: number
}

type RowKind = 'remap' | 'service' | 'purchase' | 'refund'
type RowStatus = 'approved' | 'mapping' | 'quote_pending' | 'ok'

interface Row {
  id: string
  when: string
  dateGroup: string
  kind: RowKind
  title: string
  sub: string
  protocolo: string | null
  status: RowStatus
  value: string
  hasFile?: boolean
}

const MOCK_ROWS: Row[] = [
  {
    id: '1',
    when: 'Hoje, 17:55',
    dateGroup: 'HOJE',
    kind: 'remap',
    title: 'Stage 1 por arquivo · aprovado',
    sub: 'ECU Bosch MED17.1 · BMW M340i',
    protocolo: '04127',
    status: 'approved',
    value: '-500 pts',
    hasFile: true,
  },
  {
    id: '2',
    when: 'Hoje, 08:14',
    dateGroup: 'HOJE',
    kind: 'purchase',
    title: 'Pacote Pro creditado',
    sub: '1.000 + 150 bônus · Pix',
    protocolo: null,
    status: 'ok',
    value: '+1.150 pts',
  },
  {
    id: '3',
    when: 'Ontem, 14:32',
    dateGroup: 'ONTEM',
    kind: 'remap',
    title: 'EGR off · em mapeamento',
    sub: 'ECU Bosch MED17 · VW Golf GTI',
    protocolo: '04130',
    status: 'mapping',
    value: '-150 reservados',
  },
  {
    id: '4',
    when: 'Ontem, 19:48',
    dateGroup: 'ONTEM',
    kind: 'service',
    title: 'Diagnóstico OBD completo',
    sub: 'VW Golf GTI · sem falhas',
    protocolo: null,
    status: 'ok',
    value: 'grátis',
  },
  {
    id: '5',
    when: '12 mai, 11:20',
    dateGroup: 'ESTA SEMANA',
    kind: 'remap',
    title: 'Pedido custom · aguardando orçamento',
    sub: 'Audi RS6 · enviado há 24h',
    protocolo: '04128',
    status: 'quote_pending',
    value: 'sem custo',
  },
  {
    id: '6',
    when: '8 mai, 11:23',
    dateGroup: 'MAIO',
    kind: 'service',
    title: 'Pop & Bang aplicado',
    sub: 'BMW M340i · 4 modos selecionáveis',
    protocolo: null,
    status: 'ok',
    value: '-100 pts',
  },
  {
    id: '7',
    when: '6 mai, 16:40',
    dateGroup: 'MAIO',
    kind: 'remap',
    title: 'Remoção de limitador · aprovado',
    sub: 'ECU Bosch MED17 · BMW M340i',
    protocolo: '04102',
    status: 'approved',
    value: '-50 pts',
    hasFile: true,
  },
  {
    id: '8',
    when: '5 mai, 15:00',
    dateGroup: 'MAIO',
    kind: 'purchase',
    title: 'Pacote Stage 1',
    sub: '500 + 50 bônus · Pix',
    protocolo: null,
    status: 'ok',
    value: '+550 pts',
  },
  {
    id: '9',
    when: '3 mai, 09:12',
    dateGroup: 'MAIO',
    kind: 'refund',
    title: 'Estorno parcial',
    sub: 'cancelamento de Cold start',
    protocolo: null,
    status: 'ok',
    value: '+80 pts',
  },
]

const FILTERS = ['Todos', 'Compras', 'Serviços', 'Arquivos', 'Estornos'] as const

export const HistoricoView = ({ saldo }: { saldo: Saldo }) => {
  const [openRowId, setOpenRowId] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]>('Todos')

  const filteredRows = useMemo(() => {
    if (activeFilter === 'Todos') return MOCK_ROWS
    const kindMap: Record<string, RowKind | RowKind[]> = {
      Compras: 'purchase',
      Serviços: ['service', 'remap'],
      Arquivos: 'remap',
      Estornos: 'refund',
    }
    const wanted = kindMap[activeFilter]
    return MOCK_ROWS.filter((r) =>
      Array.isArray(wanted) ? wanted.includes(r.kind) : r.kind === wanted,
    )
  }, [activeFilter])

  const groups = useMemo(() => {
    const out: Array<{ label: string; items: Row[] }> = []
    let current: { label: string; items: Row[] } | null = null
    for (const row of filteredRows) {
      if (!current || current.label !== row.dateGroup) {
        current = { label: row.dateGroup, items: [] }
        out.push(current)
      }
      current.items.push(row)
    }
    return out
  }, [filteredRows])

  const openRow = MOCK_ROWS.find((r) => r.id === openRowId)

  return (
    <ClientShell breadcrumbs={['Histórico']} saldoAvailable={saldo.available}>
      <div className="px-5 py-7 md:px-8">
        <div className="mb-6">
          <h1 className="text-[26px] font-bold leading-tight tracking-[-0.03em] text-tpc-text">
            Histórico
          </h1>
          <p className="mt-1 text-[13px] text-tpc-text-secondary">
            Todas as movimentações da tua conta
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatBox label="Gastos · maio" value="-1.200" sub="pts no mês" color="red" />
          <StatBox label="Créditos · maio" value="+1.700" sub="pts no mês" color="green" />
          <StatBox label="Serviços · maio" value="4" sub="2 presencial · 2 arquivo" />
          <StatBox label="Arquivos" value="2" sub="modificados · pra sempre" color="red" />
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((label) => (
              <button
                type="button"
                key={label}
                onClick={() => setActiveFilter(label)}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-xs font-medium transition',
                  activeFilter === label
                    ? 'bg-tpc-red text-tpc-text'
                    : 'border border-tpc-border text-tpc-text-secondary hover:bg-tpc-surface',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="hidden gap-2 md:flex">
            <TableActionButton
              icon={
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              }
              label="Últimos 30 dias"
            />
            <TableActionButton
              icon={
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
              }
              label="Exportar CSV"
            />
          </div>
        </div>

        <Card className="overflow-hidden p-0">
          <HistoryTableHeader />
          {groups.map((group) => (
            <div key={group.label}>
              <div className="flex items-center justify-between border-b border-tpc-border bg-tpc-bg/60 px-4 py-2.5">
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-tpc-text-tertiary">
                  {group.label}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-tpc-text-tertiary">
                  {group.items.length}{' '}
                  {group.items.length === 1 ? 'evento' : 'eventos'}
                </span>
              </div>
              {group.items.map((row) => (
                <HistoryTableRow
                  key={row.id}
                  row={row}
                  selected={openRowId === row.id}
                  onClick={() => setOpenRowId(row.id)}
                />
              ))}
            </div>
          ))}
          {filteredRows.length === 0 && (
            <div className="p-8 text-center text-sm text-tpc-text-tertiary">
              Nada por aqui ainda nesse filtro.
            </div>
          )}
        </Card>
      </div>

      {openRow && (
        <HistoricoDetailDrawer row={openRow} onClose={() => setOpenRowId(null)} />
      )}
    </ClientShell>
  )
}

const StatBox = ({
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
    <Card className="p-[18px]">
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-tpc-text-tertiary">
        {label}
      </div>
      <div
        className={cn(
          'tpc-num mt-2 text-[22px] font-bold leading-none tracking-[-0.04em]',
          valueColor,
        )}
      >
        {value}
      </div>
      <div className="mt-1.5 text-[11px] text-tpc-text-tertiary">{sub}</div>
    </Card>
  )
}

const TableActionButton = ({
  icon,
  label,
}: {
  icon: React.ReactNode
  label: string
}) => {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-lg border border-tpc-border bg-tpc-surface px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-tpc-text-secondary"
    >
      {icon}
      {label}
    </button>
  )
}

const TABLE_GRID =
  'grid grid-cols-[140px_50px_1fr_120px_120px_90px] items-center gap-4 px-4 py-3'

const HistoryTableHeader = () => {
  return (
    <div className={cn(TABLE_GRID, 'border-b border-tpc-border bg-tpc-bg')}>
      <HeaderCell>Quando</HeaderCell>
      <HeaderCell>Tipo</HeaderCell>
      <HeaderCell>Descrição</HeaderCell>
      <HeaderCell>Status</HeaderCell>
      <HeaderCell className="text-right">Valor</HeaderCell>
      <HeaderCell className="text-center">Ações</HeaderCell>
    </div>
  )
}

const HeaderCell = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => (
  <div
    className={cn(
      'font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-tpc-text-tertiary',
      className,
    )}
  >
    {children}
  </div>
)

const HistoryTableRow = ({
  row,
  selected,
  onClick,
}: {
  row: Row
  selected: boolean
  onClick: () => void
}) => {
  const statusBadge = getStatusBadge(row.status)
  const valueColor = getValueColor(row.kind, row.status)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        TABLE_GRID,
        'cursor-pointer border-b border-tpc-border border-l-[3px] transition',
        selected
          ? 'border-l-tpc-red bg-tpc-red/[0.05]'
          : 'border-l-transparent hover:bg-tpc-surface',
      )}
    >
      <div className="font-mono text-[11px] tracking-wide text-tpc-text-secondary">
        {row.when}
      </div>
      <div className="relative">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-tpc-border bg-tpc-bg text-tpc-red">
          <KindIcon kind={row.kind} />
        </div>
        {row.hasFile && (
          <span className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full border-2 border-tpc-bg bg-tpc-green">
            <svg
              width="7"
              height="7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#000"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M5 12l5 5L20 7" />
            </svg>
          </span>
        )}
      </div>
      <div className="min-w-0">
        <div className="truncate text-[13px] font-medium tracking-[-0.01em] text-tpc-text">
          {row.title}
        </div>
        <div className="mt-0.5 truncate text-[11px] text-tpc-text-tertiary">
          {row.sub}
          {row.protocolo && (
            <span className="ml-2 font-mono">#{row.protocolo}</span>
          )}
        </div>
      </div>
      <div>
        {statusBadge && (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2 py-[3px] font-mono text-[8px] font-bold uppercase tracking-[0.14em]',
              statusBadge.classes,
            )}
          >
            {statusBadge.pulse && (
              <span
                className={cn(
                  'inline-block h-[5px] w-[5px] animate-[tpc-pulse_1.8s_ease-in-out_infinite] rounded-full shadow-[0_0_5px_currentColor]',
                  statusBadge.dot,
                )}
              />
            )}
            {statusBadge.label}
          </span>
        )}
      </div>
      <div
        className={cn(
          'tpc-num text-right text-[13px] font-semibold tabular-nums',
          valueColor,
        )}
      >
        {row.value}
      </div>
      <div className="text-center">
        {row.kind === 'remap' && row.status === 'approved' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
            }}
            className="rounded border border-tpc-red/50 px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-tpc-red"
          >
            Baixar
          </button>
        )}
        {row.kind === 'remap' && row.status !== 'approved' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
            }}
            className="font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-tpc-red"
          >
            Abrir chat
          </button>
        )}
      </div>
    </div>
  )
}

const KindIcon = ({ kind }: { kind: RowKind }) => {
  const common = {
    width: 14,
    height: 14,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  if (kind === 'remap')
    return (
      <svg {...common}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
      </svg>
    )
  if (kind === 'service')
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06" />
      </svg>
    )
  if (kind === 'purchase')
    return (
      <svg {...common} strokeWidth={2.5}>
        <path d="M12 5v14M5 12h14" />
      </svg>
    )
  return (
    <svg {...common}>
      <path d="M9 14l-4-4 4-4" />
      <path d="M20 18v-2a4 4 0 0 0-4-4H5" />
    </svg>
  )
}

const getStatusBadge = (status: RowStatus) => {
  if (status === 'approved')
    return {
      label: 'Concluído',
      classes: 'border-tpc-green/40 bg-tpc-green/10 text-tpc-green',
      dot: 'bg-tpc-green',
      pulse: false,
    }
  if (status === 'mapping')
    return {
      label: 'Mapeando',
      classes: 'border-tpc-red/40 bg-tpc-red/10 text-tpc-red',
      dot: 'bg-tpc-red',
      pulse: true,
    }
  if (status === 'quote_pending')
    return {
      label: 'Orçamento',
      classes: 'border-tpc-yellow/40 bg-tpc-yellow/10 text-tpc-yellow',
      dot: 'bg-tpc-yellow',
      pulse: true,
    }
  return null
}

const getValueColor = (kind: RowKind, status: RowStatus) => {
  if (kind === 'purchase') return 'text-tpc-green'
  if (kind === 'refund') return 'text-tpc-yellow'
  if (kind === 'remap') {
    if (status === 'approved') return 'text-tpc-red'
    if (status === 'mapping') return 'text-tpc-yellow'
    return 'text-tpc-text-secondary'
  }
  return 'text-tpc-red'
}

const HistoricoDetailDrawer = ({ row, onClose }: { row: Row; onClose: () => void }) => {
  const isApprovedRemap = row.kind === 'remap' && row.status === 'approved'

  return (
    <DesktopDrawer
      open
      onClose={onClose}
      title={row.title}
      subtitle={`${row.protocolo ? `Pedido #${row.protocolo} · ` : ''}${row.when}`}
      footer={
        isApprovedRemap ? (
          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-tpc-red px-6 py-3 text-sm font-semibold text-tpc-text shadow-lg shadow-tpc-red/40 transition hover:bg-tpc-red-dark"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Baixar arquivo modificado
          </button>
        ) : null
      }
    >
      <div className="mb-5">
        {getStatusBadge(row.status) ? (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em]',
              getStatusBadge(row.status)!.classes,
            )}
          >
            {getStatusBadge(row.status)!.label}
            {isApprovedRemap && ' · Arquivo disponível'}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full border border-tpc-border bg-tpc-surface px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-tpc-text-secondary">
            Registrado
          </span>
        )}
      </div>

      <SecHeading className="px-0 pb-2.5 pt-0">Resumo</SecHeading>
      <div className="mb-5 grid grid-cols-2 gap-2">
        <KV label="Tipo" value={row.title.split(' · ')[0]!} />
        <KV label="Valor" value={row.value} />
        {row.protocolo && <KV label="Protocolo" value={`#${row.protocolo}`} />}
        <KV label="Quando" value={row.when} />
      </div>

      {isApprovedRemap && (
        <>
          <SecHeading className="px-0 pb-2.5 pt-0">Arquivo modificado</SecHeading>
          <Card className="mb-4 border-tpc-green/40 bg-tpc-green/[0.04] p-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-[10px] border border-tpc-green/40 bg-tpc-green/10 text-tpc-green">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6M9 13l2 2 4-4" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-mono text-xs font-semibold tracking-wide text-tpc-text">
                  m340i_stage1_v1.bin
                </div>
                <div className="mt-1 font-mono text-[9px] tracking-wide text-tpc-text-tertiary">
                  6.4 MB · SHA b8c2f9d1...
                </div>
              </div>
            </div>
            <p className="mt-3 border-t border-dashed border-tpc-green/30 pt-3 text-[11px] leading-relaxed text-tpc-text-secondary">
              Disponível pra baixar{' '}
              <span className="font-semibold text-tpc-text">pra sempre</span>. Trocou
              de celular? Faz login e baixa de novo.
            </p>
          </Card>
        </>
      )}
    </DesktopDrawer>
  )
}

const KV = ({ label, value }: { label: string; value: string }) => {
  return (
    <div className="rounded-lg border border-tpc-border bg-tpc-surface p-3">
      <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-tpc-text-tertiary">
        {label}
      </div>
      <div className="mt-1 text-[13px] font-semibold tracking-[-0.01em] text-tpc-text">
        {value}
      </div>
    </div>
  )
}
