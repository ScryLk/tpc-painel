'use client'

import { useAuth, useClerk } from '@clerk/nextjs'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { TPCLogo, cn } from '@tpc/ui'

interface AdminShellProps {
  breadcrumbs?: string[]
  user?: { firstName: string; initials: string; role: string }
  children: ReactNode
}

type AdminIcon = 'inbox' | 'users' | 'tool' | 'package' | 'megaphone'

const NAV_ITEMS: Array<{
  id: string
  label: string
  href: string
  icon: AdminIcon
}> = [
  { id: 'leads', label: 'Leads', href: '/admin/leads', icon: 'inbox' },
  { id: 'usuarios', label: 'Usuários', href: '/admin/usuarios', icon: 'users' },
  { id: 'servicos', label: 'Serviços', href: '/admin/servicos', icon: 'tool' },
  { id: 'pacotes', label: 'Pacotes', href: '/admin/pacotes', icon: 'package' },
  { id: 'marketing', label: 'Marketing', href: '/admin/marketing', icon: 'megaphone' },
]

export const AdminShell = ({ breadcrumbs = ['Admin'], user, children }: AdminShellProps) => {
  useSessionInvalidationGuard()
  return (
    <div className="flex h-screen w-full bg-tpc-bg text-tpc-text">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopBar breadcrumbs={breadcrumbs} user={user} />
        <div className="tpc-scroll relative flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

// Espelha o guard do ClientShell. Quando isSignedIn flipa pra false
// (sessão revogada server-side), dispara signOut local + redirect.
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

const AdminSidebar = () => {
  const pathname = usePathname() ?? ''
  return (
    <aside className="hidden h-full w-[240px] flex-shrink-0 flex-col border-r border-tpc-border bg-tpc-bg py-5 lg:flex">
      <div className="flex items-center justify-between border-b border-tpc-border px-5 pb-5">
        <TPCLogo size={48} />
        <span className="rounded-md border border-tpc-red/40 bg-tpc-red/10 px-2 py-[3px] font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-tpc-red">
          Admin
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-3.5">
        {NAV_ITEMS.map((item) => (
          <SideNavItem
            key={item.id}
            item={item}
            active={pathname === item.href || pathname.startsWith(item.href + '/')}
          />
        ))}
      </nav>

      <div className="border-t border-tpc-border px-5 py-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-[11px] text-tpc-text-tertiary transition hover:text-tpc-text"
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
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Voltar pro painel cliente
        </Link>
      </div>
    </aside>
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
        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition',
        active
          ? 'bg-tpc-red/12 text-tpc-text'
          : 'text-tpc-text-secondary hover:bg-tpc-elevated hover:text-tpc-text',
      )}
    >
      <NavIcon kind={item.icon} />
      {item.label}
    </Link>
  )
}

const NavIcon = ({ kind }: { kind: AdminIcon }) => {
  const common = {
    width: 15,
    height: 15,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  if (kind === 'inbox') {
    return (
      <svg {...common}>
        <path d="M22 12h-6l-2 3h-4l-2-3H2" />
        <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      </svg>
    )
  }
  if (kind === 'users') {
    return (
      <svg {...common}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )
  }
  if (kind === 'tool') {
    return (
      <svg {...common}>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    )
  }
  if (kind === 'package') {
    return (
      <svg {...common}>
        <path d="M16.5 9.4l-9-5.19" />
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <path d="M3.27 6.96L12 12.01l8.73-5.05" />
        <path d="M12 22.08V12" />
      </svg>
    )
  }
  if (kind === 'megaphone') {
    return (
      <svg {...common}>
        <path d="M3 11l18-8v18l-18-8z" />
        <path d="M11 11.5V20" />
        <path d="M3 11v2a4 4 0 0 0 4 4h4" />
      </svg>
    )
  }
  return null
}

const AdminTopBar = ({
  breadcrumbs,
  user,
}: {
  breadcrumbs: string[]
  user?: AdminShellProps['user']
}) => {
  return (
    <header className="flex h-[58px] flex-shrink-0 items-center justify-between border-b border-tpc-border bg-tpc-bg px-5">
      <div className="flex items-center gap-2 text-[13px]">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb} className="flex items-center gap-2">
            {i > 0 && <span className="text-tpc-text-tertiary">/</span>}
            <span
              className={cn(
                i === breadcrumbs.length - 1
                  ? 'font-semibold tracking-tight text-tpc-text'
                  : 'text-tpc-text-secondary',
              )}
            >
              {crumb}
            </span>
          </span>
        ))}
      </div>

      {user && <AdminUserMenu user={user} />}
    </header>
  )
}

const AdminUserMenu = ({
  user,
}: {
  user: NonNullable<AdminShellProps['user']>
}) => {
  const clerk = useClerk()
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

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
          'flex cursor-pointer items-center gap-2 rounded-full px-1 py-1 text-[12px] text-tpc-text-secondary transition',
          open ? 'bg-tpc-elevated' : 'hover:bg-tpc-elevated',
        )}
      >
        <span className="pl-2">{user.firstName}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-tpc-elevated text-[11px] font-semibold text-tpc-text">
          {user.initials}
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
