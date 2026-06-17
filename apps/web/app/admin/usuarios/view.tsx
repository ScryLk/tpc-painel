'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { formatPoints } from '@tpc/lib/formatters'
import { Card, cn } from '@tpc/ui'

import { useApi } from '@/lib/api/client'

import type { AdminUserListItem } from './page'

type RoleFilter = 'ALL' | 'CUSTOMER' | 'STAFF' | 'ADMIN'

interface Props {
  initialItems: AdminUserListItem[]
  initialNextCursor: string | null
  canChangeRoles: boolean
}

interface ListResponse {
  items: AdminUserListItem[]
  nextCursor: string | null
}

const DEBOUNCE_MS = 280

export const UsuariosListView = ({
  initialItems,
  initialNextCursor,
}: Props) => {
  const api = useApi()
  const [items, setItems] = useState<AdminUserListItem[]>(initialItems)
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor)
  const [q, setQ] = useState('')
  const [role, setRole] = useState<RoleFilter>('ALL')
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  // Versão da busca: cada refetch incrementa, e respostas antigas (que demoraram
  // mais que a query atual) são descartadas. Evita race onde uma query rápida
  // sobrescreve uma lenta.
  const versionRef = useRef(0)

  const fetchList = useCallback(
    async (opts: { append?: boolean; cursor?: string | null } = {}) => {
      const version = ++versionRef.current
      const params = new URLSearchParams()
      if (q.trim()) params.set('q', q.trim())
      if (role !== 'ALL') params.set('role', role)
      if (includeDeleted) params.set('includeDeleted', 'true')
      params.set('limit', '50')
      if (opts.cursor) params.set('cursor', opts.cursor)

      try {
        if (opts.append) setLoadingMore(true)
        else setLoading(true)
        const res = await api.get<ListResponse>(
          `/admin/users?${params.toString()}`,
        )
        if (version !== versionRef.current) return
        setItems((prev) => (opts.append ? [...prev, ...res.items] : res.items))
        setNextCursor(res.nextCursor)
      } catch {
        if (version !== versionRef.current) return
        if (!opts.append) setItems([])
        setNextCursor(null)
      } finally {
        if (opts.append) setLoadingMore(false)
        else setLoading(false)
      }
    },
    [api, q, role, includeDeleted],
  )

  // Debounce: q/role/includeDeleted disparam refetch após 280ms.
  // Primeiro render (initialItems já carregado) é pulado.
  const firstRenderRef = useRef(true)
  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false
      return
    }
    const t = setTimeout(() => {
      void fetchList()
    }, DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [fetchList])

  const loadMore = () => {
    if (!nextCursor || loadingMore) return
    void fetchList({ append: true, cursor: nextCursor })
  }

  const totalShown = items.length
  const headerHint = useMemo(() => {
    if (loading) return 'Buscando…'
    if (totalShown === 0) return 'Nenhum usuário encontrado'
    if (nextCursor) return `${totalShown}+ usuários`
    return `${totalShown} usuário${totalShown === 1 ? '' : 's'}`
  }, [loading, totalShown, nextCursor])

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-6 md:px-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold tracking-[-0.03em] text-tpc-text">
            Usuários
          </h1>
          <p className="mt-1 text-[13px] text-tpc-text-secondary">
            Cadastros do app. Edição de dados, role e visualização de saldo.
          </p>
        </div>
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-tpc-text-tertiary">
          {headerHint}
        </span>
      </div>

      <Card className="mb-4 flex flex-col gap-3 p-3 md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-[10px] border border-tpc-border bg-tpc-bg px-3 py-2 focus-within:border-tpc-border-strong">
          <svg
            width="14"
            height="14"
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
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, email ou CPF/CNPJ"
            className="flex-1 bg-transparent text-[13px] text-tpc-text placeholder:text-tpc-text-tertiary focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1 rounded-[10px] border border-tpc-border bg-tpc-bg p-1">
          {(['ALL', 'CUSTOMER', 'STAFF', 'ADMIN'] as RoleFilter[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={cn(
                'rounded-md px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] transition',
                role === r
                  ? 'bg-tpc-red/15 text-tpc-red'
                  : 'text-tpc-text-tertiary hover:text-tpc-text',
              )}
            >
              {r === 'ALL' ? 'Todos' : r}
            </button>
          ))}
        </div>

        <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-[10px] border border-tpc-border bg-tpc-bg px-3 py-2 text-[12px] text-tpc-text-secondary transition hover:border-tpc-border-strong">
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(e) => setIncludeDeleted(e.target.checked)}
            className="h-3.5 w-3.5 cursor-pointer accent-tpc-red"
          />
          Incluir deletados
        </label>
      </Card>

      {items.length === 0 && !loading ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-tpc-text-secondary">
            Nenhum usuário com esses filtros.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((u) => (
            <UserRow key={u.id} user={u} />
          ))}
        </div>
      )}

      {nextCursor && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-lg border border-tpc-border bg-tpc-surface px-4 py-2 text-[12px] font-semibold text-tpc-text-secondary transition hover:border-tpc-border-strong hover:text-tpc-text disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingMore ? 'Carregando…' : 'Carregar mais'}
          </button>
        </div>
      )}
    </div>
  )
}

const ROLE_BADGE: Record<
  AdminUserListItem['role'],
  { label: string; cls: string }
> = {
  CUSTOMER: {
    label: 'Cliente',
    cls: 'border-tpc-border bg-tpc-elevated text-tpc-text-tertiary',
  },
  STAFF: {
    label: 'Staff',
    cls: 'border-tpc-yellow/40 bg-tpc-yellow/10 text-tpc-yellow',
  },
  ADMIN: {
    label: 'Admin',
    cls: 'border-tpc-red/40 bg-tpc-red/10 text-tpc-red',
  },
}

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

const formatCpfCnpj = (v: string | null): string => {
  if (!v) return '—'
  const digits = v.replace(/\D/g, '')
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  if (digits.length === 14) {
    return digits.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      '$1.$2.$3/$4-$5',
    )
  }
  return v
}

const UserRow = ({ user }: { user: AdminUserListItem }) => {
  const badge = ROLE_BADGE[user.role]
  const isInactive = user.deletedAt !== null || user.pendingDeletion
  return (
    <Link
      href={`/admin/usuarios/${user.id}`}
      className={cn(
        'block rounded-xl border bg-tpc-surface p-4 transition hover:border-tpc-border-strong hover:bg-tpc-elevated',
        isInactive ? 'border-tpc-border opacity-70' : 'border-tpc-border',
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <span className="truncate text-[15px] font-semibold tracking-tight text-tpc-text">
              {user.name}
            </span>
            <span
              className={cn(
                'rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em]',
                badge.cls,
              )}
            >
              {badge.label}
            </span>
            {user.deletedAt && (
              <span className="rounded border border-tpc-text-tertiary/40 bg-tpc-elevated px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-tpc-text-tertiary">
                Deletado
              </span>
            )}
            {user.pendingDeletion && !user.deletedAt && (
              <span className="rounded border border-tpc-yellow/40 bg-tpc-yellow/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-tpc-yellow">
                Pending del.
              </span>
            )}
          </div>
          <div className="mt-1 font-mono text-[10.5px] tracking-[0.04em] text-tpc-text-tertiary">
            {[user.email, formatCpfCnpj(user.cpfCnpj), user.phone || null]
              .filter(Boolean)
              .join(' · ')}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <div className="flex items-baseline gap-1">
            <span className="tpc-num text-[15px] font-bold tracking-tight text-tpc-text">
              {formatPoints(user.balance.available)}
            </span>
            <span className="text-[10px] text-tpc-text-tertiary">pts</span>
          </div>
          {user.balance.reserved > 0 && (
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-tpc-yellow">
              +{formatPoints(user.balance.reserved)} reservados
            </span>
          )}
        </div>

        <div className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-tpc-text-tertiary">
          {formatDate(user.createdAt)}
        </div>
      </div>
    </Link>
  )
}
