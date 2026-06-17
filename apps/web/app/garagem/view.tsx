'use client'

import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'

import { useApi } from '@/lib/api/client'
import { Button, Card, DiagonalStripes, cn } from '@tpc/ui'

import { ClientShell } from '@/components/layout/ClientShell'

import type { CarItem } from './page'

// Lazy-load: o wizard de 5 passos + brand logos só vai pro bundle quando
// o usuário abre o modal. Reduz o initial JS da rota /garagem.
const AddCarModal = dynamic(
  () => import('./_components/AddCarModal').then((m) => m.AddCarModal),
  { ssr: false },
)

interface Saldo {
  available: number
  reserved: number
  total: number
}

interface Props {
  cars: CarItem[]
  meta: { count: number; limit: number }
  saldo: Saldo
}

const mapStateLabel: Record<CarItem['mapState'], string> = {
  STOCK: 'STOCK',
  STAGE1: 'STAGE 1 ATIVO',
  STAGE2: 'STAGE 2 ATIVO',
  STAGE3: 'STAGE 3 ATIVO',
}

export const GaragemView = ({ cars, meta, saldo }: Props) => {
  const atLimit = meta.count >= meta.limit
  const isEmpty = meta.count === 0
  const searchParams = useSearchParams()
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    if (searchParams.get('add') === '1') {
      setShowAddModal(true)
      window.history.replaceState({}, '', '/garagem')
    }
  }, [searchParams])

  const openAdd = () => setShowAddModal(true)

  return (
    <ClientShell breadcrumbs={['Garagem']} saldoAvailable={saldo.available}>
      {isEmpty ? (
        <GaragemEmpty onAdd={openAdd} />
      ) : (
        <GaragemDesktop
          cars={cars}
          meta={meta}
          atLimit={atLimit}
          onAdd={openAdd}
        />
      )}
      <AddCarModal open={showAddModal} onClose={() => setShowAddModal(false)} />
    </ClientShell>
  )
}

const GaragemDesktop = ({
  cars,
  meta,
  atLimit,
  onAdd,
}: {
  cars: CarItem[]
  meta: Props['meta']
  atLimit: boolean
  onAdd: () => void
}) => {
  const [selectedId, setSelectedId] = useState<string>(cars[0]?.id ?? '')
  const selected = cars.find((c) => c.id === selectedId) ?? cars[0]
  const activeCar = cars.find((c) => c.isActive)

  if (!selected) return null

  return (
    <div className="px-5 py-6 md:px-8 md:py-7">
      <div className="mb-5 flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-[26px] font-bold leading-tight tracking-[-0.03em] text-tpc-text">
            Minha garagem
          </h1>
          <p className="mt-1 text-[13px] text-tpc-text-secondary">
            {meta.count} de {meta.limit} carros cadastrados
            {activeCar && ` · ${activeCar.brand} ${activeCar.model} é o ativo`}
          </p>
        </div>
        <AddCarButton atLimit={atLimit} onAdd={onAdd} />
      </div>

      {atLimit && (
        <div className="mb-5 flex items-center gap-2.5 rounded-[10px] border border-tpc-yellow/30 bg-tpc-yellow/[0.06] px-3.5 py-2.5">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-tpc-yellow"
            aria-hidden
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4M12 16v.01" />
          </svg>
          <div className="flex-1 text-xs leading-relaxed text-tpc-text-secondary">
            <span className="font-semibold text-tpc-text">Limite atingido.</span>{' '}
            Máximo {meta.limit} carros por conta. Remove um pra adicionar outro.
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-2.5">
          {cars.map((c) => (
            <GarageCarRow
              key={c.id}
              car={c}
              selected={c.id === selected.id}
              onSelect={() => setSelectedId(c.id)}
            />
          ))}
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <GarageSidepanel car={selected} />
        </div>
      </div>
    </div>
  )
}

const AddCarButton = ({
  atLimit,
  onAdd,
}: {
  atLimit: boolean
  onAdd: () => void
}) => {
  const inner = (
    <>
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
      Adicionar carro
    </>
  )
  if (atLimit) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex cursor-not-allowed items-center gap-2 rounded-[10px] border border-tpc-border bg-tpc-surface px-4 py-2.5 text-[13px] font-semibold text-tpc-text-tertiary opacity-60"
      >
        {inner}
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onAdd}
      className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] bg-tpc-red px-4 py-2.5 text-[13px] font-semibold text-tpc-text shadow-md shadow-tpc-red/20 transition hover:bg-tpc-red-dark"
    >
      {inner}
    </button>
  )
}

const GarageCarRow = ({
  car,
  selected,
  onSelect,
}: {
  car: CarItem
  selected: boolean
  onSelect: () => void
}) => {
  const status = computeStatus(car)
  return (
    <Card
      onClick={onSelect}
      className={cn(
        'cursor-pointer p-0 transition',
        selected
          ? 'border-tpc-red/60 shadow-[0_0_18px_rgba(225,38,28,0.13)]'
          : 'hover:border-tpc-border-strong',
      )}
    >
      <div className="flex items-center gap-4 p-3.5">
        <div className="relative h-[75px] w-[130px] flex-shrink-0">
          <img
            src="/sprites/car-neon.webp"
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-contain"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="truncate text-base font-bold tracking-[-0.02em] text-tpc-text">
              {car.brand} {car.model}
            </span>
            {car.isActive && (
              <span className="rounded-[3px] bg-tpc-red px-1.5 py-[2px] font-mono text-[7px] font-bold uppercase tracking-[0.18em] text-tpc-text">
                Ativo
              </span>
            )}
          </div>
          <div className="mb-1.5 font-mono text-[10px] tracking-[0.04em] text-tpc-text-secondary">
            {car.year} · {car.motorType.toUpperCase()}
          </div>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2 py-[3px] font-mono text-[8px] font-bold uppercase tracking-[0.12em]',
              status.classes,
            )}
          >
            {status.pulse && (
              <span
                className={cn(
                  'inline-block h-[5px] w-[5px] animate-[tpc-pulse_1.8s_ease-in-out_infinite] rounded-full shadow-[0_0_5px_currentColor]',
                  status.dotClass,
                )}
              />
            )}
            {status.label}
          </span>
        </div>

        <div className="flex flex-shrink-0 items-center gap-3">
          <div className="rounded border border-tpc-border-strong px-2 py-[5px] font-mono text-[11px] font-semibold tracking-[0.1em] text-tpc-text">
            {car.plate}
          </div>
          {selected && (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-tpc-red"
              aria-hidden
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          )}
        </div>
      </div>
    </Card>
  )
}

const GarageSidepanel = ({ car }: { car: CarItem }) => {
  const router = useRouter()
  const api = useApi()
  const [isPending, startTransition] = useTransition()

  const activate = () => {
    if (car.isActive) return
    startTransition(async () => {
      try {
        await api.post(`/me/cars/${car.id}/activate`)
        router.refresh()
      } catch {
        /* swallow */
      }
    })
  }

  const [customError, setCustomError] = useState<string | null>(null)
  const [customPending, customTransition] = useTransition()
  const startCustomOrder = () => {
    setCustomError(null)
    customTransition(async () => {
      try {
        const res = await api.post<{ order: { id: string } }>('/remap-orders', {
          carId: car.id,
          isCustomQuote: true,
          technicalData: {
            description: `Atendimento personalizado aberto pela garagem · ${car.brand} ${car.model} ${car.year} (${car.motorType}). Cliente envia detalhes pelo chat.`,
          },
        })
        router.push(`/pedido/${res.order.id}`)
      } catch (err) {
        setCustomError(
          err instanceof Error ? err.message : 'Falha ao abrir atendimento.',
        )
      }
    })
  }

  return (
    <Card
      className="overflow-hidden border-tpc-red/50 p-0 shadow-[0_0_24px_rgba(225,38,28,0.13)]"
      elevated={false}
    >
      <div className="relative h-[180px]">
        <img
          src="/sprites/car-neon.webp"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-contain px-6"
        />
        {car.isActive && (
          <div className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-tpc-red px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-tpc-text shadow-[0_2px_8px_rgba(225,38,28,0.4)]">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" />
            </svg>
            Ativo
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="mb-3.5 flex items-start justify-between gap-2.5">
          <div>
            <div className="text-xl font-bold tracking-[-0.03em] text-tpc-text">
              {car.brand} {car.model}
            </div>
            <div className="mt-1 font-mono text-[11px] tracking-[0.04em] text-tpc-text-secondary">
              {car.year} · {car.motorType.toUpperCase()}
            </div>
          </div>
          <div className="rounded border border-tpc-border-strong px-2 py-[5px] font-mono text-[11px] font-semibold tracking-[0.1em] text-tpc-text">
            {car.plate}
          </div>
        </div>

        <div className="mb-3.5 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-tpc-border bg-tpc-surface p-2.5">
            <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-tpc-text-tertiary">
              Estado do mapa
            </div>
            <div className="tpc-num mt-1 text-sm font-semibold tracking-[-0.02em] text-tpc-text">
              {mapStateLabel[car.mapState]}
            </div>
          </div>
          <div className="rounded-lg border border-tpc-border bg-tpc-surface p-2.5">
            <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-tpc-text-tertiary">
              Pedidos
            </div>
            <div className="tpc-num mt-1 text-sm font-semibold tracking-[-0.02em] text-tpc-text">
              {car.activeOrder ? 1 + car.extraOrders : car.extraOrders}
            </div>
          </div>
        </div>

        {car.activeOrder && (
          <div
            className={cn(
              'mb-3.5 flex items-center gap-2.5 rounded-lg border px-3 py-2.5',
              car.activeOrder.type === 'remap'
                ? 'border-tpc-red/30 bg-tpc-red/5'
                : 'border-tpc-yellow/30 bg-tpc-yellow/5',
            )}
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
              className={car.activeOrder.type === 'remap' ? 'text-tpc-red' : 'text-tpc-yellow'}
              aria-hidden
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            <div className="flex-1 text-xs leading-snug tracking-tight text-tpc-text">
              {car.activeOrder.label}
            </div>
          </div>
        )}

        {car.warranty && !car.activeOrder && (
          <div className="mb-4 rounded-lg border border-tpc-border bg-tpc-surface p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-tpc-text-tertiary">
                Garantia
              </span>
              <span className="text-[11px] font-medium text-tpc-text-secondary">
                {car.warranty.text}
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded bg-tpc-elevated-2">
              <div
                className="h-full bg-gradient-to-r from-tpc-red-dark to-tpc-red"
                style={{ width: `${car.warranty.pct * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {car.activeOrder ? (
            <Button
              fullWidth
              onClick={() =>
                router.push(
                  car.activeOrder!.type === 'remap'
                    ? `/pedido/${car.activeOrder!.id}`
                    : `/agendamento/${car.activeOrder!.id}`,
                )
              }
            >
              Ver pedido
            </Button>
          ) : car.isActive ? (
            <Button fullWidth onClick={() => router.push('/catalogo/presencial')}>
              Solicitar serviço
            </Button>
          ) : (
            <Button fullWidth onClick={activate} disabled={isPending}>
              {isPending ? 'Ativando…' : 'Tornar ativo'}
            </Button>
          )}
          {!car.activeOrder && (
            <button
              type="button"
              onClick={startCustomOrder}
              disabled={customPending}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-tpc-yellow/40 bg-tpc-yellow/10 px-4 py-2.5 text-[12px] font-semibold text-tpc-yellow transition hover:bg-tpc-yellow/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 8.4 8.4 0 0 1-3.7-.8L3 21l1.5-4.7A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z" />
              </svg>
              {customPending ? 'Abrindo chat…' : 'Iniciar atendimento personalizado'}
            </button>
          )}
          {customError && (
            <div className="rounded-lg border border-tpc-red/40 bg-tpc-red/10 px-3 py-2 text-xs text-tpc-red">
              {customError}
            </div>
          )}
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1 px-3 py-2 text-[11px]"
              onClick={() => router.push('/historico')}
            >
              Histórico
            </Button>
            <Button
              variant="secondary"
              className="flex-1 px-3 py-2 text-[11px]"
              onClick={() => router.push(`/garagem/${car.id}/editar`)}
            >
              Editar
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

const computeStatus = (car: CarItem) => {
  if (car.activeOrder) {
    if (car.activeOrder.type === 'remap') {
      return {
        label: 'Em mapeamento',
        classes: 'border-tpc-red/30 bg-tpc-red/10 text-tpc-red',
        dotClass: 'bg-tpc-red',
        pulse: true,
      }
    }
    return {
      label: 'Em serviço',
      classes: 'border-tpc-yellow/30 bg-tpc-yellow/10 text-tpc-yellow',
      dotClass: 'bg-tpc-yellow',
      pulse: true,
    }
  }
  if (car.mapState === 'STOCK') {
    return {
      label: mapStateLabel.STOCK,
      classes: 'border-tpc-border bg-tpc-elevated-2 text-tpc-text-tertiary',
      dotClass: '',
      pulse: false,
    }
  }
  return {
    label: mapStateLabel[car.mapState],
    classes: 'border-tpc-green/30 bg-tpc-green/10 text-tpc-green',
    dotClass: '',
    pulse: false,
  }
}

function GaragemEmpty({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="relative flex min-h-full flex-col items-center justify-center px-6 py-12 text-center md:px-10">
      <div className="pointer-events-none absolute right-0 top-0 opacity-35">
        <DiagonalStripes width={260} height={260} mask="top-right" />
      </div>
      <div className="pointer-events-none absolute bottom-0 left-0 opacity-35">
        <DiagonalStripes width={260} height={260} mask="bottom-left" />
      </div>

      <div className="relative mb-8 flex h-56 w-[420px] max-w-full items-center justify-center">
        <img
          src="/sprites/car-neon.webp"
          alt="Carro estilizado em neon"
          className="h-full w-full object-contain"
        />
        <div className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full border-[2px] border-tpc-bg bg-tpc-red text-tpc-text shadow-[0_4px_14px_rgba(225,38,28,0.45)]">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
      </div>

      <h1 className="mb-2 text-[28px] font-bold tracking-[-0.03em] text-tpc-text">
        Adiciona teu carro
      </h1>
      <p className="max-w-[360px] text-sm leading-relaxed text-tpc-text-secondary">
        Cadastra um carro pra ver serviços compatíveis e acompanhar garantias. Até 3
        carros por conta.
      </p>

      <button
        type="button"
        onClick={onAdd}
        className="mt-7 inline-flex cursor-pointer items-center gap-2 rounded-full bg-tpc-red px-6 py-3 text-sm font-semibold text-tpc-text shadow-lg shadow-tpc-red/40 transition hover:bg-tpc-red-dark"
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
        Adicionar carro
      </button>

      <div className="mt-5 font-mono text-[9px] uppercase tracking-[0.1em] text-tpc-text-tertiary">
        até 3 carros por conta
      </div>
    </div>
  )
}
