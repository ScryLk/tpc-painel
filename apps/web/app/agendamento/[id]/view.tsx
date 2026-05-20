'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { useApi } from '@/lib/api/client'
import { formatDateBR, formatDateTimeBR, formatPoints } from '@tpc/lib/formatters'
import {
  BackButton,
  Button,
  Card,
  DiagonalStripes,
  ScreenChrome,
  TPCHeader,
  cn,
} from '@tpc/ui'

interface Solicitacao {
  id: string
  protocol: string
  status: 'PENDENTE' | 'CONFIRMADA' | 'EM_EXEC' | 'CONCLUIDA' | 'CANCELADA'
  scheduledDate: string
  endDate: string | null
  slot: 'MANHA' | 'TARDE'
  observations: string | null
  pointsReserved: number
  pointsDebited: number
  cancelReason: string | null
  refundPct: number | null
  confirmedAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  createdAt: string
  reservationExpiresAt: string | null
  service: { name: string; durationDays: number }
  car: { brand: string; model: string; plate: string }
}

const statusInfo: Record<
  Solicitacao['status'],
  { label: string; color: 'yellow' | 'green' | 'red' | 'gray'; description: string }
> = {
  PENDENTE: {
    label: 'Aguardando confirmação',
    color: 'yellow',
    description: 'TPC vai chamar no WhatsApp em até 2 horas.',
  },
  CONFIRMADA: {
    label: 'Confirmado',
    color: 'green',
    description: 'TPC confirmou a data. Te esperamos no dia agendado.',
  },
  EM_EXEC: {
    label: 'Em execução',
    color: 'yellow',
    description: 'Carro tá na oficina sendo trabalhado.',
  },
  CONCLUIDA: {
    label: 'Concluído',
    color: 'green',
    description: 'Serviço finalizado. Pontos debitados.',
  },
  CANCELADA: {
    label: 'Cancelado',
    color: 'gray',
    description: 'Solicitação foi cancelada.',
  },
}

const slotLabel = (s: Solicitacao['slot']): string => (s === 'MANHA' ? 'Manhã (08-12h)' : 'Tarde (13-18h)')

const cancellationDeadline = (scheduledISO: string, slot: Solicitacao['slot']): Date => {
  const d = new Date(scheduledISO)
  d.setHours(slot === 'MANHA' ? 8 : 13, 0, 0, 0)
  return new Date(d.getTime() - 24 * 60 * 60 * 1000)
}

export const AgendamentoView = ({ solicitacao: initial }: { solicitacao: Solicitacao }) => {
  const router = useRouter()
  const api = useApi()
  const [solicitacao, setSolicitacao] = useState(initial)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const info = statusInfo[solicitacao.status]
  const canCancel =
    solicitacao.status === 'PENDENTE' || solicitacao.status === 'CONFIRMADA'

  const cancel = () => {
    setError(null)
    startTransition(async () => {
      try {
        const res = await api.post<{ solicitacao: Solicitacao; refunded: number; penalty: number }>(
          `/solicitacoes/${solicitacao.id}/cancel`,
          {},
        )
        setShowCancelConfirm(false)
        setSolicitacao((s) => ({ ...s, ...res.solicitacao, status: 'CANCELADA' }))
      } catch (err) {
        const m = err instanceof Error ? err.message : 'Falha ao cancelar.'
        setError(m)
      }
    })
  }

  return (
    <ScreenChrome>
      <TPCHeader
        back={<BackButton onClick={() => router.push('/dashboard')} />}
        title="Agendamento"
        subtitle={solicitacao.protocol}
      />

      <main className="tpc-scroll relative flex-1 overflow-y-auto px-4 pb-6 pt-4">
        <Card elevated className="relative mb-3 overflow-hidden p-5">
          <div className="pointer-events-none absolute right-0 top-0 opacity-40">
            <DiagonalStripes width={160} height={160} thickness={1.5} spacing={9} />
          </div>
          <div className="relative flex flex-col items-center gap-3">
            <StatusBadge color={info.color} label={info.label} />
            <h1 className="text-center text-xl font-bold leading-tight tracking-tight">
              {solicitacao.status === 'PENDENTE' ? 'Solicitação enviada' : info.label}
            </h1>
            <p className="text-center text-sm text-tpc-text-secondary">{info.description}</p>
          </div>
        </Card>

        <Card className="mb-3 divide-y divide-tpc-border p-0">
          <DetailRow label="Serviço" value={solicitacao.service.name} />
          <DetailRow
            label="Data"
            value={
              solicitacao.endDate
                ? `${formatDateBR(solicitacao.scheduledDate)} → ${formatDateBR(
                    solicitacao.endDate,
                  )}`
                : formatDateBR(solicitacao.scheduledDate)
            }
          />
          <DetailRow label="Chegada" value={slotLabel(solicitacao.slot)} />
          <DetailRow label="Local" value="TPC Performance · Panambi/RS" />
          <DetailRow label="Carro" value={`${solicitacao.car.brand} ${solicitacao.car.model} · ${solicitacao.car.plate}`} />
          <DetailRow
            label="Pontos reservados"
            value={`${formatPoints(solicitacao.pointsReserved)} pts`}
          />
          {solicitacao.status === 'CANCELADA' && solicitacao.refundPct !== null && (
            <DetailRow
              label="Reembolso"
              value={`${solicitacao.refundPct}% (${formatPoints(
                Math.floor((solicitacao.pointsReserved * solicitacao.refundPct) / 100),
              )} pts voltaram)`}
            />
          )}
          <div className="flex justify-between px-4 py-2.5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-tpc-text-tertiary">
              Protocolo
            </span>
            <span className="font-mono text-[11px] tracking-wider">{solicitacao.protocol}</span>
          </div>
        </Card>

        {solicitacao.status === 'PENDENTE' && (
          <Card className="mb-3 border-tpc-green/30 bg-tpc-green/[0.06] p-3.5">
            <div className="tpc-eyebrow !text-tpc-green">Cancelamento grátis</div>
            <div className="mt-1 text-sm text-tpc-text">
              Até {formatDateTimeBR(cancellationDeadline(solicitacao.scheduledDate, solicitacao.slot))}
              {' · '}pontos voltam 100%
            </div>
          </Card>
        )}

        {solicitacao.observations && (
          <Card className="mb-3 p-3.5">
            <div className="tpc-eyebrow">Observações</div>
            <p className="mt-1 text-sm leading-relaxed text-tpc-text">{solicitacao.observations}</p>
          </Card>
        )}

        {error && (
          <div className="mb-3 rounded-xl border border-tpc-red/40 bg-tpc-red/10 px-3.5 py-2.5 text-sm text-tpc-red">
            {error}
          </div>
        )}

        {showCancelConfirm && canCancel && (
          <Card className="mb-3 border-tpc-red/30 bg-tpc-red/[0.06] p-4">
            <div className="text-sm font-semibold tracking-tight">Tem certeza?</div>
            <p className="mt-1 text-xs text-tpc-text-secondary">
              Dependendo de quanto falta pra data, parte dos pontos pode virar multa.
            </p>
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" fullWidth onClick={() => setShowCancelConfirm(false)}>
                Não
              </Button>
              <Button fullWidth onClick={cancel} disabled={isPending}>
                {isPending ? 'Cancelando…' : 'Sim, cancelar'}
              </Button>
            </div>
          </Card>
        )}

        <div className="flex flex-col gap-2">
          <Link
            href="https://wa.me/5555555555550?text=Quero%20falar%20do%20agendamento"
            target="_blank"
            rel="noopener"
            className="block"
          >
            <Button variant="secondary" fullWidth>
              Falar no WhatsApp
            </Button>
          </Link>
          {canCancel && !showCancelConfirm && (
            <button
              type="button"
              onClick={() => setShowCancelConfirm(true)}
              className="rounded-full bg-transparent py-2 text-sm text-tpc-text-tertiary transition hover:text-tpc-red"
            >
              Cancelar agendamento
            </button>
          )}
          <Link href="/dashboard" className="block">
            <Button fullWidth>Voltar pro painel</Button>
          </Link>
        </div>
      </main>
    </ScreenChrome>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-[11px] uppercase tracking-wider text-tpc-text-tertiary">{label}</span>
      <span className="text-sm font-medium text-tpc-text">{value}</span>
    </div>
  )
}

function StatusBadge({
  color,
  label,
}: {
  color: 'yellow' | 'green' | 'red' | 'gray'
  label: string
}) {
  const colorMap = {
    yellow: 'border-tpc-yellow/30 bg-tpc-yellow/15 text-tpc-yellow',
    green: 'border-tpc-green/30 bg-tpc-green/15 text-tpc-green',
    red: 'border-tpc-red/30 bg-tpc-red/15 text-tpc-red',
    gray: 'border-tpc-border bg-tpc-elevated-2 text-tpc-text-tertiary',
  } as const
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em]',
        colorMap[color],
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inset-0 animate-[tpc-pulse_1.8s_ease-in-out_infinite] rounded-full bg-current opacity-70" />
        <span className="relative h-1.5 w-1.5 rounded-full bg-current" />
      </span>
      {label}
    </div>
  )
}
