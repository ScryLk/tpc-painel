'use client'

import { useAuth, useClerk } from '@clerk/nextjs'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { DiagonalStripes, TPCLogo, cn } from '@tpc/ui'

import { useApi } from '@/lib/api/client'

import { SearchPalette } from './SearchPalette'

interface ClientShellProps {
  breadcrumbs?: string[]
  saldoAvailable?: number
  user?: { firstName?: string; initials?: string; role?: string }
  topBarExtra?: ReactNode
  children: ReactNode
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Painel', icon: 'home', href: '/dashboard' },
  { id: 'catalog', label: 'Catálogo', icon: 'grid', href: '/catalogo' },
  { id: 'garagem', label: 'Garagem', icon: 'car', href: '/garagem' },
  { id: 'pedidos', label: 'Pedidos', icon: 'chat', href: '/pedidos' },
  { id: 'historico', label: 'Histórico', icon: 'history', href: '/historico' },
  { id: 'perfil', label: 'Perfil', icon: 'user', href: '/perfil' },
] as const

type OpenOrderStatus =
  | 'AWAITING_QUOTE'
  | 'QUOTE_SENT'
  | 'ANALYZING'
  | 'MAPPING'
  | 'AWAITING_REVIEW'
  | 'NEEDS_REVISION'

interface OpenOrder {
  id: string
  protocol: string
  status: OpenOrderStatus
  isCustomQuote: boolean
  remapService: { name: string } | null
  car: { brand: string; model: string } | null
}

const ACTIVE_STATUSES: OpenOrderStatus[] = [
  'AWAITING_QUOTE',
  'QUOTE_SENT',
  'ANALYZING',
  'MAPPING',
  'AWAITING_REVIEW',
  'NEEDS_REVISION',
]

const OPEN_ORDERS_POLL_MS = 30_000
const NOTIF_POLL_MS = 20_000

const useOpenOrders = () => {
  const api = useApi()
  const [orders, setOrders] = useState<OpenOrder[]>([])

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const res = await api.get<{ items: OpenOrder[] }>(
          '/me/remap-orders?limit=20',
        )
        if (!alive) return
        const open = res.items.filter((o) =>
          (ACTIVE_STATUSES as string[]).includes(o.status),
        )
        setOrders(open)
      } catch {
        /* swallow: shell não bloqueia em falha de fetch */
      }
    }
    load()
    const id = setInterval(load, OPEN_ORDERS_POLL_MS)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [api])

  return orders
}

export type NotificationKind = 'INFO' | 'SUCCESS' | 'WARNING' | 'EVENT' | 'ALERT'

export interface AppNotification {
  id: string
  kind: NotificationKind
  title: string
  body: string | null
  link: string | null
  source: string | null
  readAt: string | null
  createdAt: string
}

interface NotificationsState {
  items: AppNotification[]
  unreadCount: number
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  remove: (id: string) => Promise<void>
}

const useNotifications = (): NotificationsState => {
  const api = useApi()
  const [items, setItems] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ items: AppNotification[]; unreadCount: number }>(
        '/me/notifications?limit=30',
      )
      setItems(res.items)
      setUnreadCount(res.unreadCount)
    } catch {
      /* swallow */
    }
  }, [api])

  useEffect(() => {
    load()
    const id = setInterval(load, NOTIF_POLL_MS)
    return () => clearInterval(id)
  }, [load])

  const markRead = useCallback(
    async (id: string) => {
      // Otimista: marca local antes da chamada.
      setItems((prev) =>
        prev.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n)),
      )
      setUnreadCount((c) => Math.max(0, c - 1))
      try {
        await api.post(`/me/notifications/${id}/read`, {})
      } catch {
        load()
      }
    },
    [api, load],
  )

  const markAllRead = useCallback(async () => {
    const nowIso = new Date().toISOString()
    setItems((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: nowIso })))
    setUnreadCount(0)
    try {
      await api.post('/me/notifications/read-all', {})
    } catch {
      load()
    }
  }, [api, load])

  const remove = useCallback(
    async (id: string) => {
      // Otimista: tira local + ajusta unreadCount se a notif removida não tava lida.
      let removedUnread = false
      setItems((prev) => {
        const target = prev.find((n) => n.id === id)
        if (target && !target.readAt) removedUnread = true
        return prev.filter((n) => n.id !== id)
      })
      if (removedUnread) setUnreadCount((c) => Math.max(0, c - 1))
      try {
        await api.del(`/me/notifications/${id}`)
      } catch {
        load()
      }
    },
    [api, load],
  )

  return { items, unreadCount, markRead, markAllRead, remove }
}

export const ClientShell = ({
  breadcrumbs = ['Painel'],
  saldoAvailable = 0,
  user,
  topBarExtra,
  children,
}: ClientShellProps) => {
  useSessionInvalidationGuard()
  const openOrders = useOpenOrders()
  const notifs = useNotifications()
  const dbRole = useMyRole()
  const [searchOpen, setSearchOpen] = useState(false)

  // Atalho global ⌘K / Ctrl+K abre o palette. Ignora se já tá num input
  // pra nao roubar foco enquanto o user digita em outro lugar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'
      if (!isCmdK) return
      e.preventDefault()
      setSearchOpen((v) => !v)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex h-screen w-full bg-tpc-bg text-tpc-text">
      <ClientSidebar
        saldoAvailable={saldoAvailable}
        openOrders={openOrders}
        dbRole={dbRole}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <ClientTopBar
          breadcrumbs={breadcrumbs}
          user={user}
          dbRole={dbRole}
          extra={topBarExtra}
          notifs={notifs}
          onOpenSearch={() => setSearchOpen(true)}
        />
        <div className="tpc-scroll relative flex-1 overflow-y-auto">{children}</div>
      </div>
      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}

const ClientSidebar = ({
  saldoAvailable,
  openOrders,
  dbRole,
}: {
  saldoAvailable: number
  openOrders: OpenOrder[]
  dbRole: string | null
}) => {
  const pathname = usePathname() ?? ''
  const isStaff = dbRole === 'STAFF' || dbRole === 'ADMIN'
  return (
    <aside className="hidden h-full w-[260px] flex-shrink-0 flex-col border-r border-tpc-border bg-tpc-bg py-5 lg:flex">
      <div className="flex justify-center border-b border-tpc-border px-5 pb-5">
        <TPCLogo size={56} />
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-3.5">
        {NAV_ITEMS.map((item) => (
          <SideNavItem
            key={item.id}
            item={item}
            active={
              pathname === item.href || pathname.startsWith(item.href + '/')
            }
            badge={item.id === 'pedidos' && openOrders.length > 0 ? openOrders.length : undefined}
          />
        ))}

        {isStaff && (
          <>
            <div className="my-2 h-px bg-tpc-border" />
            <Link
              href="/admin"
              className={cn(
                'flex items-center gap-3 rounded-[10px] border px-3.5 py-2.5 transition',
                pathname.startsWith('/admin')
                  ? 'border-tpc-red/30 bg-tpc-red/10'
                  : 'border-transparent hover:bg-tpc-surface',
              )}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={cn(
                  pathname.startsWith('/admin')
                    ? 'text-tpc-red'
                    : 'text-tpc-text-secondary',
                )}
                aria-hidden
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span
                className={cn(
                  'flex-1 text-[13px] tracking-tight',
                  pathname.startsWith('/admin')
                    ? 'font-semibold text-tpc-text'
                    : 'font-medium text-tpc-text-secondary',
                )}
              >
                Painel admin
              </span>
              <span className="rounded border border-tpc-red/40 bg-tpc-red/10 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-tpc-red">
                {dbRole === 'ADMIN' ? 'Admin' : 'Staff'}
              </span>
            </Link>
          </>
        )}
      </nav>

      <div className="border-t border-tpc-border p-3">
        <div className="relative overflow-hidden rounded-2xl border border-tpc-border bg-tpc-surface p-3.5">
          <div className="pointer-events-none absolute right-0 top-0 opacity-25">
            <DiagonalStripes
              width={90}
              height={90}
              thickness={1.2}
              spacing={9}
              mask="top-right"
            />
          </div>
          <div className="relative">
            <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-tpc-text-tertiary">
              Saldo atual
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="tpc-num text-[26px] font-bold leading-none tracking-tight text-tpc-text">
                {formatPoints(saldoAvailable)}
              </span>
              <span className="text-xs text-tpc-text-secondary">pts</span>
            </div>
            <Link
              href="/pontos/comprar"
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-tpc-red px-3 py-2 text-xs font-semibold text-tpc-text shadow-md shadow-tpc-red/20 transition hover:bg-tpc-red-dark"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M13 2L4 14h8l-1 8 9-12h-8l1-8z" />
              </svg>
              Recarregar
            </Link>
          </div>
        </div>
      </div>
    </aside>
  )
}

const ClientTopBar = ({
  breadcrumbs,
  user,
  dbRole,
  extra,
  notifs,
  onOpenSearch,
}: {
  breadcrumbs: string[]
  user?: ClientShellProps['user']
  dbRole: string | null
  extra?: ReactNode
  notifs: NotificationsState
  onOpenSearch: () => void
}) => {
  return (
    <header className="flex h-[60px] flex-shrink-0 items-center gap-6 border-b border-tpc-border bg-tpc-bg px-5 md:px-8">
      <div className="flex items-center gap-2">
        {breadcrumbs.map((crumb, i) => {
          const isLast = i === breadcrumbs.length - 1
          return (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && (
                <span className="text-[11px] text-tpc-text-tertiary">/</span>
              )}
              <span
                className={cn(
                  'text-[13px] tracking-tight',
                  isLast
                    ? 'font-semibold text-tpc-text'
                    : 'font-normal text-tpc-text-secondary',
                )}
              >
                {crumb}
              </span>
            </span>
          )
        })}
      </div>

      {extra ? (
        <div className="mx-auto hidden md:block">{extra}</div>
      ) : (
        <div className="mx-auto hidden max-w-[380px] flex-1 md:block">
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Abrir busca rápida"
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] border border-tpc-border bg-tpc-surface px-3.5 py-2 text-left transition hover:border-tpc-border-strong hover:bg-tpc-elevated"
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
              className="text-tpc-text-tertiary"
              aria-hidden
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <span className="flex-1 text-xs text-tpc-text-tertiary">
              Buscar serviços, carros, pedidos...
            </span>
            <span className="rounded-[3px] border border-tpc-border px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-tpc-text-tertiary">
              ⌘K
            </span>
          </button>
        </div>
      )}

      <div className="ml-auto flex items-center gap-3">
        <NotifBell notifs={notifs} />
        <UserMenu user={user} dbRole={dbRole} />
      </div>
    </header>
  )
}

const ROLE_LABEL: Record<string, string> = {
  CUSTOMER: 'Cliente',
  STAFF: 'TPC Staff',
  ADMIN: 'Admin',
}

const useMyRole = (): string | null => {
  const api = useApi()
  const [role, setRole] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    api
      .get<{ role: string }>('/me')
      .then((res) => {
        if (alive) setRole(res.role)
      })
      .catch(() => {
        /* swallow: shell não bloqueia se /me falhar */
      })
    return () => {
      alive = false
    }
  }, [api])
  return role
}

// Observa isSignedIn do Clerk. Quando a sessão é revogada server-side
// (admin force logout, password reset, etc), o frontend SDK do Clerk
// detecta em poucos segundos via polling e flipa isSignedIn pra false.
// Aqui agimos imediatamente sobre essa flip: chamamos signOut pra limpar
// estado local e redirecionar pro sign-in. Sem isso, o app fica renderizado
// como se ainda estivesse logado, mesmo com sessão morta.
const useSessionInvalidationGuard = () => {
  const { isLoaded, isSignedIn } = useAuth()
  const clerk = useClerk()
  const triggered = useRef(false)
  useEffect(() => {
    if (!isLoaded) return
    if (isSignedIn) return
    if (triggered.current) return
    triggered.current = true
    void clerk.signOut({ redirectUrl: '/sign-in' })
  }, [isLoaded, isSignedIn, clerk])
}

const UserMenu = ({
  user,
  dbRole,
}: {
  user?: ClientShellProps['user']
  dbRole: string | null
}) => {
  const clerk = useClerk()
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Fonte da role: prop explícita > DB (via /me) > 'Cliente' default.
  // DB é a fonte de verdade pra autorização; Clerk publicMetadata pode estar
  // desatualizado se a role foi promovida só no banco.
  const roleLabel =
    user?.role ?? (dbRole ? (ROLE_LABEL[dbRole] ?? dbRole) : 'Cliente')

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    await clerk.signOut({ redirectUrl: '/sign-in' })
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Abrir menu da conta"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex cursor-pointer items-center gap-2 rounded-full border border-tpc-border py-1 pl-1 pr-2.5 transition',
          open
            ? 'border-tpc-border-strong bg-tpc-elevated'
            : 'hover:border-tpc-border-strong hover:bg-tpc-surface',
        )}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-tpc-red to-tpc-red-dark text-[11px] font-bold tracking-tight text-tpc-text">
          {user?.initials ?? 'TP'}
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[11.5px] font-semibold text-tpc-text">
            {user?.firstName ?? 'Cliente'}
          </span>
          <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-tpc-text-tertiary">
            {roleLabel}
          </span>
        </div>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 flex w-[200px] flex-col overflow-hidden rounded-xl border border-tpc-border bg-tpc-bg py-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
        >
          <Link
            href="/perfil"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-tpc-text-secondary transition hover:bg-tpc-surface hover:text-tpc-text"
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
              aria-hidden
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Ver perfil
          </Link>
          <div className="my-1 h-px bg-tpc-border" />
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex cursor-pointer items-center gap-2.5 px-3.5 py-2 text-left text-[13px] text-tpc-text-secondary transition hover:bg-tpc-surface hover:text-tpc-red disabled:cursor-not-allowed disabled:opacity-60"
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
              aria-hidden
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
            {signingOut ? 'Saindo…' : 'Sair da conta'}
          </button>
        </div>
      )}
    </div>
  )
}

const SideNavItem = ({
  item,
  active,
  badge,
}: {
  item: (typeof NAV_ITEMS)[number]
  active: boolean
  badge?: number
}) => {
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-[10px] border px-3.5 py-2.5 transition',
        active
          ? 'border-tpc-red/30 bg-tpc-red/10'
          : 'border-transparent hover:bg-tpc-surface',
      )}
    >
      <NavIcon kind={item.icon} active={active} />
      <span
        className={cn(
          'flex-1 text-[13px] tracking-tight',
          active
            ? 'font-semibold text-tpc-text'
            : 'font-medium text-tpc-text-secondary',
        )}
      >
        {item.label}
      </span>
      {badge !== undefined && badge > 0 && (
        <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-tpc-red px-1 font-mono text-[9px] font-bold text-tpc-text shadow-[0_0_6px_rgba(225,38,28,0.5)]">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
      {active && <span className="h-4 w-[3px] rounded-sm bg-tpc-red" />}
    </Link>
  )
}

const NavIcon = ({ kind, active }: { kind: string; active: boolean }) => {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: active ? 'text-tpc-red' : 'text-tpc-text-secondary',
    'aria-hidden': true,
  }
  if (kind === 'home')
    return (
      <svg {...common}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </svg>
    )
  if (kind === 'grid')
    return (
      <svg {...common}>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    )
  if (kind === 'car')
    return (
      <svg {...common}>
        <path d="M2 10l10-7 10 7v11H2z" />
        <path d="M8 21v-8h8v8" />
        <path d="M8 17h8" />
      </svg>
    )
  if (kind === 'chat')
    return (
      <svg {...common}>
        <path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 8.4 8.4 0 0 1-3.7-.8L3 21l1.5-4.7A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z" />
      </svg>
    )
  if (kind === 'history')
    return (
      <svg {...common}>
        <path d="M3 3v5h5M3.05 13A9 9 0 1 0 6 5.3L3 8" />
        <path d="M12 7v5l4 2" />
      </svg>
    )
  return (
    <svg {...common}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}


const NOTIF_KIND_DOT: Record<NotificationKind, string> = {
  INFO: 'bg-tpc-text-tertiary',
  SUCCESS: 'bg-tpc-green',
  WARNING: 'bg-tpc-yellow',
  EVENT: 'bg-tpc-red',
  ALERT: 'bg-tpc-red',
}

const NOTIF_KIND_TEXT: Record<NotificationKind, string> = {
  INFO: 'text-tpc-text-secondary',
  SUCCESS: 'text-tpc-green',
  WARNING: 'text-tpc-yellow',
  EVENT: 'text-tpc-red',
  ALERT: 'text-tpc-red',
}

const formatRelativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'agora'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m atrás`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h atrás`
  const days = Math.floor(hr / 24)
  if (days < 7) return `${days}d atrás`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

const NotifBell = ({ notifs }: { notifs: NotificationsState }) => {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const { items, unreadCount, markRead, markAllRead, remove } = notifs

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] border border-tpc-border bg-tpc-surface transition hover:bg-tpc-elevated',
          open && 'border-tpc-border-strong bg-tpc-elevated',
        )}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-tpc-text-secondary"
          aria-hidden
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-tpc-red px-1 font-mono text-[9px] font-bold text-tpc-text shadow-[0_0_8px_rgba(225,38,28,0.5)]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 flex max-h-[520px] w-[380px] flex-col overflow-hidden rounded-xl border border-tpc-border bg-tpc-bg shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
          <div className="flex flex-shrink-0 items-center justify-between border-b border-tpc-border px-4 py-3">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-tpc-text-tertiary">
              Notificações
              {unreadCount > 0 && (
                <span className="ml-1.5 text-tpc-red">· {unreadCount} novas</span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead()}
                className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.1em] text-tpc-red hover:text-tpc-text"
              >
                Marcar todas lidas
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-tpc-border bg-tpc-elevated text-tpc-text-tertiary">
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
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
                </svg>
              </div>
              <p className="text-[13px] font-medium text-tpc-text">
                Sem notificações ainda
              </p>
              <p className="text-[11px] text-tpc-text-tertiary">
                Eventos do app aparecem aqui.
              </p>
            </div>
          ) : (
            <div className="tpc-scroll min-h-0 overflow-y-auto">
              {items.map((n) => (
                <NotifRow
                  key={n.id}
                  notif={n}
                  onActivate={() => {
                    if (!n.readAt) void markRead(n.id)
                    setOpen(false)
                  }}
                  onMarkRead={() => void markRead(n.id)}
                  onRemove={() => void remove(n.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const NotifRow = ({
  notif,
  onActivate,
  onMarkRead,
  onRemove,
}: {
  notif: AppNotification
  onActivate: () => void
  onMarkRead: () => void
  onRemove: () => void
}) => {
  const unread = !notif.readAt
  const body = (
    <span className="flex items-start gap-2.5">
      <span
        className={cn(
          'mt-1.5 inline-block h-2 w-2 flex-shrink-0 rounded-full',
          NOTIF_KIND_DOT[notif.kind],
          unread && 'animate-[tpc-pulse_1.8s_ease-in-out_infinite] shadow-[0_0_5px_currentColor]',
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              'truncate text-[14px] tracking-tight',
              unread ? 'font-semibold text-tpc-text' : 'font-medium text-tpc-text-secondary',
            )}
          >
            {notif.title}
          </span>
          <span className="flex-shrink-0 font-mono text-[10px] text-tpc-text-tertiary">
            {formatRelativeTime(notif.createdAt)}
          </span>
        </span>
        {notif.body && (
          <span className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-tpc-text-tertiary">
            {notif.body}
          </span>
        )}
        {notif.source && (
          <span
            className={cn(
              'mt-1.5 inline-block font-mono text-[10px] uppercase tracking-[0.1em]',
              NOTIF_KIND_TEXT[notif.kind],
            )}
          >
            {notif.kind.toLowerCase()}
          </span>
        )}
      </span>
    </span>
  )
  const baseClasses = cn(
    'flex w-full px-3.5 py-2.5 text-left transition',
    unread ? 'bg-tpc-red/[0.04]' : '',
    'hover:bg-tpc-surface',
  )

  const stopAnd = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    fn()
  }

  return (
    <div className="group relative">
      {notif.link ? (
        <Link href={notif.link} onClick={onActivate} className={baseClasses}>
          {body}
        </Link>
      ) : (
        <button type="button" onClick={onActivate} className={cn(baseClasses, 'cursor-pointer')}>
          {body}
        </button>
      )}

      <div className="pointer-events-none absolute right-2 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1 rounded-lg border border-tpc-border bg-tpc-bg/95 p-1 opacity-0 shadow-lg shadow-black/40 backdrop-blur-sm transition group-hover:pointer-events-auto group-hover:opacity-100">
        {unread && (
          <button
            type="button"
            onClick={stopAnd(onMarkRead)}
            aria-label="Marcar como lida"
            title="Marcar como lida"
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-tpc-text-secondary transition hover:bg-tpc-elevated hover:text-tpc-green"
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
              <path d="M5 12l5 5L20 7" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={stopAnd(onRemove)}
          aria-label="Excluir notificação"
          title="Excluir"
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-tpc-text-secondary transition hover:bg-tpc-elevated hover:text-tpc-red"
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
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
          </svg>
        </button>
      </div>
    </div>
  )
}

const formatPoints = (n: number) =>
  new Intl.NumberFormat('pt-BR').format(Math.max(0, Math.floor(n)))
