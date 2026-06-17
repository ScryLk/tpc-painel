'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { formatDateTimeBR } from '@tpc/lib/formatters'
import { Button, Card, cn } from '@tpc/ui'

import { useApi } from '@/lib/api/client'
import { AdminShell } from '@/components/layout/AdminShell'

import type { LeadDetail } from './page'

interface Props {
  lead: LeadDetail
  user: { firstName: string; initials: string; role: string }
}

const MIN_REPLY = 10
const MAX_REPLY = 4000

export const LeadDetailView = ({ lead, user }: Props) => {
  const router = useRouter()
  const api = useApi()
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [replyPending, startReply] = useTransition()
  const [archivePending, startArchive] = useTransition()

  const isNew = lead.status === 'NEW'
  const canSubmit = message.trim().length >= MIN_REPLY && message.length <= MAX_REPLY

  const submitReply = () => {
    if (!canSubmit) return
    setError(null)
    startReply(async () => {
      try {
        await api.post(`/admin/leads/${lead.id}/reply`, { message: message.trim() })
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao enviar resposta.')
      }
    })
  }

  const archive = () => {
    if (!isNew) return
    setError(null)
    startArchive(async () => {
      try {
        await api.post(`/admin/leads/${lead.id}/archive`)
        router.push('/admin/leads')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao arquivar.')
      }
    })
  }

  return (
    <AdminShell breadcrumbs={['Admin', 'Leads', lead.name]} user={user}>
      <div className="mx-auto max-w-[920px] px-6 py-6 md:px-8">
        <div className="mb-5">
          <Link
            href="/admin/leads"
            className="inline-flex items-center gap-1.5 text-[12px] text-tpc-text-secondary transition hover:text-tpc-text"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Voltar pra lista
          </Link>
        </div>

        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h1 className="text-[24px] font-bold tracking-[-0.03em] text-tpc-text">
              {lead.name}
            </h1>
            <p className="mt-0.5 text-[13px] text-tpc-text-secondary">
              Recebido em {formatDateTimeBR(lead.createdAt)}
            </p>
          </div>
          <StatusBadge status={lead.status} />
        </div>

        <Card className="mb-4 p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DataRow label="Email">
              <a
                href={`mailto:${lead.email}`}
                className="text-tpc-text underline-offset-2 hover:underline"
              >
                {lead.email}
              </a>
            </DataRow>
            {lead.phone && (
              <DataRow label="Telefone">
                <a
                  href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-tpc-text underline-offset-2 hover:underline"
                >
                  {lead.phone}
                </a>
              </DataRow>
            )}
            {lead.vehicle && <DataRow label="Veículo">{lead.vehicle}</DataRow>}
            {lead.year && <DataRow label="Ano">{lead.year}</DataRow>}
          </div>
        </Card>

        <Card className="mb-4 p-5">
          <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.18em] text-tpc-text-tertiary">
            Mensagem do cliente
          </div>
          <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-tpc-text">
            {lead.message}
          </p>
        </Card>

        {isNew ? (
          <Card className="p-5">
            <div className="mb-3 font-mono text-[9px] uppercase tracking-[0.18em] text-tpc-text-tertiary">
              Sua resposta
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escreva uma resposta clara e direta. O cliente recebe esse texto formatado num email com a identidade TPC."
              rows={8}
              maxLength={MAX_REPLY}
              className="w-full resize-y rounded-lg border border-tpc-border bg-tpc-elevated px-3.5 py-3 text-[14px] leading-relaxed text-tpc-text placeholder:text-tpc-text-tertiary focus:border-tpc-red focus:outline-none focus:ring-1 focus:ring-tpc-red"
            />
            <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] tracking-[0.04em] text-tpc-text-tertiary">
              <span>{message.length} / {MAX_REPLY}</span>
              <span>Email vai pro endereço do lead com signature TPC</span>
            </div>

            {error && (
              <div className="mt-3 rounded-lg border border-tpc-red/40 bg-tpc-red/10 px-3 py-2 text-xs text-tpc-red">
                {error}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button onClick={submitReply} disabled={!canSubmit || replyPending}>
                {replyPending ? 'Enviando…' : 'Enviar resposta'}
              </Button>
              <button
                type="button"
                onClick={archive}
                disabled={archivePending || replyPending}
                className="rounded-full border border-tpc-border bg-tpc-elevated px-4 py-2 text-[12px] font-medium text-tpc-text-secondary transition hover:bg-tpc-elevated-2 hover:text-tpc-text disabled:cursor-not-allowed disabled:opacity-50"
              >
                {archivePending ? 'Arquivando…' : 'Arquivar (sem responder)'}
              </button>
            </div>
          </Card>
        ) : (
          <Card className="p-5">
            <div className="mb-2 flex items-baseline justify-between">
              <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-tpc-text-tertiary">
                {lead.status === 'REPLIED' ? 'Resposta enviada' : 'Arquivado'}
              </div>
              {lead.repliedAt && (
                <div className="font-mono text-[10px] text-tpc-text-tertiary">
                  {formatDateTimeBR(lead.repliedAt)}
                  {lead.repliedBy ? ` · por ${lead.repliedBy.name}` : ''}
                </div>
              )}
            </div>
            {lead.replyMessage ? (
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-tpc-text">
                {lead.replyMessage}
              </p>
            ) : (
              <p className="text-[13px] text-tpc-text-secondary">
                Esse lead foi arquivado sem resposta.
              </p>
            )}
          </Card>
        )}
      </div>
    </AdminShell>
  )
}

const StatusBadge = ({ status }: { status: LeadDetail['status'] }) => {
  const config = {
    NEW: { label: 'Novo', classes: 'border-tpc-red/40 bg-tpc-red/10 text-tpc-red' },
    REPLIED: {
      label: 'Respondido',
      classes: 'border-tpc-green/40 bg-tpc-green/10 text-tpc-green',
    },
    ARCHIVED: {
      label: 'Arquivado',
      classes:
        'border-tpc-border bg-tpc-elevated text-tpc-text-tertiary',
    },
  }[status]
  return (
    <span
      className={cn(
        'rounded-full border px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.16em]',
        config.classes,
      )}
    >
      {config.label}
    </span>
  )
}

const DataRow = ({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) => {
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-tpc-text-tertiary">
        {label}
      </div>
      <div className="mt-1 text-[13.5px] text-tpc-text">{children}</div>
    </div>
  )
}
