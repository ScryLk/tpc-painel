'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

import { DiagonalStripes, TPCLogo, cn } from '@tpc/ui'

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
  { id: 'historico', label: 'Histórico', icon: 'history', href: '/historico' },
  { id: 'perfil', label: 'Perfil', icon: 'user', href: '/perfil' },
] as const

export const ClientShell = ({
  breadcrumbs = ['Painel'],
  saldoAvailable = 0,
  user,
  topBarExtra,
  children,
}: ClientShellProps) => {
  return (
    <div className="flex h-screen w-full bg-tpc-bg text-tpc-text">
      <ClientSidebar saldoAvailable={saldoAvailable} />
      <div className="flex min-w-0 flex-1 flex-col">
        <ClientTopBar breadcrumbs={breadcrumbs} user={user} extra={topBarExtra} />
        <div className="tpc-scroll relative flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

const ClientSidebar = ({ saldoAvailable }: { saldoAvailable: number }) => {
  const pathname = usePathname() ?? ''
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
          />
        ))}
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
  extra,
}: {
  breadcrumbs: string[]
  user?: ClientShellProps['user']
  extra?: ReactNode
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
          <div className="flex items-center gap-2.5 rounded-[10px] border border-tpc-border bg-tpc-surface px-3.5 py-2">
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
          </div>
        </div>
      )}

      <div className="ml-auto flex items-center gap-3">
        <button
          type="button"
          aria-label="Notificações"
          className="relative flex h-9 w-9 items-center justify-center rounded-[10px] border border-tpc-border bg-tpc-surface"
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
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-tpc-bg bg-tpc-red" />
        </button>

        <Link
          href="/perfil"
          className="flex items-center gap-2 rounded-full border border-tpc-border py-1 pl-1 pr-2.5"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-tpc-red to-tpc-red-dark text-[11px] font-bold tracking-tight text-tpc-text">
            {user?.initials ?? 'TP'}
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[11.5px] font-semibold text-tpc-text">
              {user?.firstName ?? 'Cliente'}
            </span>
            <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-tpc-text-tertiary">
              {user?.role ?? 'Cliente'}
            </span>
          </div>
        </Link>
      </div>
    </header>
  )
}

const SideNavItem = ({
  item,
  active,
}: {
  item: (typeof NAV_ITEMS)[number]
  active: boolean
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

const formatPoints = (n: number) =>
  new Intl.NumberFormat('pt-BR').format(Math.max(0, Math.floor(n)))
