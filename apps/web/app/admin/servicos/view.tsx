'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { formatBRL, formatPoints } from '@tpc/lib/formatters'
import { Card, cn } from '@tpc/ui'

import { useApi } from '@/lib/api/client'

import type { RemapServiceItem, ServiceItem } from './page'
import { ServiceEditModal } from './_components/ServiceEditModal'
import { RemapServiceEditModal } from './_components/RemapServiceEditModal'

type Tab = 'presencial' | 'arquivo'

interface Props {
  initialTab: Tab
  services: ServiceItem[]
  remapServices: RemapServiceItem[]
}

const CATEGORY_LABEL: Record<ServiceItem['category'], string> = {
  PERFORMANCE: 'Performance',
  AESTHETIC: 'Estética',
  CONFIG: 'Config',
}

export const ServicosView = ({
  initialTab,
  services: initialServices,
  remapServices: initialRemapServices,
}: Props) => {
  const router = useRouter()
  const api = useApi()
  const [tab, setTab] = useState<Tab>(initialTab)
  const [services, setServices] = useState(initialServices)
  const [remapServices, setRemapServices] = useState(initialRemapServices)
  const [editingService, setEditingService] = useState<ServiceItem | null>(null)
  const [editingRemap, setEditingRemap] = useState<RemapServiceItem | null>(null)
  const [creatingPresencial, setCreatingPresencial] = useState(false)
  const [creatingArquivo, setCreatingArquivo] = useState(false)

  const switchTab = (next: Tab) => {
    setTab(next)
    const url = next === 'presencial' ? '/admin/servicos' : '/admin/servicos?tab=arquivo'
    router.replace(url, { scroll: false })
  }

  const reloadServices = async () => {
    try {
      const res = await api.get<{ items: ServiceItem[] }>('/admin/services')
      setServices(res.items)
    } catch {
      router.refresh()
    }
  }

  const reloadRemap = async () => {
    try {
      const res = await api.get<{ items: RemapServiceItem[] }>(
        '/admin/remap-services',
      )
      setRemapServices(res.items)
    } catch {
      router.refresh()
    }
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-6 md:px-8">
      <div className="mb-5">
        <h1 className="text-[24px] font-bold tracking-[-0.03em] text-tpc-text">
          Catálogo de serviços
        </h1>
        <p className="mt-1 text-[13px] text-tpc-text-secondary">
          Editar nome, preço em pontos, compatibilidade e status. Mudanças
          não afetam pedidos em aberto.
        </p>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3 border-b border-tpc-border">
        <div className="flex items-center gap-1.5">
          <TabButton
            label="Presenciais"
            count={services.length}
            active={tab === 'presencial'}
            onClick={() => switchTab('presencial')}
          />
          <TabButton
            label="Por arquivo"
            count={remapServices.length}
            active={tab === 'arquivo'}
            onClick={() => switchTab('arquivo')}
          />
        </div>
        <button
          type="button"
          onClick={() => {
            if (tab === 'presencial') setCreatingPresencial(true)
            else setCreatingArquivo(true)
          }}
          className="mb-1.5 cursor-pointer rounded-[10px] bg-tpc-red px-3 py-1.5 text-[12px] font-semibold text-tpc-text shadow-md shadow-tpc-red/20 transition hover:bg-tpc-red-dark"
        >
          + Novo serviço
        </button>
      </div>

      {tab === 'presencial' ? (
        <PresencialList
          items={services}
          onEdit={setEditingService}
        />
      ) : (
        <ArquivoList
          items={remapServices}
          onEdit={setEditingRemap}
        />
      )}

      {editingService && (
        <ServiceEditModal
          mode="edit"
          initial={editingService}
          onClose={() => setEditingService(null)}
          onSaved={async () => {
            setEditingService(null)
            await reloadServices()
          }}
        />
      )}
      {creatingPresencial && (
        <ServiceEditModal
          mode="create"
          onClose={() => setCreatingPresencial(false)}
          onSaved={async () => {
            setCreatingPresencial(false)
            await reloadServices()
          }}
        />
      )}
      {editingRemap && (
        <RemapServiceEditModal
          mode="edit"
          initial={editingRemap}
          onClose={() => setEditingRemap(null)}
          onSaved={async () => {
            setEditingRemap(null)
            await reloadRemap()
          }}
        />
      )}
      {creatingArquivo && (
        <RemapServiceEditModal
          mode="create"
          onClose={() => setCreatingArquivo(false)}
          onSaved={async () => {
            setCreatingArquivo(false)
            await reloadRemap()
          }}
        />
      )}
    </div>
  )
}

const TabButton = ({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-[13px] font-medium transition',
      active
        ? 'border-tpc-red text-tpc-text'
        : 'border-transparent text-tpc-text-secondary hover:text-tpc-text',
    )}
  >
    {label}
    <span
      className={cn(
        'rounded-full px-2 py-[2px] font-mono text-[10px] font-semibold',
        active ? 'bg-tpc-red/15 text-tpc-red' : 'bg-tpc-elevated text-tpc-text-tertiary',
      )}
    >
      {count}
    </span>
  </button>
)

// ----------------------------------------------------------------------------
// Presencial list
// ----------------------------------------------------------------------------

const PresencialList = ({
  items,
  onEdit,
}: {
  items: ServiceItem[]
  onEdit: (s: ServiceItem) => void
}) => {
  if (items.length === 0) {
    return (
      <Card className="p-10 text-center">
        <p className="text-sm text-tpc-text-secondary">
          Nenhum serviço presencial cadastrado.
        </p>
      </Card>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      {items.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onEdit(s)}
          className={cn(
            'block w-full cursor-pointer rounded-xl border bg-tpc-surface p-4 text-left transition hover:border-tpc-border-strong hover:bg-tpc-elevated',
            s.active ? 'border-tpc-border' : 'border-tpc-border opacity-60',
          )}
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                <span className="text-[15px] font-semibold tracking-tight text-tpc-text">
                  {s.name}
                </span>
                <span className="rounded border border-tpc-border bg-tpc-elevated px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-tpc-text-tertiary">
                  {CATEGORY_LABEL[s.category]}
                </span>
                {s.popular && (
                  <span className="rounded border border-tpc-yellow/40 bg-tpc-yellow/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-tpc-yellow">
                    Popular
                  </span>
                )}
                {!s.active && (
                  <span className="rounded border border-tpc-text-tertiary/40 bg-tpc-elevated px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-tpc-text-tertiary">
                    Inativo
                  </span>
                )}
              </div>
              <div className="mt-1 font-mono text-[10.5px] tracking-[0.04em] text-tpc-text-tertiary">
                {s.slug} · {s.motorTypes.length} motor{s.motorTypes.length === 1 ? '' : 'es'} · {s.durationDays}d · {s.solicitacoesCount} pedido{s.solicitacoesCount === 1 ? '' : 's'}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              <div className="flex items-baseline gap-1">
                <span className="tpc-num text-[15px] font-bold tracking-tight text-tpc-text">
                  {formatPoints(s.pts)}
                </span>
                <span className="text-[10px] text-tpc-text-tertiary">pts</span>
              </div>
              {s.priceAvulsoCents > 0 && (
                <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-tpc-text-tertiary">
                  avulso {formatBRL(s.priceAvulsoCents / 100)}
                </span>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

// ----------------------------------------------------------------------------
// Arquivo list
// ----------------------------------------------------------------------------

const ArquivoList = ({
  items,
  onEdit,
}: {
  items: RemapServiceItem[]
  onEdit: (s: RemapServiceItem) => void
}) => {
  if (items.length === 0) {
    return (
      <Card className="p-10 text-center">
        <p className="text-sm text-tpc-text-secondary">
          Nenhum serviço por arquivo cadastrado.
        </p>
      </Card>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      {items.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onEdit(s)}
          className={cn(
            'block w-full cursor-pointer rounded-xl border bg-tpc-surface p-4 text-left transition hover:border-tpc-border-strong hover:bg-tpc-elevated',
            s.active ? 'border-tpc-border' : 'border-tpc-border opacity-60',
          )}
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                <span className="text-[15px] font-semibold tracking-tight text-tpc-text">
                  {s.name}
                </span>
                {s.category && (
                  <span className="rounded border border-tpc-border bg-tpc-elevated px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-tpc-text-tertiary">
                    {s.category}
                  </span>
                )}
                {s.isCustom && (
                  <span className="rounded border border-tpc-yellow/40 bg-tpc-yellow/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-tpc-yellow">
                    Custom
                  </span>
                )}
                {!s.active && (
                  <span className="rounded border border-tpc-text-tertiary/40 bg-tpc-elevated px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-tpc-text-tertiary">
                    Inativo
                  </span>
                )}
              </div>
              <div className="mt-1 font-mono text-[10.5px] tracking-[0.04em] text-tpc-text-tertiary">
                {s.slug} · {s.supports.length} suporte{s.supports.length === 1 ? '' : 's'} · {s.ordersCount} pedido{s.ordersCount === 1 ? '' : 's'}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              <div className="flex items-baseline gap-1">
                <span className="tpc-num text-[15px] font-bold tracking-tight text-tpc-text">
                  {formatPoints(s.pts)}
                </span>
                <span className="text-[10px] text-tpc-text-tertiary">pts</span>
              </div>
              {s.priceAvulsoCents > 0 && (
                <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-tpc-text-tertiary">
                  avulso {formatBRL(s.priceAvulsoCents / 100)}
                </span>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
