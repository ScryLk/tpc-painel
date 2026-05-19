'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { useApi } from '@/lib/api/client'
import {
  BackButton,
  Button,
  Card,
  CarSilhouette,
  type CarType,
  DiagonalStripes,
  PointsDisplay,
  ScreenChrome,
  TPCHeader,
  cn,
} from '@tpc/ui'

import type { CarItem } from './page'

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
  STOCK: 'Stock',
  STAGE1: 'Stage 1 ativo',
  STAGE2: 'Stage 2 ativo',
  STAGE3: 'Stage 3 ativo',
}

const carTypeFromMotor = (motor: string): CarType => {
  // Heurística minima até termos o type do carro no DB ou inferido por modelo.
  if (motor === 'diesel') return 'pickup'
  if (motor === 'atmo') return 'coupe'
  return 'sedan'
}

export const GaragemView = ({ cars, meta, saldo }: Props) => {
  const router = useRouter()
  const atLimit = meta.count >= meta.limit
  const isEmpty = meta.count === 0

  if (isEmpty) {
    return <GaragemEmpty saldo={saldo} onBack={() => router.push('/dashboard')} />
  }

  return (
    <ScreenChrome>
      <TPCHeader
        back={<BackButton onClick={() => router.push('/dashboard')} />}
        title="Garagem"
        subtitle={`${meta.count} de ${meta.limit} carros`}
        right={<PointsDisplay balance={saldo.available} compact />}
      />

      <div className="tpc-scroll relative flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-3 pb-24">
          {cars.map((car) => (
            <GarageCarCard key={car.id} car={car} />
          ))}

          {atLimit && (
            <Card className="flex items-center gap-3 border-dashed bg-tpc-elevated-2 p-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-tpc-yellow/40 bg-tpc-yellow/10 text-tpc-yellow">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v4M12 16v.01" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold tracking-tight">Limite atingido</div>
                <div className="text-xs text-tpc-text-secondary">
                  Máximo {meta.limit} carros. Remove um pra adicionar outro.
                </div>
              </div>
            </Card>
          )}
        </div>

        <Link
          href={atLimit ? '#' : '/garagem/adicionar'}
          aria-disabled={atLimit}
          className={cn(
            'absolute bottom-5 right-5 flex h-14 w-14 items-center justify-center rounded-full transition',
            atLimit
              ? 'cursor-not-allowed border border-tpc-border bg-tpc-surface text-tpc-text-tertiary'
              : 'bg-tpc-red text-tpc-text shadow-[0_8px_24px_rgba(225,38,28,0.4),0_0_0_1px_rgba(225,38,28,0.5)] hover:bg-tpc-red-dark',
          )}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Link>
      </div>
    </ScreenChrome>
  )
}

function GaragemEmpty({ saldo, onBack }: { saldo: Saldo; onBack: () => void }) {
  return (
    <ScreenChrome>
      <TPCHeader
        back={<BackButton onClick={onBack} />}
        title="Garagem"
        subtitle="nenhum carro ainda"
        right={<PointsDisplay balance={saldo.available} compact />}
      />

      <main className="relative flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div className="pointer-events-none absolute right-0 top-0 opacity-35">
          <DiagonalStripes width={200} height={200} mask="top-right" />
        </div>

        <div className="relative mb-7 flex h-32 w-56 items-center justify-center">
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at 50% 60%, rgba(225,38,28,0.15) 0%, transparent 65%)',
            }}
          />
          <CarSilhouette type="sedan" width={210} />
          <div className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full border-[2px] border-tpc-bg bg-tpc-red text-tpc-text shadow-[0_4px_14px_rgba(225,38,28,0.45)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>
        </div>

        <h1 className="mb-2 text-2xl font-bold tracking-tight">Adiciona teu carro</h1>
        <p className="max-w-[280px] text-sm leading-relaxed text-tpc-text-secondary">
          Cadastra um carro pra ver serviços compatíveis e acompanhar garantias.
        </p>

        <div className="mt-7 w-full max-w-[280px]">
          <Link href="/garagem/adicionar" className="block">
            <Button
              fullWidth
              leading={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              }
            >
              Adicionar carro
            </Button>
          </Link>
        </div>

        <div className="mt-5 font-mono text-[9px] uppercase tracking-[0.1em] text-tpc-text-tertiary">
          até 3 carros por conta
        </div>
      </main>
    </ScreenChrome>
  )
}

function GarageCarCard({ car }: { car: CarItem }) {
  const router = useRouter()
  const api = useApi()
  const [isPending, startTransition] = useTransition()

  const status =
    car.activeOrder
      ? car.activeOrder.type === 'remap'
        ? { label: 'Em mapeamento', color: 'tpc-red', pulse: true }
        : { label: 'Em serviço', color: 'tpc-yellow', pulse: true }
      : car.mapState === 'STOCK'
        ? { label: mapStateLabel.STOCK, color: 'tpc-text-tertiary', pulse: false }
        : { label: mapStateLabel[car.mapState], color: 'tpc-green', pulse: false }

  const activate = () => {
    startTransition(async () => {
      try {
        await api.post(`/me/cars/${car.id}/activate`)
        router.refresh()
      } catch {
        /* swallow: erro genérico cai no nada */
      }
    })
  }

  const primaryLabel = car.activeOrder
    ? 'Ver pedido'
    : car.isActive
      ? 'Solicitar serviço'
      : 'Tornar ativo'
  const primaryAction = () => {
    if (car.activeOrder) {
      router.push(
        car.activeOrder.type === 'remap'
          ? `/pedido/${car.activeOrder.id}`
          : `/agendamento/${car.activeOrder.id}`,
      )
      return
    }
    if (car.isActive) {
      router.push('/catalogo/presencial')
      return
    }
    activate()
  }

  return (
    <Card className="overflow-hidden p-0" elevated={false}>
      <div
        className={cn(
          'relative h-32',
          'bg-[radial-gradient(ellipse_at_50%_100%,rgba(225,38,28,0.13)_0%,transparent_60%),linear-gradient(180deg,#050505,#0a0a0a)]',
        )}
      >
        <div className="absolute right-0 top-0 opacity-50">
          <DiagonalStripes width={110} height={110} thickness={1.5} spacing={9} mask="top-right" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <CarSilhouette type={carTypeFromMotor(car.motorType)} width={260} />
        </div>

        <div
          className={cn(
            'absolute left-3 top-3 flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.1em]',
            status.color === 'tpc-red' && 'border-tpc-red/30 bg-tpc-red/10 text-tpc-red',
            status.color === 'tpc-yellow' &&
              'border-tpc-yellow/30 bg-tpc-yellow/10 text-tpc-yellow',
            status.color === 'tpc-green' && 'border-tpc-green/30 bg-tpc-green/10 text-tpc-green',
            status.color === 'tpc-text-tertiary' &&
              'border-tpc-border bg-tpc-elevated-2 text-tpc-text-tertiary',
          )}
        >
          {status.pulse && (
            <span
              className={cn(
                'inline-block h-1.5 w-1.5 animate-[tpc-pulse_1.8s_ease-in-out_infinite] rounded-full',
                status.color === 'tpc-red' && 'bg-tpc-red shadow-[0_0_5px_currentColor]',
                status.color === 'tpc-yellow' && 'bg-tpc-yellow shadow-[0_0_5px_currentColor]',
              )}
            />
          )}
          {status.label}
        </div>

        {car.isActive && (
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-tpc-red px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-tpc-text shadow-[0_2px_8px_rgba(225,38,28,0.4)]">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" />
            </svg>
            ATIVO
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-bold leading-tight tracking-tight">
              {car.brand} {car.model}
            </div>
            <div className="mt-0.5 font-mono text-[11px] tracking-wider text-tpc-text-secondary">
              {car.year} · {car.motorType.toUpperCase()}
            </div>
          </div>
          <div className="rounded border border-tpc-border-strong px-2.5 py-1 font-mono text-[11px] font-semibold tracking-[0.1em]">
            {car.plate}
          </div>
        </div>

        {car.activeOrder && (
          <div
            className={cn(
              'mt-3 flex items-center gap-2.5 rounded-lg border px-3 py-2.5',
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
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={car.activeOrder.type === 'remap' ? 'text-tpc-red' : 'text-tpc-yellow'}
              stroke="currentColor"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            <div className="flex-1 text-xs leading-snug tracking-tight">
              {car.activeOrder.label}
            </div>
          </div>
        )}

        {car.extraOrders > 0 && (
          <div className="mt-1.5 text-right font-mono text-[9px] uppercase tracking-[0.08em] text-tpc-text-tertiary">
            + {car.extraOrders} {car.extraOrders === 1 ? 'pedido extra' : 'pedidos extras'}
          </div>
        )}

        {car.warranty && !car.activeOrder && (
          <div className="mt-3">
            <div className="mb-1 flex justify-between font-mono text-[9px] uppercase tracking-[0.1em] text-tpc-text-tertiary">
              <span>Garantia Stage</span>
              <span className="text-tpc-text-secondary">{car.warranty.text}</span>
            </div>
            <div className="h-1 overflow-hidden rounded bg-tpc-elevated-2">
              <div
                className="h-full bg-gradient-to-r from-tpc-red-dark to-tpc-red"
                style={{ width: `${car.warranty.pct * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-3.5 flex gap-2">
          <Button
            fullWidth
            variant={car.activeOrder ? 'secondary' : 'primary'}
            onClick={primaryAction}
            disabled={isPending}
          >
            {isPending && !car.isActive ? 'Ativando…' : primaryLabel}
          </Button>
        </div>
      </div>
    </Card>
  )
}
