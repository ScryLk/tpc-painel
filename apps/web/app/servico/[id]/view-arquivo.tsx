'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { formatBRL, formatPoints } from '@tpc/lib/formatters'
import { Button, Card, DiagonalStripes } from '@tpc/ui'

import { useApi } from '@/lib/api/client'
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
}

interface Saldo {
  available: number
  reserved: number
  total: number
}

interface Props {
  service: RemapService
  saldo: Saldo
}

const PROCEDIMENTO = [
  ['01', 'Leitura da ECU', 'Cliente lê o arquivo original com hardware próprio (KESS, MPPS, FLEX, etc.)'],
  ['02', 'Upload + dados técnicos', 'Envia o .bin/.ori + ECU + modo de leitura + chassi'],
  ['03', 'Análise TPC', 'TPC valida arquivo e ECU. Detecta riscos.'],
  ['04', 'Mapeamento', 'TPC ajusta mapas de injeção, turbo, limitadores conforme serviço'],
  ['05', 'Entrega + aprovação', 'Arquivo modificado chega no chat. Cliente aprova, grava na ECU.'],
] as const

export const ServicoArquivoView = ({ service, saldo }: Props) => {
  const router = useRouter()
  const api = useApi()
  const [submitting, startSubmit] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const hasBalance = !service.isCustom && saldo.available >= service.pts
  const canRequest = service.isCustom || hasBalance

  const submitOrder = () => {
    setError(null)
    startSubmit(async () => {
      try {
        const res = await api.post<{ order: { id: string } }>('/remap-orders', {
          serviceId: service.isCustom ? null : service.id,
          isCustomQuote: service.isCustom,
          technicalData: {
            // Bootstrap mínimo: tela de upload+dados técnicos vem no próximo PR.
            // Por enquanto cria order vazio e cliente preenche pelo chat.
            description: service.isCustom
              ? 'Pedido aberto via chat. Cliente envia detalhes pelas mensagens.'
              : 'Pedido criado. Cliente envia arquivo + dados técnicos pelas mensagens.',
          },
        })
        router.push(`/pedido/${res.order.id}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao criar pedido.')
      }
    })
  }

  return (
    <ClientShell
      breadcrumbs={['Catálogo', 'Por arquivo', service.name]}
      saldoAvailable={saldo.available}
    >
      <div className="mx-auto max-w-[1280px] px-6 py-7 md:px-10">
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0 space-y-4">
            <Card
              elevated
              className={
                service.isCustom
                  ? 'relative overflow-hidden border-tpc-yellow/40 bg-tpc-yellow/[0.04] p-6'
                  : 'relative overflow-hidden p-6'
              }
            >
              <div className="pointer-events-none absolute right-0 top-0 opacity-40">
                <DiagonalStripes
                  width={220}
                  height={180}
                  thickness={1.5}
                  spacing={11}
                  mask="top-right"
                />
              </div>
              <div className="relative">
                <div className="mb-2 flex items-center gap-2">
                  <div className="tpc-eyebrow">{service.category}</div>
                  <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-tpc-text-tertiary">
                    · canal por arquivo
                  </span>
                  {service.isCustom && (
                    <span className="rounded border border-tpc-yellow/55 bg-tpc-yellow/15 px-1.5 py-[2px] font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-tpc-yellow">
                      Orçamento
                    </span>
                  )}
                </div>
                <h1 className="text-[28px] font-bold leading-tight tracking-[-0.03em]">
                  {service.name}
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-tpc-text-secondary">
                  {service.description}
                </p>

                {!service.isCustom && (
                  <div className="mt-5 flex items-baseline gap-3 border-t border-tpc-border pt-4">
                    <div className="tpc-num text-[40px] font-semibold leading-none tracking-tight">
                      {formatPoints(service.pts)}
                    </div>
                    <div className="text-xs text-tpc-text-secondary">pontos</div>
                    {service.priceAvulsoCents > 0 && (
                      <div className="ml-auto font-mono text-[11px] tracking-wider text-tpc-text-tertiary line-through">
                        {formatBRL(service.priceAvulsoCents)} avulso
                      </div>
                    )}
                  </div>
                )}

                {service.isCustom && (
                  <div className="mt-5 rounded-lg border border-tpc-yellow/30 bg-tpc-yellow/10 p-3.5 text-[13px] leading-relaxed text-tpc-text-secondary">
                    <span className="font-semibold text-tpc-yellow">
                      Como funciona:
                    </span>{' '}
                    envia teu arquivo + descrição do que precisa. TPC orça em até
                    24h. Tu aceita ou recusa antes de qualquer débito.
                  </div>
                )}
              </div>
            </Card>

            <div>
              <div className="tpc-eyebrow mb-2.5">ECUs suportadas</div>
              {service.supports.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {service.supports.map((ecu) => (
                    <span
                      key={ecu}
                      className="rounded-lg border border-tpc-border bg-tpc-surface px-3 py-1.5 font-mono text-[11px] tracking-[0.04em] text-tpc-text"
                    >
                      {ecu}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-tpc-border bg-tpc-surface px-3.5 py-3 text-xs text-tpc-text-secondary">
                  {service.isCustom
                    ? 'Pedido custom suporta qualquer ECU. Inclui o modelo no upload.'
                    : 'ECUs suportadas serão informadas no chat após receber teu arquivo.'}
                </p>
              )}
            </div>

            <div>
              <div className="tpc-eyebrow mb-2.5">Procedimento</div>
              <div className="flex flex-col gap-2">
                {PROCEDIMENTO.map(([num, title, sub]) => (
                  <div
                    key={num}
                    className="flex items-start gap-3 rounded-lg border border-tpc-border bg-tpc-surface p-3"
                  >
                    <span className="font-mono text-[11px] font-bold tracking-wider text-tpc-red">
                      {num}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium tracking-tight text-tpc-text">
                        {title}
                      </div>
                      <div className="mt-0.5 text-[11px] leading-snug text-tpc-text-tertiary">
                        {sub}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="tpc-eyebrow mb-2.5">Hardware do cliente</div>
              <div className="flex flex-wrap gap-2">
                {['KESS V2/V3', 'MPPS', 'FLEX', 'autotuner', 'OBDLink', 'Outro'].map(
                  (h) => (
                    <span
                      key={h}
                      className="rounded border border-tpc-border bg-tpc-elevated px-2.5 py-1 font-mono text-[10px] tracking-[0.04em] text-tpc-text-secondary"
                    >
                      {h}
                    </span>
                  ),
                )}
              </div>
              <p className="mt-2 text-[11px] leading-snug text-tpc-text-tertiary">
                Tu precisa de hardware pra ler e gravar a ECU. TPC só faz a parte do
                mapeamento.
              </p>
            </div>
          </div>

          <aside className="lg:sticky lg:top-4 lg:self-start">
            <Card elevated className="p-5">
              <div className="tpc-eyebrow">Resumo</div>

              {service.isCustom ? (
                <>
                  <div className="mt-2 text-base font-semibold tracking-tight">
                    {service.name}
                  </div>
                  <div className="mt-3 rounded-lg border border-tpc-yellow/30 bg-tpc-yellow/10 p-3 text-[11px] leading-relaxed text-tpc-text-secondary">
                    <span className="font-semibold text-tpc-yellow">Sem custo agora.</span>{' '}
                    TPC orça em até 24h. Tu aprova antes de qualquer débito.
                  </div>
                </>
              ) : (
                <>
                  <div className="mt-2 text-base font-semibold tracking-tight">
                    {service.name}
                  </div>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="tpc-num text-[32px] font-semibold leading-none tracking-tight text-tpc-text">
                      {formatPoints(service.pts)}
                    </span>
                    <span className="text-xs text-tpc-text-secondary">pts</span>
                  </div>
                  {service.priceAvulsoCents > 0 && (
                    <div className="mt-1.5 font-mono text-[11px] text-tpc-text-tertiary line-through">
                      R$ {Math.round(service.priceAvulsoCents / 100)} avulso
                    </div>
                  )}

                  <div className="mt-4 space-y-2 border-t border-tpc-border pt-4 text-[12px]">
                    <SummaryRow
                      label="Seu saldo"
                      value={`${formatPoints(saldo.available)} pts`}
                    />
                    <SummaryRow
                      label="Saldo após reserva"
                      value={`${formatPoints(Math.max(0, saldo.available - service.pts))} pts`}
                    />
                  </div>
                </>
              )}

              {!service.isCustom && !hasBalance && (
                <div className="mt-4 rounded-lg border border-tpc-yellow/30 bg-tpc-yellow/10 p-3">
                  <div className="text-sm font-semibold text-tpc-yellow">
                    Saldo insuficiente
                  </div>
                  <p className="mt-1 text-xs text-tpc-text-secondary">
                    Faltam {formatPoints(service.pts - saldo.available)} pts.{' '}
                    <Link href="/pontos/comprar" className="text-tpc-text underline">
                      Carregar
                    </Link>
                  </p>
                </div>
              )}

              <div className="mt-5">
                <Button
                  fullWidth
                  onClick={submitOrder}
                  disabled={!canRequest || submitting}
                >
                  {submitting
                    ? 'Criando pedido…'
                    : !canRequest
                      ? 'Saldo insuficiente'
                      : service.isCustom
                        ? 'Enviar pra análise'
                        : `Solicitar · reservar ${formatPoints(service.pts)} pts`}
                </Button>
                {error && (
                  <div className="mt-2 rounded-lg border border-tpc-red/40 bg-tpc-red/10 px-3 py-2 text-xs text-tpc-red">
                    {error}
                  </div>
                )}
                <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.14em] text-tpc-text-tertiary">
                  {service.isCustom
                    ? 'TPC responde em até 24h'
                    : 'Pontos reservados até aprovação'}
                </p>
              </div>
            </Card>

            <div className="mt-4 rounded-xl border border-dashed border-tpc-border bg-tpc-surface px-3.5 py-3 text-[11px] leading-relaxed text-tpc-text-secondary">
              <span className="tpc-eyebrow mr-1.5">Arquivos pra sempre</span>
              Quando aprovado, o arquivo modificado fica baixável pra sempre pelo
              Histórico.
            </div>
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
      <span className="tpc-num font-semibold text-tpc-text">{value}</span>
    </div>
  )
}
