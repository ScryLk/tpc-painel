'use client'

import Link from 'next/link'

import { formatDateTimeBR } from '@tpc/lib/formatters'
import { Card, cn } from '@tpc/ui'

import { AdminShell } from '@/components/layout/AdminShell'

import type { LeadListItem } from './page'

type Status = 'NEW' | 'REPLIED' | 'ARCHIVED'

interface Props {
  currentStatus: Status
  items: LeadListItem[]
  counts: { NEW: number; REPLIED: number; ARCHIVED: number }
  user: { firstName: string; initials: string; role: string }
}

const TABS: Array<{ id: Status; label: string }> = [
  { id: 'NEW', label: 'Novos' },
  { id: 'REPLIED', label: 'Respondidos' },
  { id: 'ARCHIVED', label: 'Arquivados' },
]

export const LeadsListView = ({ currentStatus, items, counts, user }: Props) => {
  return (
    <AdminShell breadcrumbs={['Admin', 'Leads']} user={user}>
      <div className="mx-auto max-w-[1100px] px-6 py-6 md:px-8">
        <div className="mb-5">
          <h1 className="text-[24px] font-bold tracking-[-0.03em] text-tpc-text">
            Leads da landing
          </h1>
          <p className="mt-1 text-[13px] text-tpc-text-secondary">
            Solicitações de contato vindas de tpcperformance.com.br
          </p>
        </div>

        <div className="mb-4 flex items-center gap-1.5 border-b border-tpc-border">
          {TABS.map((tab) => {
            const active = tab.id === currentStatus
            const count = counts[tab.id]
            return (
              <Link
                key={tab.id}
                href={`/admin/leads?status=${tab.id}`}
                className={cn(
                  'flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-[13px] font-medium transition',
                  active
                    ? 'border-tpc-red text-tpc-text'
                    : 'border-transparent text-tpc-text-secondary hover:text-tpc-text',
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    'rounded-full px-2 py-[2px] font-mono text-[10px] font-semibold',
                    active
                      ? 'bg-tpc-red/15 text-tpc-red'
                      : 'bg-tpc-elevated text-tpc-text-tertiary',
                  )}
                >
                  {count}
                </span>
              </Link>
            )
          })}
        </div>

        {items.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="text-sm text-tpc-text-secondary">
              {currentStatus === 'NEW'
                ? 'Nenhum lead novo agora. Tudo respondido.'
                : currentStatus === 'REPLIED'
                  ? 'Nenhum lead respondido ainda.'
                  : 'Nenhum lead arquivado.'}
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((lead) => (
              <LeadRow key={lead.id} lead={lead} />
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  )
}

const LeadRow = ({ lead }: { lead: LeadListItem }) => {
  return (
    <Link
      href={`/admin/leads/${lead.id}`}
      className="block rounded-xl border border-tpc-border bg-tpc-surface p-4 transition hover:border-tpc-border-strong hover:bg-tpc-elevated"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <span className="text-[15px] font-semibold tracking-tight text-tpc-text">
              {lead.name}
            </span>
            <span className="text-[12px] text-tpc-text-secondary">{lead.email}</span>
          </div>
          {(lead.vehicle || lead.phone) && (
            <div className="mt-1 font-mono text-[10.5px] tracking-[0.04em] text-tpc-text-tertiary">
              {[lead.vehicle, lead.year, lead.phone].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-tpc-text-tertiary">
          {formatDateTimeBR(lead.createdAt)}
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-tpc-text-secondary">
        {lead.messagePreview}
      </p>
    </Link>
  )
}
