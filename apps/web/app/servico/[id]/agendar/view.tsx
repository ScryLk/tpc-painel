'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'

import { useApi } from '@/lib/api/client'
import { computeEndDate, isBusinessDay, isPastDate } from '@tpc/lib/business'
import { formatPoints } from '@tpc/lib/formatters'
import type { ArrivalSlot } from '@tpc/lib/validators'
import {
  BackButton,
  Button,
  Card,
  MonthCalendar,
  PointsDisplay,
  ScreenChrome,
  TPCHeader,
  cn,
} from '@tpc/ui'

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
    <ScreenChrome>
      <TPCHeader
        back={<BackButton onClick={() => router.back()} />}
        title="Agendar"
        subtitle={servico.name}
        right={<PointsDisplay balance={saldo.available} compact />}
      />

      <main className="tpc-scroll flex-1 overflow-y-auto px-4 pb-32 pt-3">
        <Card className="mb-3 flex items-center gap-3 p-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-tpc-border bg-tpc-elevated-2 text-tpc-red">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold tracking-tight">TPC Performance · Panambi</div>
            <div className="text-[11px] text-tpc-text-secondary">Carro: {activeCar.brand} {activeCar.model}</div>
          </div>
        </Card>

        <Card className="mb-3 p-4">
          <MonthCalendar
            focused={focused}
            selected={selected}
            today={today}
            spanDays={spanDays}
            dayState={dayState}
            onSelect={setSelected}
            onPrev={() => setFocused(new Date(focused.getFullYear(), focused.getMonth() - 1, 1))}
            onNext={() => setFocused(new Date(focused.getFullYear(), focused.getMonth() + 1, 1))}
            minMonth={today}
            maxMonth={maxDate}
          />

          {servico.durationDays > 1 && selected && (
            <div className="mt-3 rounded-lg border border-tpc-red/30 bg-tpc-red/[0.06] px-3 py-2 text-xs">
              <span className="font-semibold text-tpc-red">Multi-dia:</span>{' '}
              <span className="text-tpc-text">
                Carro fica na TPC do dia {formatDateBr(selected)} ao{' '}
                {formatDateBr(computeEndDate(selected, servico.durationDays))}.
              </span>
            </div>
          )}
        </Card>

        <div className="mb-3">
          <div className="tpc-eyebrow mb-2 px-1">Chegada</div>
          <div className="grid grid-cols-2 gap-2">
            {(['manha', 'tarde'] as ArrivalSlot[]).map((s) => {
              const active = slot === s
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSlot(s)}
                  className={cn(
                    'rounded-xl border px-3 py-3 text-left transition',
                    active
                      ? 'border-tpc-red bg-tpc-red/[0.08]'
                      : 'border-tpc-border bg-tpc-surface',
                  )}
                >
                  <div className="text-sm font-semibold tracking-tight">{slotLabel[s]}</div>
                  <div
                    className={cn(
                      'mt-0.5 font-mono text-[9px] tracking-wider',
                      active ? 'text-tpc-red' : 'text-tpc-text-tertiary',
                    )}
                  >
                    {active ? 'Selecionado' : 'Toque pra selecionar'}
                  </div>
                </button>
              )
            })}
          </div>
          <p className="mt-1.5 px-1 text-[11px] text-tpc-text-tertiary">
            TPC confirma horário exato no WhatsApp.
          </p>
        </div>

        <div className="mb-3">
          <div className="tpc-eyebrow mb-2 px-1">Observações (opcional)</div>
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value.slice(0, 500))}
            placeholder="Qualquer detalhe pro tuner saber"
            rows={3}
            className="w-full rounded-xl border border-tpc-border bg-tpc-surface px-3.5 py-2.5 text-sm outline-none placeholder:text-tpc-text-tertiary focus:border-tpc-red focus:ring-2 focus:ring-tpc-red/30"
          />
          <div className="mt-1 text-right font-mono text-[9px] tracking-wider text-tpc-text-tertiary">
            {observations.length}/500
          </div>
        </div>

        <Card className="mb-3 p-3.5">
          <div className="tpc-eyebrow mb-2">Política de cancelamento</div>
          <ul className="space-y-1.5 text-xs">
            <li className="flex items-start gap-2">
              <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-tpc-green" />
              <span className="text-tpc-text">Mais de 24h antes: cancelamento livre, 100% volta</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-tpc-yellow" />
              <span className="text-tpc-text">Entre 2h e 24h: multa de 20%, 80% volta</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-tpc-red" />
              <span className="text-tpc-text">Menos de 2h antes: aprovação manual TPC</span>
            </li>
          </ul>
        </Card>

        <div className="rounded-xl border border-tpc-yellow/30 bg-tpc-yellow/[0.08] px-3.5 py-2.5 text-xs text-tpc-text-secondary">
          <span className="font-semibold text-tpc-yellow">Reserva:</span>{' '}
          {formatPoints(servico.pts)} pts ficam reservados até TPC confirmar (até 24h).
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-tpc-red/40 bg-tpc-red/10 px-3.5 py-2.5 text-sm text-tpc-red">
            {error}
          </div>
        )}
      </main>

      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[420px] border-t border-tpc-border bg-tpc-bg px-5 pb-5 pt-3">
        <Button fullWidth disabled={!selected || isPending} onClick={submit}>
          {isPending
            ? 'Enviando…'
            : selected
              ? `Confirmar · reservar ${formatPoints(servico.pts)} pts · ${formatDateBr(selected)}`
              : 'Escolha uma data'}
        </Button>
        <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.14em] text-tpc-text-tertiary">
          Pontos ficam reservados até TPC confirmar
        </p>
      </div>
    </ScreenChrome>
  )
}
