'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { fitsBalance, isServiceCompatibleWithCar } from '@tpc/lib/business'
import { formatBRL, formatPoints } from '@tpc/lib/formatters'
import {
  BackButton,
  Button,
  Card,
  DiagonalStripes,
  PointsDisplay,
  ScreenChrome,
  TPCHeader,
} from '@tpc/ui'

interface Servico {
  id: string
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
  servico: Servico
  saldo: Saldo
  activeCar: CarLite | null
}

export const ServicoDetalheView = ({ servico, saldo, activeCar }: Props) => {
  const router = useRouter()
  const compatible = activeCar
    ? isServiceCompatibleWithCar(servico.motorTypes, activeCar.motorType)
    : false
  const hasBalance = fitsBalance(servico.pts, saldo)

  return (
    <ScreenChrome>
      <TPCHeader
        back={<BackButton onClick={() => router.back()} />}
        title="Serviço"
        subtitle={servico.name}
        right={<PointsDisplay balance={saldo.available} compact />}
      />

      <main className="tpc-scroll flex-1 overflow-y-auto pb-32">
        <section className="relative px-4 pt-4">
          <Card elevated className="relative overflow-hidden p-5">
            <div className="pointer-events-none absolute right-0 top-0 opacity-40">
              <DiagonalStripes width={140} height={140} thickness={1.5} spacing={9} />
            </div>
            <div className="relative">
              <div className="tpc-eyebrow">{categoryLabel(servico.category)}</div>
              <h1 className="mt-1.5 text-2xl font-bold leading-tight tracking-tight">
                {servico.name}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-tpc-text-secondary">
                {servico.description}
              </p>

              <div className="mt-4 flex items-baseline gap-3 border-t border-tpc-border pt-4">
                <div className="tpc-num text-4xl font-semibold leading-none">
                  {formatPoints(servico.pts)}
                </div>
                <div className="text-xs text-tpc-text-secondary">pontos</div>
                {servico.priceAvulsoCents > 0 && (
                  <div className="ml-auto font-mono text-[11px] tracking-wider text-tpc-text-tertiary line-through">
                    {formatBRL(servico.priceAvulsoCents)} avulso
                  </div>
                )}
              </div>
            </div>
          </Card>
        </section>

        <section className="px-4 pt-3">
          <div className="grid grid-cols-2 gap-2">
            <InfoTile
              eyebrow="Duração"
              value={servico.durationDays === 1 ? '1 dia' : `${servico.durationDays} dias`}
            />
            <InfoTile
              eyebrow="Compatibilidade"
              value={
                servico.motorTypes.length > 0
                  ? servico.motorTypes.slice(0, 3).join(' · ')
                  : 'Todos motores'
              }
            />
          </div>
        </section>

        {activeCar && (
          <section className="px-4 pt-3">
            <Card className="flex items-center gap-3 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-tpc-border bg-tpc-elevated text-tpc-red">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 17h-2v-6l2-5h13l4 5v6h-2" />
                  <circle cx="7" cy="17" r="2" />
                  <circle cx="17" cy="17" r="2" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold tracking-tight">
                  {activeCar.brand} {activeCar.model}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-tpc-text-secondary">
                  Motor {activeCar.motorType} {compatible ? '· compatível' : '· não compatível'}
                </div>
              </div>
              <Link
                href="/garagem"
                className="font-mono text-[10px] uppercase tracking-wider text-tpc-text-secondary transition hover:text-tpc-text"
              >
                Trocar
              </Link>
            </Card>
          </section>
        )}

        {!activeCar && (
          <section className="px-4 pt-3">
            <Card className="border-tpc-yellow/30 bg-tpc-yellow/10 p-3.5">
              <div className="text-sm font-semibold text-tpc-yellow">
                Cadastra um carro antes
              </div>
              <p className="mt-1 text-xs text-tpc-text-secondary">
                Pra agendar, precisa de carro ativo.{' '}
                <Link href="/garagem/adicionar" className="text-tpc-text underline">
                  Adicionar agora
                </Link>
              </p>
            </Card>
          </section>
        )}

        {!hasBalance && (
          <section className="px-4 pt-3">
            <Card className="border-tpc-yellow/30 bg-tpc-yellow/10 p-3.5">
              <div className="text-sm font-semibold text-tpc-yellow">Saldo insuficiente</div>
              <p className="mt-1 text-xs text-tpc-text-secondary">
                Você tem {formatPoints(saldo.available)} pts, precisa de{' '}
                {formatPoints(servico.pts)}.{' '}
                <Link href="/pontos/comprar" className="text-tpc-text underline">
                  Carregar pontos
                </Link>
              </p>
            </Card>
          </section>
        )}
      </main>

      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[420px] border-t border-tpc-border bg-tpc-bg px-5 pb-5 pt-3">
        {compatible && hasBalance && activeCar ? (
          <Link href={`/servico/${servico.id}/agendar`} className="block">
            <Button fullWidth>
              Solicitar serviço · {formatPoints(servico.pts)} pts
            </Button>
          </Link>
        ) : (
          <Button fullWidth disabled>
            {!activeCar
              ? 'Cadastre um carro'
              : !compatible
                ? 'Não compatível com o carro ativo'
                : 'Saldo insuficiente'}
          </Button>
        )}
      </div>
    </ScreenChrome>
  )
}

function InfoTile({ eyebrow, value }: { eyebrow: string; value: string }) {
  return (
    <div className="rounded-xl border border-tpc-border bg-tpc-surface p-3">
      <div className="tpc-eyebrow">{eyebrow}</div>
      <div className="mt-1 text-sm font-semibold tracking-tight">{value}</div>
    </div>
  )
}

const categoryLabel = (cat: Servico['category']): string =>
  cat === 'PERFORMANCE' ? 'Performance' : cat === 'AESTHETIC' ? 'Som & estética' : 'Configuração'
