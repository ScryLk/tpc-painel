'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Fragment, useEffect, useState, useTransition } from 'react'

import { useApi } from '@/lib/api/client'
import { formatDateBR, formatDateTimeBR, formatPoints } from '@tpc/lib/formatters'
import { Button, Card, DiagonalStripes, cn } from '@tpc/ui'

import { ClientShell } from '@/components/layout/ClientShell'

const CANCEL_REASONS = [
  'Mudança de planos',
  'Encontrei outra data',
  'Emergência pessoal',
  'Decidi não fazer agora',
  'Outro motivo',
] as const

type CancelReason = (typeof CANCEL_REASONS)[number]

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
    description: 'TPC vai entrar em contato em até 2 horas.',
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

const slotLabel = (s: Solicitacao['slot']): string =>
  s === 'MANHA' ? 'Manhã (08-12h)' : 'Tarde (13-18h)'

const cancellationDeadline = (
  scheduledISO: string,
  slot: Solicitacao['slot'],
): Date => {
  const d = new Date(scheduledISO)
  d.setHours(slot === 'MANHA' ? 8 : 13, 0, 0, 0)
  return new Date(d.getTime() - 24 * 60 * 60 * 1000)
}

interface Props {
  solicitacao: Solicitacao
  saldoAvailable: number
}

export const AgendamentoView = ({ solicitacao: initial, saldoAvailable }: Props) => {
  const router = useRouter()
  const api = useApi()
  const [solicitacao, setSolicitacao] = useState(initial)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reason, setReason] = useState<CancelReason | null>(null)
  const [customReason, setCustomReason] = useState('')

  const info = statusInfo[solicitacao.status]
  const canCancel =
    solicitacao.status === 'PENDENTE' || solicitacao.status === 'CONFIRMADA'

  const closeCancel = () => {
    if (isPending) return
    setCancelOpen(false)
    setReason(null)
    setCustomReason('')
    setError(null)
  }

  // Razão final que vai pro API. "Outro motivo" usa o texto da textarea;
  // os demais usam o label da chip selecionada.
  const finalReason =
    reason === 'Outro motivo' ? customReason.trim() : (reason ?? '')

  const canConfirmCancel =
    reason !== null &&
    (reason !== 'Outro motivo' || customReason.trim().length >= 3)

  const cancel = () => {
    if (!canConfirmCancel) return
    setError(null)
    startTransition(async () => {
      try {
        const res = await api.post<{
          solicitacao: Solicitacao
          refunded: number
          penalty: number
        }>(`/solicitacoes/${solicitacao.id}/cancel`, {
          reason: finalReason || undefined,
        })
        setSolicitacao((s) => ({
          ...s,
          ...res.solicitacao,
          status: 'CANCELADA',
        }))
        setCancelOpen(false)
      } catch (err) {
        const m = err instanceof Error ? err.message : 'Falha ao cancelar.'
        setError(m)
      }
    })
  }

  return (
    <ClientShell
      breadcrumbs={['Pedidos', solicitacao.protocol]}
      saldoAvailable={saldoAvailable}
    >
      <div className="mx-auto max-w-[1280px] px-6 py-4 md:px-10">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-bold leading-tight tracking-[-0.03em] text-tpc-text">
              Agendamento
            </h1>
            <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.14em] text-tpc-text-tertiary">
              {solicitacao.protocol}
            </p>
          </div>
          <StatusBadge color={info.color} label={info.label} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="min-w-0 space-y-3">
            <Card elevated className="relative overflow-hidden p-5">
              <div className="pointer-events-none absolute right-0 top-0 opacity-30">
                <DiagonalStripes
                  width={220}
                  height={120}
                  thickness={1.4}
                  spacing={10}
                  mask="top-right"
                />
              </div>
              <div className="relative">
                <h2 className="text-[18px] font-bold leading-tight tracking-tight text-tpc-text">
                  {solicitacao.status === 'PENDENTE'
                    ? 'Solicitação enviada'
                    : info.label}
                </h2>
                <p className="mt-1 text-[13px] text-tpc-text-secondary">
                  {info.description}
                </p>
                <div className="mt-5">
                  <StatusTimeline solicitacao={solicitacao} />
                </div>
              </div>
            </Card>

            <Card className="divide-y divide-tpc-border p-0">
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
              <DetailRow
                label="Carro"
                value={`${solicitacao.car.brand} ${solicitacao.car.model} · ${solicitacao.car.plate}`}
              />
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
              <DetailRow label="Protocolo" value={solicitacao.protocol} mono />
            </Card>

            {solicitacao.observations && (
              <Card className="p-4">
                <div className="tpc-eyebrow mb-1.5">Observações</div>
                <p className="text-[13px] leading-relaxed text-tpc-text">
                  {solicitacao.observations}
                </p>
              </Card>
            )}
          </div>

          <aside className="lg:sticky lg:top-4 lg:self-start">
            <div className="space-y-3">
              {solicitacao.status === 'PENDENTE' && (
                <Card className="border-tpc-green/30 bg-tpc-green/[0.06] p-4">
                  <div className="tpc-eyebrow !text-tpc-green">
                    Cancelamento grátis
                  </div>
                  <div className="mt-1 text-[12.5px] text-tpc-text">
                    Até{' '}
                    {formatDateTimeBR(
                      cancellationDeadline(
                        solicitacao.scheduledDate,
                        solicitacao.slot,
                      ),
                    )}
                    {' · '}pontos voltam 100%
                  </div>
                </Card>
              )}

              {error && (
                <div className="rounded-xl border border-tpc-red/40 bg-tpc-red/10 px-3.5 py-2.5 text-[12.5px] text-tpc-red">
                  {error}
                </div>
              )}

              <Card className="flex flex-col gap-2 p-4">
                <div className="tpc-eyebrow mb-1">Ações</div>
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
                <Link href="/dashboard" className="block">
                  <Button fullWidth>Voltar pro painel</Button>
                </Link>
                {canCancel && (
                  <>
                    <div className="my-1 h-px bg-tpc-border" />
                    <button
                      type="button"
                      onClick={() => setCancelOpen(true)}
                      className="flex items-center justify-center gap-2 rounded-[10px] border border-tpc-red/40 bg-tpc-red/[0.06] py-2.5 text-[12.5px] font-semibold text-tpc-red transition hover:border-tpc-red/60 hover:bg-tpc-red/10"
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
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                      Cancelar agendamento
                    </button>
                  </>
                )}
              </Card>
            </div>
          </aside>
        </div>
      </div>

      {cancelOpen && canCancel && (
        <CancelModal
          reason={reason}
          customReason={customReason}
          submitting={isPending}
          error={error}
          canConfirm={canConfirmCancel}
          onClose={closeCancel}
          onSelectReason={setReason}
          onCustomReasonChange={setCustomReason}
          onConfirm={cancel}
        />
      )}
    </ClientShell>
  )
}

// ----------------------------------------------------------------------------
// Modal de cancelamento — coleta o motivo antes de disparar o cancel.
// ----------------------------------------------------------------------------

const CancelModal = ({
  reason,
  customReason,
  submitting,
  error,
  canConfirm,
  onClose,
  onSelectReason,
  onCustomReasonChange,
  onConfirm,
}: {
  reason: CancelReason | null
  customReason: string
  submitting: boolean
  error: string | null
  canConfirm: boolean
  onClose: () => void
  onSelectReason: (r: CancelReason) => void
  onCustomReasonChange: (v: string) => void
  onConfirm: () => void
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose, submitting])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal
        className="relative flex w-full max-w-[480px] flex-col gap-4 rounded-2xl border border-tpc-border bg-tpc-bg p-5 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[17px] font-bold tracking-tight text-tpc-red">
              Cancelar agendamento
            </h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-tpc-text-secondary">
              Conta pra TPC o motivo. Dependendo de quanto falta pra data, parte
              dos pontos pode virar multa.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Fechar"
            className="cursor-pointer rounded-md p-1 text-tpc-text-tertiary transition hover:bg-tpc-surface hover:text-tpc-text disabled:cursor-not-allowed"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-tpc-text-secondary">
            Motivo
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CANCEL_REASONS.map((r) => {
              const active = reason === r
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => onSelectReason(r)}
                  disabled={submitting}
                  className={cn(
                    'cursor-pointer rounded-full border px-3 py-1.5 text-[12px] transition',
                    active
                      ? 'border-tpc-red bg-tpc-red/15 text-tpc-red'
                      : 'border-tpc-border bg-tpc-surface text-tpc-text-secondary hover:border-tpc-border-strong hover:text-tpc-text',
                    submitting && 'cursor-not-allowed opacity-60',
                  )}
                >
                  {r}
                </button>
              )
            })}
          </div>
        </div>

        {reason === 'Outro motivo' && (
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-tpc-text-secondary">
              Conta pra gente
            </label>
            <textarea
              value={customReason}
              onChange={(e) => onCustomReasonChange(e.target.value.slice(0, 500))}
              placeholder="O que aconteceu? (min 3 caracteres)"
              rows={3}
              disabled={submitting}
              className="w-full rounded-[10px] border border-tpc-border bg-tpc-surface px-3 py-2 text-[13px] text-tpc-text outline-none placeholder:text-tpc-text-tertiary focus:border-tpc-red focus:ring-2 focus:ring-tpc-red/30 disabled:opacity-60"
            />
            <div className="mt-0.5 text-right font-mono text-[9px] tracking-wider text-tpc-text-tertiary">
              {customReason.length}/500
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-[10px] border border-tpc-red/40 bg-tpc-red/10 px-3 py-2 text-[12px] text-tpc-red">
            {error}
          </div>
        )}

        <div className="mt-1 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-[10px] border border-tpc-border bg-tpc-surface px-3.5 py-2 text-[12px] text-tpc-text-secondary transition hover:text-tpc-text disabled:opacity-60"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm || submitting}
            className="rounded-[10px] bg-tpc-red px-3.5 py-2 text-[12px] font-semibold text-tpc-text shadow-md shadow-tpc-red/20 transition hover:bg-tpc-red-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Cancelando…' : 'Confirmar cancelamento'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-tpc-text-tertiary">
        {label}
      </span>
      <span
        className={cn(
          'text-[13px] font-medium text-tpc-text',
          mono && 'font-mono text-[11px] tracking-wider',
        )}
      >
        {value}
      </span>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Timeline de status — 4 etapas do ponto de vista do cliente:
//   1. Solicitação enviada (createdAt)
//   2. TPC confirma (confirmedAt)
//   3. Véspera / fim do cancelamento grátis (D-1 do scheduledDate)
//   4. Dia do serviço (scheduledDate)
//
// Se a solicitação foi cancelada, mostra X vermelho na etapa onde estava
// quando o cancelamento aconteceu (ex: cancelou antes da TPC confirmar → X
// na etapa 2; cancelou depois de confirmada e antes da véspera → X na 3).
// ----------------------------------------------------------------------------

type StepState = 'done' | 'current' | 'future' | 'cancelled'

interface TimelineStep {
  label: string
  date: string | null
  state: StepState
}

const formatShort = (iso: string | Date): string => {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

const StatusTimeline = ({ solicitacao }: { solicitacao: Solicitacao }) => {
  const now = new Date()
  const scheduled = new Date(solicitacao.scheduledDate)

  // D-1 (véspera): scheduled date - 24h, com horário base do slot
  const dminus1 = (() => {
    const d = new Date(scheduled)
    d.setHours(solicitacao.slot === 'MANHA' ? 8 : 13, 0, 0, 0)
    return new Date(d.getTime() - 24 * 60 * 60 * 1000)
  })()

  const states: StepState[] = ['future', 'future', 'future', 'future']
  const cancelledAt = solicitacao.cancelledAt
    ? new Date(solicitacao.cancelledAt)
    : null

  if (solicitacao.status === 'CANCELADA') {
    states[0] = 'done'
    if (solicitacao.confirmedAt) {
      states[1] = 'done'
      // cancelou DEPOIS de confirmada: X na 3 (se cancelou antes da véspera)
      // ou na 4 (se cancelou perto/depois do dia do serviço)
      const ref = cancelledAt ?? now
      if (ref.getTime() >= dminus1.getTime()) {
        states[2] = 'done'
        states[3] = 'cancelled'
      } else {
        states[2] = 'cancelled'
      }
    } else {
      // PENDENTE → CANCELADA: X na etapa 2 (nunca chegou a ser confirmada)
      states[1] = 'cancelled'
    }
  } else if (solicitacao.status === 'CONCLUIDA') {
    states[0] = states[1] = states[2] = states[3] = 'done'
  } else if (solicitacao.status === 'EM_EXEC') {
    states[0] = states[1] = states[2] = 'done'
    states[3] = 'current'
  } else if (solicitacao.status === 'CONFIRMADA') {
    states[0] = 'done'
    states[1] = 'done'
    if (now.getTime() >= dminus1.getTime()) {
      states[2] = 'done'
      states[3] = 'current'
    } else {
      states[2] = 'current'
    }
  } else {
    // PENDENTE
    states[0] = 'done'
    states[1] = 'current'
  }

  const steps: TimelineStep[] = [
    {
      label: 'Solicitação',
      date: formatShort(solicitacao.createdAt),
      state: states[0]!,
    },
    {
      label: 'TPC confirma',
      date: solicitacao.confirmedAt
        ? formatShort(solicitacao.confirmedAt)
        : states[1] === 'current'
          ? 'em breve'
          : states[1] === 'cancelled'
            ? '—'
            : null,
      state: states[1]!,
    },
    {
      label: 'Véspera',
      date: formatShort(dminus1),
      state: states[2]!,
    },
    {
      label: 'Dia do serviço',
      date: formatShort(scheduled),
      state: states[3]!,
    },
  ]

  return (
    <div className="flex items-start">
      {steps.map((step, i) => (
        <Fragment key={i}>
          <div className="flex min-w-0 flex-shrink-0 flex-col items-center">
            <StepDot state={step.state} number={i + 1} />
            <div className="mt-2 max-w-[90px] text-center">
              <div
                className={cn(
                  'text-[10.5px] font-semibold leading-tight tracking-tight',
                  step.state === 'current' && 'text-tpc-text',
                  step.state === 'done' && 'text-tpc-text-secondary',
                  step.state === 'future' && 'text-tpc-text-tertiary',
                  step.state === 'cancelled' && 'text-tpc-red',
                )}
              >
                {step.label}
              </div>
              {step.date && (
                <div
                  className={cn(
                    'mt-0.5 font-mono text-[9px] uppercase tracking-[0.1em]',
                    step.state === 'cancelled'
                      ? 'text-tpc-red/70'
                      : 'text-tpc-text-tertiary',
                  )}
                >
                  {step.date}
                </div>
              )}
            </div>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                'mt-[11px] h-[2px] flex-1 rounded-full',
                connectorClass(step.state, steps[i + 1]!.state),
              )}
            />
          )}
        </Fragment>
      ))}
    </div>
  )
}

const connectorClass = (a: StepState, b: StepState): string => {
  // Color reflete o que ACONTECEU naquele segmento
  if (a === 'done' && (b === 'done' || b === 'current')) return 'bg-tpc-green/60'
  if (a === 'done' && b === 'cancelled') return 'bg-tpc-red/60'
  if (a === 'cancelled') return 'bg-tpc-red/15'
  if (a === 'current') return 'bg-tpc-border'
  return 'bg-tpc-border'
}

const StepDot = ({ state, number }: { state: StepState; number: number }) => {
  if (state === 'done') {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-tpc-green text-tpc-bg shadow-[0_0_0_3px_rgba(34,224,122,0.15)]">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M5 12l5 5L20 7" />
        </svg>
      </div>
    )
  }
  if (state === 'current') {
    return (
      <div className="relative flex h-6 w-6 items-center justify-center">
        <span className="absolute inset-[-4px] animate-[tpc-pulse_1.8s_ease-in-out_infinite] rounded-full bg-tpc-yellow/25" />
        <div className="relative flex h-6 w-6 items-center justify-center rounded-full border-2 border-tpc-yellow bg-tpc-yellow/15 font-mono text-[10px] font-bold text-tpc-yellow">
          {number}
        </div>
      </div>
    )
  }
  if (state === 'cancelled') {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-tpc-red text-tpc-text shadow-[0_0_0_3px_rgba(225,38,28,0.2)]">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </div>
    )
  }
  // future
  return (
    <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-tpc-border bg-tpc-bg font-mono text-[10px] font-semibold text-tpc-text-tertiary">
      {number}
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
        'flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em]',
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
