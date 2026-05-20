'use client'

import Link from 'next/link'

import { isServiceCompatibleWithCar } from '@tpc/lib/business'
import { formatPoints } from '@tpc/lib/formatters'
import { Card, cn } from '@tpc/ui'

import { ClientShell } from '@/components/layout/ClientShell'

interface Servico {
  id: string
  slug: string
  name: string
  description: string
  category: 'PERFORMANCE' | 'AESTHETIC' | 'CONFIG'
  pts: number
  priceAvulsoCents: number
  motorTypes: string[]
  durationDays: number
  popular: boolean
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
  servicos: Servico[]
  saldo: Saldo
  activeCar: CarLite | null
}

const CATEGORY_LABEL: Record<Servico['category'], string> = {
  PERFORMANCE: 'PERFORMANCE',
  AESTHETIC: 'ESTÉTICA',
  CONFIG: 'DIAGNÓSTICO',
}

export const CatalogoView = ({ servicos, saldo, activeCar }: Props) => {
  const compatibleCount = activeCar
    ? servicos.filter((s) => isServiceCompatibleWithCar(s.motorTypes, activeCar.motorType))
        .length
    : servicos.length

  return (
    <ClientShell breadcrumbs={['Catálogo']} saldoAvailable={saldo.available}>
      <div className="flex h-full flex-col lg:flex-row">
        <CatalogFilters activeCar={activeCar} />

        <div className="tpc-scroll min-w-0 flex-1 overflow-y-auto p-5 md:p-7">
          <CatalogHeader
            count={servicos.length}
            compatibleCount={compatibleCount}
            activeCar={activeCar}
          />

          {!activeCar && (
            <div className="mb-5 rounded-xl border border-tpc-yellow/30 bg-tpc-yellow/10 px-3.5 py-3 text-sm">
              <div className="font-semibold text-tpc-yellow">
                Cadastra um carro pra ver compatibilidade
              </div>
              <p className="mt-0.5 text-xs text-tpc-text-secondary">
                Sem carro ativo, o catálogo mostra tudo sem filtro de motor.{' '}
                <Link href="/garagem/adicionar" className="text-tpc-text underline">
                  Adicionar carro
                </Link>
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {servicos.map((s) => (
              <ServiceCardV2
                key={s.id}
                servico={s}
                car={activeCar}
                saldo={saldo.available}
              />
            ))}
          </div>

          <p className="mt-7 rounded-xl border border-tpc-border bg-tpc-surface px-3.5 py-3 text-xs text-tpc-text-secondary">
            <span className="tpc-eyebrow mr-1.5">Presencial</span>
            Cliente leva o carro na oficina TPC de Panambi/RS. TPC executa e cliente
            busca. Diagnóstico é sempre grátis.
          </p>
        </div>
      </div>
    </ClientShell>
  )
}

const CatalogHeader = ({
  count,
  compatibleCount,
  activeCar,
}: {
  count: number
  compatibleCount: number
  activeCar: CarLite | null
}) => {
  return (
    <div className="mb-5 flex flex-col items-start justify-between gap-3 md:flex-row md:items-end">
      <div>
        <h2 className="text-[22px] font-bold leading-tight tracking-[-0.03em] text-tpc-text">
          Catálogo · Presencial
        </h2>
        <p className="mt-1 text-xs text-tpc-text-secondary">
          {count} {count === 1 ? 'serviço' : 'serviços'}
          {activeCar &&
            ` · ${compatibleCount} compatíveis com ${activeCar.brand} ${activeCar.model}`}
        </p>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        <div className="hidden w-60 items-center gap-2 rounded-lg border border-tpc-border bg-tpc-surface px-3 py-2 sm:flex">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-tpc-text-tertiary"
            aria-hidden
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <span className="flex-1 text-xs text-tpc-text-tertiary">
            Buscar nesta lista...
          </span>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-tpc-border px-3 py-2 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-tpc-text-secondary"
        >
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
            <path d="M3 6h18M6 12h12M9 18h6" />
          </svg>
          Menor preço
        </button>
      </div>
    </div>
  )
}

const ActiveCarPanel = ({ car }: { car: CarLite }) => {
  return (
    <Link
      href="/garagem"
      className="mb-6 flex items-center gap-2 rounded-[10px] border border-tpc-red/40 bg-tpc-surface px-3 py-2.5 transition hover:bg-tpc-elevated"
    >
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-tpc-text-tertiary">
          Carro ativo
        </div>
        <div className="mt-0.5 truncate text-[13px] font-semibold tracking-[-0.01em] text-tpc-text">
          {car.brand} {car.model}
        </div>
        <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-tpc-text-secondary">
          {car.motorType}
        </div>
      </div>
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="flex-shrink-0 text-tpc-text-secondary"
        aria-hidden
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  )
}

const CatalogFilters = ({ activeCar }: { activeCar: CarLite | null }) => {
  return (
    <aside className="hidden w-60 flex-shrink-0 overflow-y-auto border-r border-tpc-border p-6 lg:block">
      {activeCar && <ActiveCarPanel car={activeCar} />}

      <div className="mb-6">
        <div className="mb-2.5 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-tpc-text-tertiary">
          Canal
        </div>
        <div className="flex flex-col gap-1 rounded-[10px] border border-tpc-border bg-tpc-surface p-1">
          <FilterPill label="Presencial" sub="oficina TPC" active />
          <Link href="/catalogo/arquivo">
            <FilterPill label="Por arquivo" sub="remoto · qualquer lugar" />
          </Link>
        </div>
      </div>

      <div className="mb-6">
        <div className="mb-2.5 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-tpc-text-tertiary">
          Categoria
        </div>
        <div className="flex flex-col gap-1.5">
          {(
            [
              ['Todos', 12, true],
              ['Performance', 5, false],
              ['Estética', 2, false],
              ['Diagnóstico', 3, false],
              ['Combos', 1, false],
            ] as Array<[string, number, boolean]>
          ).map(([label, count, active]) => (
            <FilterRadio key={label} label={label} count={count} active={active} />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2.5 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-tpc-text-tertiary">
          Filtros
        </div>
        <FilterCheckbox label="Cabe no meu saldo" active />
        <FilterCheckbox label="Compatível com meu carro" active />
        <FilterCheckbox label="Inclui garantia" />
        <FilterCheckbox label="Até 1h de execução" />
      </div>
    </aside>
  )
}

const FilterPill = ({
  label,
  sub,
  active,
}: {
  label: string
  sub: string
  active?: boolean
}) => {
  return (
    <div
      className={cn(
        'flex flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left transition',
        active
          ? 'border border-tpc-border bg-tpc-elevated shadow-[0_2px_6px_rgba(0,0,0,0.2)]'
          : 'cursor-pointer border border-transparent hover:bg-tpc-elevated/60',
      )}
    >
      <span
        className={cn(
          'text-xs font-semibold tracking-[-0.01em]',
          active ? 'text-tpc-text' : 'text-tpc-text-secondary',
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'font-mono text-[9px] tracking-[0.06em]',
          active ? 'text-tpc-red' : 'text-tpc-text-tertiary',
        )}
      >
        {sub}
      </span>
    </div>
  )
}

const FilterRadio = ({
  label,
  count,
  active,
}: {
  label: string
  count: number
  active?: boolean
}) => {
  return (
    <button
      type="button"
      className={cn(
        'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left',
        active && 'bg-tpc-red/10',
      )}
    >
      <span
        className={cn(
          'relative inline-flex h-3 w-3 flex-shrink-0 items-center justify-center rounded-full border',
          active ? 'border-tpc-red' : 'border-tpc-border-strong',
        )}
      >
        {active && <span className="absolute inset-[2px] rounded-full bg-tpc-red" />}
      </span>
      <span
        className={cn(
          'flex-1 text-xs',
          active ? 'font-semibold text-tpc-text' : 'text-tpc-text-secondary',
        )}
      >
        {label}
      </span>
      <span className="font-mono text-[9px] text-tpc-text-tertiary">{count}</span>
    </button>
  )
}

const FilterCheckbox = ({ label, active }: { label: string; active?: boolean }) => {
  return (
    <label className="flex cursor-pointer items-center gap-2 py-1.5">
      <span
        className={cn(
          'flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded border',
          active ? 'border-tpc-red bg-tpc-red' : 'border-tpc-border-strong bg-transparent',
        )}
      >
        {active && (
          <svg
            width="9"
            height="9"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M5 12l5 5L20 7" />
          </svg>
        )}
      </span>
      <span
        className={cn('text-xs', active ? 'text-tpc-text' : 'text-tpc-text-secondary')}
      >
        {label}
      </span>
    </label>
  )
}

const ServiceCardV2 = ({
  servico,
  car,
  saldo,
}: {
  servico: Servico
  car: CarLite | null
  saldo: number
}) => {
  const compatible = car
    ? isServiceCompatibleWithCar(servico.motorTypes, car.motorType)
    : true
  const isFree = servico.pts === 0
  const fits = saldo >= servico.pts
  const active = compatible && (fits || isFree)
  const insufficientBalance = compatible && !fits && !isFree
  const eco =
    servico.priceAvulsoCents > 0 && !isFree
      ? Math.round(
          (1 - servico.pts / Math.max(1, servico.priceAvulsoCents / 100)) * 100,
        )
      : 0
  const missing = Math.max(0, servico.pts - saldo)
  const timeLabel =
    servico.durationDays === 1 ? '~ 1 dia' : `~ ${servico.durationDays} dias`

  return (
    <Link href={`/servico/${servico.id}`} className="block">
      <Card
        className={cn(
          'relative cursor-pointer overflow-hidden p-[18px] transition hover:bg-tpc-elevated',
          !compatible && 'opacity-55',
          servico.popular && 'border-tpc-red/40 shadow-[0_0_20px_rgba(225,38,28,0.13)]',
          insufficientBalance && 'border-tpc-yellow/40',
        )}
      >
        <div className="mb-3 flex items-start justify-between">
          <div className="flex h-[42px] w-[42px] items-center justify-center rounded-[10px] border border-tpc-red/40 bg-tpc-red/10 text-tpc-red">
            <CategoryIcon category={servico.category} />
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {servico.popular && (
              <span className="rounded border border-tpc-red/55 bg-tpc-red/15 px-2 py-[3px] font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-tpc-red">
                Mais pedido
              </span>
            )}
            {active && !servico.popular && !isFree && (
              <span className="rounded border border-tpc-green/30 bg-tpc-green/10 px-1.5 py-0.5 font-mono text-[7px] font-bold uppercase tracking-[0.18em] text-tpc-green">
                Disponível
              </span>
            )}
          </div>
        </div>

        <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-tpc-text-tertiary">
          {CATEGORY_LABEL[servico.category]}
        </div>
        <div className="mt-1 text-base font-semibold tracking-[-0.02em] text-tpc-text">
          {servico.name}
        </div>
        <p className="mt-2 line-clamp-2 min-h-[34px] text-xs leading-snug text-tpc-text-secondary">
          {servico.description}
        </p>

        <div className="mt-3.5 flex items-baseline justify-between gap-2 border-t border-tpc-border pt-3">
          <div className="flex flex-wrap items-baseline gap-1.5">
            {servico.priceAvulsoCents > 0 && !isFree && (
              <span className="font-mono text-[10px] text-tpc-text-tertiary line-through">
                R$ {Math.round(servico.priceAvulsoCents / 100)}
              </span>
            )}
            {isFree ? (
              <span className="text-lg font-bold tracking-[-0.02em] text-tpc-green">
                Grátis
              </span>
            ) : (
              <>
                <span className="tpc-num text-[22px] font-bold leading-none tracking-[-0.04em] text-tpc-text">
                  {formatPoints(servico.pts)}
                </span>
                <span className="text-[11px] text-tpc-text-secondary">pts</span>
              </>
            )}
            {eco > 0 && !isFree && (
              <span className="rounded bg-tpc-green/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-tpc-green">
                -{eco}%
              </span>
            )}
          </div>
          <span className="font-mono text-[9px] tracking-[0.06em] text-tpc-text-tertiary">
            {timeLabel}
          </span>
        </div>

        {!compatible && (
          <div className="mt-2.5 rounded border border-dashed border-tpc-border bg-tpc-elevated-2 px-2.5 py-1.5 text-center font-mono text-[9px] uppercase tracking-[0.06em] text-tpc-text-secondary">
            Não compatível com teu carro
          </div>
        )}
        {insufficientBalance && (
          <div className="mt-2.5 rounded border border-tpc-yellow/30 bg-tpc-yellow/10 px-2.5 py-1.5 text-center font-mono text-[9px] font-semibold uppercase tracking-[0.06em] text-tpc-yellow">
            Faltam {formatPoints(missing)} pts
          </div>
        )}
      </Card>
    </Link>
  )
}

const CategoryIcon = ({ category }: { category: Servico['category'] }) => {
  if (category === 'PERFORMANCE') {
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
      </svg>
    )
  }
  if (category === 'AESTHETIC') {
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 2C8 8 6 11 6 14a6 6 0 0 0 12 0c0-3-2-6-6-12z" />
      </svg>
    )
  }
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" />
    </svg>
  )
}
