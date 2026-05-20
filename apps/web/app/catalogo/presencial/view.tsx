'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { isServiceCompatibleWithCar } from '@tpc/lib/business'
import { formatBRL, formatPoints } from '@tpc/lib/formatters'
import {
  BackButton,
  Card,
  PointsDisplay,
  ScreenChrome,
  SecHeading,
  TPCHeader,
  cn,
} from '@tpc/ui'

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
  PERFORMANCE: 'Performance',
  AESTHETIC: 'Som & estética',
  CONFIG: 'Configurações',
}

export const CatalogoView = ({ servicos, saldo, activeCar }: Props) => {
  const router = useRouter()

  const grouped = servicos.reduce<Record<Servico['category'], Servico[]>>(
    (acc, s) => {
      ;(acc[s.category] ??= []).push(s)
      return acc
    },
    { PERFORMANCE: [], AESTHETIC: [], CONFIG: [] },
  )

  return (
    <ScreenChrome>
      <TPCHeader
        back={<BackButton onClick={() => router.push('/dashboard')} />}
        title="Catálogo presencial"
        subtitle={activeCar ? `${activeCar.brand} ${activeCar.model}` : 'TPC Panambi'}
        right={<PointsDisplay balance={saldo.available} compact />}
      />

      <main className="tpc-scroll flex-1 overflow-y-auto pb-6">
        {!activeCar && (
          <div className="mx-4 mt-4 rounded-xl border border-tpc-yellow/30 bg-tpc-yellow/10 px-3.5 py-3 text-sm">
            <div className="font-semibold text-tpc-yellow">Cadastra um carro primeiro</div>
            <p className="mt-0.5 text-xs text-tpc-text-secondary">
              Catálogo mostra compatibilidade pelo motor do carro ativo.{' '}
              <Link href="/garagem/adicionar" className="text-tpc-text underline">
                Adicionar carro
              </Link>
            </p>
          </div>
        )}

        {(Object.keys(grouped) as Array<Servico['category']>).map((cat) => {
          const items = grouped[cat]
          if (items.length === 0) return null
          return (
            <section key={cat}>
              <SecHeading>{CATEGORY_LABEL[cat]}</SecHeading>
              <div className="flex flex-col gap-2.5 px-4">
                {items.map((s) => (
                  <ServiceItem key={s.id} servico={s} car={activeCar} />
                ))}
              </div>
            </section>
          )
        })}

        <div className="mx-4 mt-6 rounded-xl border border-tpc-border bg-tpc-surface px-3.5 py-3 text-xs text-tpc-text-secondary">
          <div className="tpc-eyebrow mb-1">Sobre o presencial</div>
          Cliente leva o carro na oficina TPC de Panambi/RS. TPC executa e cliente busca.
          Diagnóstico é sempre grátis no app.
        </div>
      </main>
    </ScreenChrome>
  )
}

function ServiceItem({ servico, car }: { servico: Servico; car: CarLite | null }) {
  const compatible = car
    ? isServiceCompatibleWithCar(servico.motorTypes, car.motorType)
    : true

  return (
    <Link href={`/servico/${servico.id}`} className="block">
      <Card
        className={cn(
          'flex items-start gap-3 p-3.5 transition hover:bg-tpc-elevated',
          !compatible && 'opacity-60',
        )}
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-tpc-border bg-tpc-elevated-2 text-tpc-red">
          <CategoryIcon category={servico.category} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold tracking-tight">{servico.name}</span>
            {servico.popular && (
              <span className="rounded bg-tpc-red px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-tpc-text">
                Popular
              </span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-tpc-text-secondary">
            {servico.description}
          </p>
          <div className="mt-1.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.06em] text-tpc-text-tertiary">
            <span>{servico.durationDays === 1 ? '1 dia' : `${servico.durationDays} dias`}</span>
            {servico.motorTypes.length > 0 && (
              <>
                <span>·</span>
                <span>{servico.motorTypes.slice(0, 3).join(', ')}</span>
              </>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="tpc-num text-base font-semibold leading-none">
            {formatPoints(servico.pts)}
            <span className="ml-0.5 text-[10px] font-normal text-tpc-text-secondary">pts</span>
          </div>
          {servico.priceAvulsoCents > 0 && (
            <div className="mt-1 font-mono text-[9px] tracking-wider text-tpc-text-tertiary line-through">
              {formatBRL(servico.priceAvulsoCents)}
            </div>
          )}
          {!compatible && car && (
            <div className="mt-1 rounded border border-tpc-yellow/30 bg-tpc-yellow/10 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wide text-tpc-yellow">
              Não compatível
            </div>
          )}
        </div>
      </Card>
    </Link>
  )
}

function CategoryIcon({ category }: { category: Servico['category'] }) {
  if (category === 'PERFORMANCE') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
      </svg>
    )
  }
  if (category === 'AESTHETIC') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z" />
        <path d="M9 9l6 6M15 9l-6 6" />
      </svg>
    )
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 1 1 4.36 16.96l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .79.46 1.5 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
