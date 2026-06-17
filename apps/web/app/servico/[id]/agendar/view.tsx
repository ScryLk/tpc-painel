'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'

import { useApi } from '@/lib/api/client'
import { computeEndDate, isBusinessDay, isPastDate } from '@tpc/lib/business'
import { formatPoints } from '@tpc/lib/formatters'
import type { ArrivalSlot } from '@tpc/lib/validators'
import { Button, Card, MonthCalendar, cn } from '@tpc/ui'

import { ClientShell } from '@/components/layout/ClientShell'

interface Servico {
  id: string
  name: string
  pts: number
  durationDays: number
  category: 'PERFORMANCE' | 'AESTHETIC' | 'CONFIG'
}

interface Saldo {
  available: number
  reserved: number
  total: number
}

interface CarLite {
  id: string
  brand: string
  model: string
  motorType: string
  isActive: boolean
}

interface Props {
  servico: Servico
  saldo: Saldo
  activeCar: CarLite
}

interface SolicitacaoCreateResponse {
  solicitacao: {
    id: string
    protocol: string
  }
}

const today = (() => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
})()

const maxDate = (() => {
  const d = new Date()
  d.setMonth(d.getMonth() + 3)
  d.setHours(0, 0, 0, 0)
  return d
})()

const slotLabel: Record<ArrivalSlot, string> = {
  manha: 'Manhã · 08-12h',
  tarde: 'Tarde · 13-18h',
}

const formatDateBr = (date: Date): string =>
  date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

const toIsoDate = (date: Date): string => {
  const y = date.getFullYear()
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const d = date.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const AgendarView = ({ servico, saldo, activeCar }: Props) => {
  const router = useRouter()
  const api = useApi()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [focused, setFocused] = useState(today)
  const [selected, setSelected] = useState<Date | null>(null)
  const [slot, setSlot] = useState<ArrivalSlot>('manha')
  const [observations, setObservations] = useState('')

  const spanDays = useMemo(() => {
    if (!selected || servico.durationDays <= 1) return []
    const end = computeEndDate(selected, servico.durationDays)
    const out: Date[] = []
    const cursor = new Date(selected)
    while (cursor.getTime() < end.getTime()) {
      cursor.setDate(cursor.getDate() + 1)
      out.push(new Date(cursor))
    }
    return out
  }, [selected, servico.durationDays])

  const dayState = (date: Date): 'past' | 'closed' | 'ok' => {
    if (isPastDate(date)) return 'past'
    if (date.getTime() > maxDate.getTime()) return 'closed'
    if (!isBusinessDay(date)) return 'closed'
    return 'ok'
  }

  const submit = () => {
    if (!selected) return
    setError(null)
    startTransition(async () => {
      try {
        const res = await api.post<SolicitacaoCreateResponse>('/solicitacoes', {
          serviceId: servico.id,
          carId: activeCar.id,
          date: toIsoDate(selected),
          arrivalSlot: slot,
          observations: observations.trim() ? observations.trim() : undefined,
        })
        router.push(`/agendamento/${res.solicitacao.id}`)
      } catch (err) {
        const m = err instanceof Error ? err.message : 'Falha ao agendar.'
        setError(m)
      }
    })
  }

  return (
    <ClientShell
      breadcrumbs={['Catálogo', servico.name, 'Agendar']}
      saldoAvailable={saldo.available}
    >
      <div className="mx-auto max-w-[1280px] px-6 py-4 md:px-10">
        <div className="mb-3">
          <h1 className="text-[20px] font-bold leading-tight tracking-[-0.03em] text-tpc-text">
            Agendar serviço
          </h1>
          <p className="mt-0.5 text-[12px] text-tpc-text-secondary">
            {servico.name} · {activeCar.brand} {activeCar.model}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="min-w-0 space-y-3">
            <Card className="flex items-center gap-3 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-tpc-border bg-tpc-elevated-2 text-tpc-red">
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
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold tracking-tight">
                  TPC Performance · Panambi
                </div>
                <div className="text-[11px] text-tpc-text-secondary">
                  Carro: {activeCar.brand} {activeCar.model} ·{' '}
                  {activeCar.motorType.toUpperCase()}
                </div>
              </div>
            </Card>

            <div className="grid gap-3 md:grid-cols-2">
              <Card className="p-3">
                <MonthCalendar
                  focused={focused}
                  selected={selected}
                  today={today}
                  spanDays={spanDays}
                  dayState={dayState}
                  onSelect={setSelected}
                  onPrev={() =>
                    setFocused(new Date(focused.getFullYear(), focused.getMonth() - 1, 1))
                  }
                  onNext={() =>
                    setFocused(new Date(focused.getFullYear(), focused.getMonth() + 1, 1))
                  }
                  minMonth={today}
                  maxMonth={maxDate}
                />

                {servico.durationDays > 1 && selected && (
                  <div className="mt-2 rounded-lg border border-tpc-red/30 bg-tpc-red/[0.06] px-3 py-1.5 text-[11px]">
                    <span className="font-semibold text-tpc-red">Multi-dia:</span>{' '}
                    <span className="text-tpc-text">
                      Carro fica na TPC do dia {formatDateBr(selected)} ao{' '}
                      {formatDateBr(computeEndDate(selected, servico.durationDays))}.
                    </span>
                  </div>
                )}
              </Card>

              <div className="flex flex-col gap-3">
                <div>
                  <div className="tpc-eyebrow mb-1.5">Chegada</div>
                  <div className="grid grid-cols-2 gap-2">
                    {(['manha', 'tarde'] as ArrivalSlot[]).map((s) => {
                      const active = slot === s
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSlot(s)}
                          className={cn(
                            'cursor-pointer rounded-xl border px-3 py-3 text-left transition',
                            active
                              ? 'border-tpc-red bg-tpc-red/[0.08]'
                              : 'border-tpc-border bg-tpc-surface hover:border-tpc-red/40',
                          )}
                        >
                          <div className="text-[13px] font-semibold tracking-tight">
                            {slotLabel[s]}
                          </div>
                          <div
                            className={cn(
                              'mt-0.5 font-mono text-[9px] tracking-wider',
                              active ? 'text-tpc-red' : 'text-tpc-text-tertiary',
                            )}
                          >
                            {active ? 'Selecionado' : 'Clica pra selecionar'}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  <p className="mt-1.5 text-[11px] text-tpc-text-tertiary">
                    TPC confirma horário exato no WhatsApp.
                  </p>
                </div>

                <div>
                  <div className="tpc-eyebrow mb-1.5">Observações (opcional)</div>
                  <textarea
                    value={observations}
                    onChange={(e) => setObservations(e.target.value.slice(0, 500))}
                    placeholder="Qualquer detalhe pro tuner saber"
                    rows={3}
                    className="w-full rounded-xl border border-tpc-border bg-tpc-surface px-3 py-2 text-[13px] outline-none placeholder:text-tpc-text-tertiary focus:border-tpc-red focus:ring-2 focus:ring-tpc-red/30"
                  />
                  <div className="mt-0.5 text-right font-mono text-[9px] tracking-wider text-tpc-text-tertiary">
                    {observations.length}/500
                  </div>
                </div>
              </div>
            </div>

            <Card className="p-3">
              <div className="tpc-eyebrow mb-1.5">Política de cancelamento</div>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11.5px]">
                <li className="flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-tpc-green" />
                  <span className="text-tpc-text">+24h: livre, 100% volta</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-tpc-yellow" />
                  <span className="text-tpc-text">2h-24h: multa 20%</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-tpc-red" />
                  <span className="text-tpc-text">&lt;2h: aprovação manual</span>
                </li>
              </ul>
            </Card>
          </div>

          <aside className="lg:sticky lg:top-4 lg:self-start">
            <Card elevated className="p-4">
              <div className="tpc-eyebrow">Resumo</div>
              <div className="mt-1.5 text-[14px] font-semibold tracking-tight">
                {servico.name}
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="tpc-num text-[26px] font-semibold leading-none tracking-tight text-tpc-text">
                  {formatPoints(servico.pts)}
                </span>
                <span className="text-[11px] text-tpc-text-secondary">pts</span>
              </div>

              <div className="mt-3 space-y-1.5 border-t border-tpc-border pt-3 text-[11.5px]">
                <SummaryRow
                  label="Data escolhida"
                  value={selected ? formatDateBr(selected) : '—'}
                />
                <SummaryRow label="Chegada" value={slotLabel[slot]} />
                <SummaryRow
                  label="Saldo após reserva"
                  value={`${formatPoints(Math.max(0, saldo.available - servico.pts))} pts`}
                />
              </div>

              <div className="mt-3 rounded-lg border border-tpc-yellow/30 bg-tpc-yellow/10 p-2.5 text-[10.5px] leading-relaxed text-tpc-text-secondary">
                <span className="font-semibold text-tpc-yellow">Reserva:</span>{' '}
                {formatPoints(servico.pts)} pts ficam reservados até TPC confirmar
                (até 24h).
              </div>

              {error && (
                <div className="mt-2 rounded-lg border border-tpc-red/40 bg-tpc-red/10 px-3 py-1.5 text-[11px] text-tpc-red">
                  {error}
                </div>
              )}

              <div className="mt-3">
                <Button
                  fullWidth
                  disabled={!selected || isPending}
                  onClick={submit}
                >
                  {isPending
                    ? 'Enviando…'
                    : selected
                      ? `Confirmar reserva · ${formatPoints(servico.pts)} pts`
                      : 'Escolha uma data'}
                </Button>
                <p className="mt-1.5 text-center font-mono text-[9px] uppercase tracking-[0.14em] text-tpc-text-tertiary">
                  Pontos reservados até confirmação
                </p>
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </ClientShell>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-tpc-text-secondary">{label}</span>
      <span className="font-semibold text-tpc-text">{value}</span>
    </div>
  )
}
