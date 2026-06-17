'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { formatBRL, formatPoints } from '@tpc/lib/formatters'
import { Card, cn } from '@tpc/ui'

import { useApi } from '@/lib/api/client'

import type { PackageItem } from './page'
import { PackageEditModal } from './_components/PackageEditModal'

interface Props {
  packages: PackageItem[]
}

export const PacotesView = ({ packages: initial }: Props) => {
  const router = useRouter()
  const api = useApi()
  const [items, setItems] = useState(initial)
  const [editing, setEditing] = useState<PackageItem | null>(null)
  const [creating, setCreating] = useState(false)

  const reload = async () => {
    try {
      const res = await api.get<{ items: PackageItem[] }>('/admin/packages')
      setItems(res.items)
    } catch {
      router.refresh()
    }
  }

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-6 md:px-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold tracking-[-0.03em] text-tpc-text">
            Pacotes de pontos
          </h1>
          <p className="mt-1 text-[13px] text-tpc-text-secondary">
            Tiers que o cliente compra. Mudanças não afetam compras já feitas
            (snapshot fica em Purchase).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="cursor-pointer rounded-[10px] bg-tpc-red px-3 py-1.5 text-[12px] font-semibold text-tpc-text shadow-md shadow-tpc-red/20 transition hover:bg-tpc-red-dark"
        >
          + Novo pacote
        </button>
      </div>

      {items.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-tpc-text-secondary">
            Nenhum pacote cadastrado.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((pkg) => (
            <PackageRow key={pkg.id} pkg={pkg} onEdit={() => setEditing(pkg)} />
          ))}
        </div>
      )}

      {editing && (
        <PackageEditModal
          mode="edit"
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null)
            await reload()
          }}
        />
      )}
      {creating && (
        <PackageEditModal
          mode="create"
          onClose={() => setCreating(false)}
          onSaved={async () => {
            setCreating(false)
            await reload()
          }}
        />
      )}
    </div>
  )
}

const PackageRow = ({
  pkg,
  onEdit,
}: {
  pkg: PackageItem
  onEdit: () => void
}) => {
  const totalPts = pkg.points + pkg.bonusPoints
  const pricePerPoint = totalPts > 0 ? pkg.priceCents / totalPts / 100 : 0
  return (
    <button
      type="button"
      onClick={onEdit}
      className={cn(
        'block w-full cursor-pointer rounded-xl border bg-tpc-surface p-4 text-left transition hover:border-tpc-border-strong hover:bg-tpc-elevated',
        pkg.active ? 'border-tpc-border' : 'border-tpc-border opacity-60',
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <span className="text-[15px] font-semibold tracking-tight text-tpc-text">
              {pkg.name}
            </span>
            <span className="rounded border border-tpc-border bg-tpc-elevated px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-tpc-text-tertiary">
              {pkg.tier}
            </span>
            {pkg.popular && (
              <span className="rounded border border-tpc-yellow/40 bg-tpc-yellow/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-tpc-yellow">
                Popular
              </span>
            )}
            {!pkg.active && (
              <span className="rounded border border-tpc-text-tertiary/40 bg-tpc-elevated px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-tpc-text-tertiary">
                Inativo
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 font-mono text-[10.5px] tracking-[0.04em] text-tpc-text-tertiary">
            <span>
              {formatPoints(pkg.points)} pts
              {pkg.bonusPoints > 0 && (
                <span className="text-tpc-green">
                  {' '}
                  + {formatPoints(pkg.bonusPoints)} bonus
                </span>
              )}
            </span>
            {pkg.bonusPct > 0 && (
              <span className="text-tpc-green">+{pkg.bonusPct}%</span>
            )}
            <span>·</span>
            <span>{pkg.purchasesCount} compra{pkg.purchasesCount === 1 ? '' : 's'}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <div className="text-[17px] font-bold tracking-tight text-tpc-text">
            {formatBRL(pkg.priceCents / 100)}
          </div>
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-tpc-text-tertiary">
            R$ {pricePerPoint.toFixed(2)} / pt
          </span>
        </div>
      </div>
    </button>
  )
}
