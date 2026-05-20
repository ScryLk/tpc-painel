'use client'

import Link from 'next/link'

import { formatPoints } from '@tpc/lib/formatters'
import { Card, cn } from '@tpc/ui'

import { ClientShell } from '@/components/layout/ClientShell'

interface RemapService {
  id: string
  slug: string
  name: string
  description: string
  category: 'Performance' | 'Estética' | 'Diagnóstico' | 'Configuração' | 'Custom'
  pts: number
  priceAvulsoCents: number
  supports: string[]
  isCustom: boolean
  sortOrder: number
}

interface Saldo {
  available: number
  reserved: number
  total: number
}

interface Props {
  services: RemapService[]
  saldo: Saldo
}

export const CatalogoArquivoView = ({ services, saldo }: Props) => {
  const customService = services.find((s) => s.isCustom) ?? null
  const standardServices = services.filter((s) => !s.isCustom)
  const fitsCount = standardServices.filter((s) => s.pts <= saldo.available).length

  return (
    <ClientShell breadcrumbs={['Catálogo', 'Por arquivo']} saldoAvailable={saldo.available}>
      <div className="flex h-full flex-col lg:flex-row">
        <CatalogFilters />

        <div className="tpc-scroll min-w-0 flex-1 overflow-y-auto p-5 md:p-7">
          <CatalogHeader
            total={standardServices.length}
            fitsCount={fitsCount}
          />

          <p className="mb-5 rounded-xl border border-tpc-border bg-tpc-surface px-3.5 py-3 text-xs leading-relaxed text-tpc-text-secondary">
            <span className="tpc-eyebrow mr-1.5">Como funciona</span>
            Envia teu arquivo da ECU. TPC analisa, mapeia e devolve o modificado no
            chat. Tu grava com teu hardware. Suporta KESS V2/V3, MPPS, FLEX, autotuner.
          </p>

          {customService && <CustomCard service={customService} />}

          <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {standardServices.map((s) => (
              <RemapServiceCard key={s.id} service={s} saldo={saldo.available} />
            ))}
          </div>

          {services.length === 0 && (
            <p className="rounded-xl border border-tpc-yellow/30 bg-tpc-yellow/10 px-3.5 py-3 text-sm">
              <span className="font-semibold text-tpc-yellow">
                Catálogo de arquivo vazio
              </span>
              <span className="ml-1 text-tpc-text-secondary">
                Os serviços ainda não foram cadastrados.
              </span>
            </p>
          )}

          <p className="mt-7 rounded-xl border border-dashed border-tpc-border bg-tpc-surface px-3.5 py-3 text-xs text-tpc-text-secondary">
            <span className="tpc-eyebrow mr-1.5">Arquivos pra sempre</span>
            Quando o pedido for aprovado, tu pode baixar o arquivo modificado a
            qualquer momento pelo Histórico. Trocou de celular? Faz login e baixa de
            novo.
          </p>
        </div>
      </div>
    </ClientShell>
  )
}

const CatalogHeader = ({ total, fitsCount }: { total: number; fitsCount: number }) => {
  return (
    <div className="mb-5 flex flex-col items-start justify-between gap-3 md:flex-row md:items-end">
      <div>
        <h2 className="text-[22px] font-bold leading-tight tracking-[-0.03em] text-tpc-text">
          Catálogo · Por arquivo
        </h2>
        <p className="mt-1 text-xs text-tpc-text-secondary">
          {total} {total === 1 ? 'serviço' : 'serviços'}
          {fitsCount > 0 && ` · ${fitsCount} cabem no teu saldo`}
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
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-tpc-border px-3 py-2 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-tpc-text-secondary"
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

const CatalogFilters = () => {
  return (
    <aside className="hidden w-60 flex-shrink-0 overflow-y-auto border-r border-tpc-border p-6 lg:block">
      <div className="mb-6">
        <div className="mb-2.5 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-tpc-text-tertiary">
          Canal
        </div>
        <div className="flex flex-col gap-1 rounded-[10px] border border-tpc-border bg-tpc-surface p-1">
          <Link href="/catalogo/presencial">
            <FilterPill label="Presencial" sub="oficina TPC" />
          </Link>
          <FilterPill label="Por arquivo" sub="remoto · qualquer lugar" active />
        </div>
      </div>

      <div className="mb-6">
        <div className="mb-2.5 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-tpc-text-tertiary">
          Categoria
        </div>
        <div className="flex flex-col gap-1.5">
          {(
            [
              ['Todos', 10, true],
              ['Performance', 4, false],
              ['Estética', 2, false],
              ['Diagnóstico', 2, false],
              ['Configuração', 1, false],
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
        <FilterCheckbox label="Inclui garantia" />
        <FilterCheckbox label="Entrega em até 4h" />
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
        'flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left',
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

const CustomCard = ({ service }: { service: RemapService }) => {
  return (
    <Link href={`/servico/${service.id}?canal=arquivo`} className="block">
      <Card
        className="relative overflow-hidden border-tpc-yellow/40 bg-tpc-yellow/[0.04] p-5 transition hover:border-tpc-yellow/60 hover:bg-tpc-yellow/[0.06]"
        elevated={false}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-tpc-yellow/40 bg-tpc-yellow/10 text-tpc-yellow">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded border border-tpc-yellow/55 bg-tpc-yellow/15 px-2 py-[3px] font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-tpc-yellow">
                Personalizado
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-tpc-text-tertiary">
                Sem custo pra orçar
              </span>
            </div>
            <div className="text-base font-semibold tracking-[-0.02em] text-tpc-text">
              {service.name}
            </div>
            <p className="mt-1 max-w-xl text-xs leading-snug text-tpc-text-secondary">
              {service.description}
            </p>
            <p className="mt-2 font-mono text-[10px] tracking-[0.04em] text-tpc-text-tertiary">
              Não encontrou o que procura? Envia teu arquivo + descrição. TPC orça em
              até 24h. Tu aceita ou recusa.
            </p>
          </div>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="hidden flex-shrink-0 text-tpc-yellow md:block"
            aria-hidden
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </div>
      </Card>
    </Link>
  )
}

const RemapServiceCard = ({
  service,
  saldo,
}: {
  service: RemapService
  saldo: number
}) => {
  const isFree = service.pts === 0
  const fits = saldo >= service.pts
  const active = fits || isFree
  const insufficientBalance = !fits && !isFree
  const eco =
    service.priceAvulsoCents > 0 && !isFree
      ? Math.round(
          (1 - service.pts / Math.max(1, service.priceAvulsoCents / 100)) * 100,
        )
      : 0
  const missing = Math.max(0, service.pts - saldo)

  return (
    <Link href={`/servico/${service.id}?canal=arquivo`} className="block">
      <Card
        className={cn(
          'relative cursor-pointer overflow-hidden p-[18px] transition hover:bg-tpc-elevated',
          insufficientBalance && 'border-tpc-yellow/40',
        )}
      >
        <div className="mb-3 flex items-start justify-between">
          <div className="flex h-[42px] w-[42px] items-center justify-center rounded-[10px] border border-tpc-red/40 bg-tpc-red/10 text-tpc-red">
            <CategoryIcon category={service.category} />
          </div>
          {active && !isFree && (
            <span className="rounded border border-tpc-green/30 bg-tpc-green/10 px-1.5 py-0.5 font-mono text-[7px] font-bold uppercase tracking-[0.18em] text-tpc-green">
              Disponível
            </span>
          )}
        </div>

        <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-tpc-text-tertiary">
          {service.category}
        </div>
        <div className="mt-1 text-base font-semibold tracking-[-0.02em] text-tpc-text">
          {service.name}
        </div>
        <p className="mt-2 line-clamp-2 min-h-[34px] text-xs leading-snug text-tpc-text-secondary">
          {service.description}
        </p>

        {service.supports.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {service.supports.slice(0, 2).map((ecu) => (
              <span
                key={ecu}
                className="rounded border border-tpc-border bg-tpc-elevated px-1.5 py-0.5 font-mono text-[9px] tracking-[0.04em] text-tpc-text-secondary"
              >
                {ecu}
              </span>
            ))}
            {service.supports.length > 2 && (
              <span className="font-mono text-[9px] text-tpc-text-tertiary">
                +{service.supports.length - 2}
              </span>
            )}
          </div>
        )}

        <div className="mt-3.5 flex items-baseline justify-between gap-2 border-t border-tpc-border pt-3">
          <div className="flex flex-wrap items-baseline gap-1.5">
            {service.priceAvulsoCents > 0 && !isFree && (
              <span className="font-mono text-[10px] text-tpc-text-tertiary line-through">
                R$ {Math.round(service.priceAvulsoCents / 100)}
              </span>
            )}
            {isFree ? (
              <span className="text-lg font-bold tracking-[-0.02em] text-tpc-green">
                Grátis
              </span>
            ) : (
              <>
                <span className="tpc-num text-[22px] font-bold leading-none tracking-[-0.04em] text-tpc-text">
                  {formatPoints(service.pts)}
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
            Remoto
          </span>
        </div>

        {insufficientBalance && (
          <div className="mt-2.5 rounded border border-tpc-yellow/30 bg-tpc-yellow/10 px-2.5 py-1.5 text-center font-mono text-[9px] font-semibold uppercase tracking-[0.06em] text-tpc-yellow">
            Faltam {formatPoints(missing)} pts
          </div>
        )}
      </Card>
    </Link>
  )
}

const CategoryIcon = ({ category }: { category: RemapService['category'] }) => {
  if (category === 'Performance') {
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
  if (category === 'Estética') {
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
  if (category === 'Diagnóstico') {
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
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M9 13l2 2 4-4" />
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
