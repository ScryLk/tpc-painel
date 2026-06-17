'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Card, cn } from '@tpc/ui'

import { useApi } from '@/lib/api/client'

import type { CampaignListItem, CampaignStatus } from './page'

interface Props {
  campaigns: CampaignListItem[]
}

const STATUS_LABEL: Record<CampaignStatus, string> = {
  DRAFT: 'Rascunho',
  SENDING: 'Enviando',
  SENT: 'Enviada',
  FAILED: 'Falhou',
}

const STATUS_CLS: Record<CampaignStatus, string> = {
  DRAFT: 'border-tpc-border bg-tpc-elevated text-tpc-text-tertiary',
  SENDING: 'border-tpc-yellow/40 bg-tpc-yellow/10 text-tpc-yellow',
  SENT: 'border-tpc-green/40 bg-tpc-green/10 text-tpc-green',
  FAILED: 'border-tpc-red/40 bg-tpc-red/10 text-tpc-red',
}

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

export const CampanhasView = ({ campaigns }: Props) => {
  const router = useRouter()
  const api = useApi()
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createDraft = async () => {
    if (creating) return
    setCreating(true)
    setError(null)
    try {
      const res = await api.post<{ id: string }>('/admin/marketing-campaigns', {
        subject: 'Nova campanha',
        title: 'Título da campanha',
        body:
          'Comece editando o corpo da mensagem.\n\nCada parágrafo é separado por uma linha em branco.',
      })
      router.push(`/admin/marketing/${res.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar rascunho')
      setCreating(false)
    }
  }

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-6 md:px-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold tracking-[-0.03em] text-tpc-text">
            Campanhas de marketing
          </h1>
          <p className="mt-1 text-[13px] text-tpc-text-secondary">
            Emails de ofertas/novidades pra usuários opt-in. LGPD: só envia
            pra quem aceitou marketing.
          </p>
        </div>
        <button
          type="button"
          onClick={createDraft}
          disabled={creating}
          className="cursor-pointer rounded-[10px] bg-tpc-red px-3 py-1.5 text-[12px] font-semibold text-tpc-text shadow-md shadow-tpc-red/20 transition hover:bg-tpc-red-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {creating ? 'Criando…' : '+ Nova campanha'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-[10px] border border-tpc-red/40 bg-tpc-red/10 px-3 py-2 text-[12px] text-tpc-red">
          {error}
        </div>
      )}

      {campaigns.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-tpc-text-secondary">
            Nenhuma campanha criada ainda. Clica em &quot;Nova campanha&quot;
            pra começar.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {campaigns.map((c) => (
            <CampaignRow key={c.id} campaign={c} />
          ))}
        </div>
      )}
    </div>
  )
}

const CampaignRow = ({ campaign }: { campaign: CampaignListItem }) => {
  return (
    <Link
      href={`/admin/marketing/${campaign.id}`}
      className="block rounded-xl border border-tpc-border bg-tpc-surface p-4 transition hover:border-tpc-border-strong hover:bg-tpc-elevated"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <span className="truncate text-[15px] font-semibold tracking-tight text-tpc-text">
              {campaign.title}
            </span>
            <span
              className={cn(
                'rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em]',
                STATUS_CLS[campaign.status],
              )}
            >
              {STATUS_LABEL[campaign.status]}
            </span>
          </div>
          <div className="mt-1 truncate text-[12px] text-tpc-text-secondary">
            {campaign.subject}
          </div>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-tpc-text-tertiary">
            <span>por {campaign.createdBy.name.split(' ')[0]}</span>
            <span>·</span>
            <span>criada {formatDate(campaign.createdAt)}</span>
            {campaign.sentAt && (
              <>
                <span>·</span>
                <span>enviada {formatDate(campaign.sentAt)}</span>
              </>
            )}
          </div>
        </div>

        {campaign.status !== 'DRAFT' && (
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            <div className="tpc-num text-[15px] font-bold tracking-tight text-tpc-text">
              {campaign.deliveriesCount}
            </div>
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-tpc-text-tertiary">
              destinatários
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}
