'use client'

import { useClerk, useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { Card, DiagonalStripes, SecHeading, cn } from '@tpc/ui'

import { ClientShell } from '@/components/layout/ClientShell'
import { useApi } from '@/lib/api/client'

import { AddCardModal } from './_components/AddCardModal'
import { AvatarUploader } from './_components/AvatarUploader'
import { ConsentsModal } from './_components/ConsentsModal'
import { DataExportModal } from './_components/DataExportModal'
import { DeleteAccountModal } from './_components/DeleteAccountModal'
import { PerfilDadosForm } from './_components/PerfilDadosForm'

interface Saldo {
  available: number
  reserved: number
  total: number
}

export interface ProfileAddress {
  cep: string
  street: string
  number: string
  complement: string | null
  neighborhood: string
  city: string
  state: string
}

interface UserData {
  firstName: string
  fullName: string
  initials: string
  email: string
  phone: string
  cpfCnpj: string
  avatarUrl: string | null
  address: ProfileAddress | null
  id: string
}

type SectionId =
  | 'dados'
  | 'notif'
  | 'pagamentos'
  | 'seguranca'
  | 'privacidade'
  | 'ajuda'

const SECTIONS: Array<{
  id: SectionId
  label: string
  icon: IconKind
  badge?: string
}> = [
  { id: 'dados', label: 'Dados pessoais', icon: 'user' },
  { id: 'notif', label: 'Notificações', icon: 'bell' },
  { id: 'pagamentos', label: 'Pagamentos', icon: 'card' },
  { id: 'seguranca', label: 'Segurança', icon: 'shield' },
  { id: 'privacidade', label: 'Privacidade', icon: 'lock', badge: 'LGPD' },
  { id: 'ajuda', label: 'Ajuda & Legal', icon: 'help' },
]

interface Props {
  saldo: Saldo
  user: UserData
}

export const PerfilView = ({ saldo, user }: Props) => {
  const [section, setSection] = useState<SectionId>('dados')

  return (
    <ClientShell
      breadcrumbs={['Perfil']}
      saldoAvailable={saldo.available}
      user={{ firstName: user.firstName, initials: user.initials }}
    >
      <div className="mx-auto max-w-[1280px] px-5 py-7 md:px-10">
        <UserHero user={user} />

        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          <aside className="flex flex-col gap-1">
            {SECTIONS.map((s) => (
              <PerfilNavItem
                key={s.id}
                item={s}
                active={s.id === section}
                onSelect={() => setSection(s.id)}
              />
            ))}
          </aside>

          <div>
            {section === 'dados' && <PerfilDadosSection user={user} />}
            {section === 'notif' && <PerfilNotifSection />}
            {section === 'pagamentos' && <PerfilPagamentosSection />}
            {section === 'seguranca' && <PerfilSegurancaSection />}
            {section === 'privacidade' && <PerfilPrivacidadeSection />}
            {section === 'ajuda' && <PerfilAjudaSection />}
          </div>
        </div>
      </div>
    </ClientShell>
  )
}

const UserHero = ({ user }: { user: UserData }) => {
  return (
    <div className="relative mb-6 flex flex-col gap-4 overflow-hidden rounded-2xl border border-tpc-border bg-tpc-surface p-6 md:flex-row md:items-center md:gap-5">
      <div className="pointer-events-none absolute right-0 top-0 opacity-35">
        <DiagonalStripes width={200} height={120} thickness={1.5} spacing={11} mask="top-right" />
      </div>
      <div className="relative flex items-center gap-4 md:gap-5">
        <AvatarUploader user={user} />
        <div className="min-w-0">
          <div className="truncate text-[22px] font-bold tracking-[-0.03em] text-tpc-text">
            {user.fullName}
          </div>
          <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-tpc-text-tertiary">
            Cliente TPC · ID {user.id}
          </div>
        </div>
      </div>

      <div className="relative grid grid-cols-3 gap-4 border-t border-tpc-border pt-4 md:ml-auto md:max-w-md md:border-l md:border-t-0 md:pl-5 md:pt-0">
        <HeroStat label="Economia" value="R$ 1.270" color="green" />
        <HeroStat label="Pontos ganhos" value="+1.450" />
        <HeroStat label="Cliente desde" value="mar/24" />
      </div>
    </div>
  )
}

const HeroStat = ({
  label,
  value,
  color = 'default',
}: {
  label: string
  value: string
  color?: 'default' | 'green'
}) => {
  return (
    <div>
      <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-tpc-text-tertiary">
        {label}
      </div>
      <div
        className={cn(
          'tpc-num mt-1 text-base font-semibold tracking-[-0.03em]',
          color === 'green' ? 'text-tpc-green' : 'text-tpc-text',
        )}
      >
        {value}
      </div>
    </div>
  )
}

type IconKind = 'user' | 'bell' | 'card' | 'shield' | 'lock' | 'help'

const PerfilNavItem = ({
  item,
  active,
  onSelect,
}: {
  item: { id: SectionId; label: string; icon: IconKind; badge?: string }
  active: boolean
  onSelect: () => void
}) => {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex items-center gap-3 rounded-[10px] border px-3.5 py-2.5 text-left transition',
        active
          ? 'border-tpc-red/30 bg-tpc-red/10 text-tpc-red'
          : 'border-transparent text-tpc-text-secondary hover:bg-tpc-surface',
      )}
    >
      <NavIcon kind={item.icon} />
      <span
        className={cn(
          'flex-1 text-[13px] tracking-[-0.01em]',
          active ? 'font-semibold text-tpc-text' : 'font-medium text-tpc-text-secondary',
        )}
      >
        {item.label}
      </span>
      {item.badge && (
        <span className="rounded bg-tpc-text-tertiary/10 px-1.5 py-0.5 font-mono text-[7px] font-bold uppercase tracking-[0.18em] text-tpc-text-tertiary">
          {item.badge}
        </span>
      )}
      {active && <span className="h-3.5 w-[3px] rounded-sm bg-tpc-red" />}
    </button>
  )
}

const NavIcon = ({ kind }: { kind: IconKind }) => {
  const common = {
    width: 14,
    height: 14,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  if (kind === 'user')
    return (
      <svg {...common}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    )
  if (kind === 'bell')
    return (
      <svg {...common}>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      </svg>
    )
  if (kind === 'card')
    return (
      <svg {...common}>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
      </svg>
    )
  if (kind === 'shield')
    return (
      <svg {...common}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    )
  if (kind === 'lock')
    return (
      <svg {...common}>
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    )
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" />
    </svg>
  )
}

const PerfilDadosSection = ({ user }: { user: UserData }) => {
  return <PerfilDadosForm user={user} />
}

const PerfilNotifSection = () => {
  return (
    <section>
      <SecHeading
        className="px-0 pb-3 pt-0"
        action={
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-tpc-green">
            Transacional
          </span>
        }
      >
        Avisos do teu serviço
      </SecHeading>
      <p className="mb-2 rounded-[10px] border border-tpc-border bg-tpc-surface px-3.5 py-2.5 text-xs leading-relaxed text-tpc-text-secondary">
        Atualizações de pedidos, confirmações, recebimento de arquivos modificados.
      </p>
      <Card className="mb-6 overflow-hidden p-0">
        <NotifRow label="Push no app" defaultOn />
        <NotifRow label="E-mail" defaultOn />
        <NotifRow
          label="WhatsApp"
          defaultOn
          sub="chat com a TPC sobre teus pedidos"
          last
        />
      </Card>

      <SecHeading
        className="px-0 pb-3 pt-0"
        action={
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-tpc-yellow">
            Opt-in
          </span>
        }
      >
        Marketing
      </SecHeading>
      <p className="mb-2 rounded-[10px] border border-tpc-border bg-tpc-surface px-3.5 py-2.5 text-xs leading-relaxed text-tpc-text-secondary">
        Promoções, novos serviços e ofertas. Tu escolhe receber ou não.
      </p>
      <Card className="overflow-hidden p-0">
        <NotifRow label="Ofertas por e-mail" />
        <NotifRow label="Ofertas por WhatsApp" last />
      </Card>
    </section>
  )
}

const NotifRow = ({
  label,
  sub,
  defaultOn,
  last,
}: {
  label: string
  sub?: string
  defaultOn?: boolean
  last?: boolean
}) => {
  const [on, setOn] = useState(Boolean(defaultOn))
  return (
    <div
      className={cn(
        'flex items-center gap-4 px-5 py-3.5',
        !last && 'border-b border-tpc-border',
      )}
    >
      <div className="flex-1">
        <div className="text-[13px] font-medium text-tpc-text">{label}</div>
        {sub && (
          <div className="mt-0.5 text-[11px] text-tpc-text-tertiary">{sub}</div>
        )}
      </div>
      <Toggle on={on} onToggle={() => setOn((v) => !v)} />
    </div>
  )
}

const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={cn(
        'relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition',
        on ? 'bg-tpc-red' : 'bg-tpc-elevated-2',
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white transition',
          on ? 'translate-x-[18px]' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}

interface SavedCard {
  id: string
  brand: string
  lastFour: string
  holderName: string
  expMonth: number
  expYear: number
  exp: string
  isDefault: boolean
  createdAt: string
}

const brandLabel = (brand: string): string => {
  const b = brand.toLowerCase()
  if (b === 'visa') return 'Visa'
  if (b === 'master' || b === 'mastercard') return 'Mastercard'
  if (b === 'amex') return 'American Express'
  if (b === 'elo') return 'Elo'
  if (b === 'hipercard') return 'Hipercard'
  if (b === 'diners') return 'Diners'
  return brand.charAt(0).toUpperCase() + brand.slice(1)
}

const PerfilPagamentosSection = () => {
  const api = useApi()
  const [cards, setCards] = useState<SavedCard[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ items: SavedCard[] }>('/me/saved-cards')
      setCards(res.items)
    } catch {
      setCards([])
    }
  }, [api])

  useEffect(() => {
    void load()
  }, [load])

  const onRemove = useCallback(
    async (id: string) => {
      const card = cards?.find((c) => c.id === id)
      if (!card) return
      const confirmed = window.confirm(
        `Remover ${brandLabel(card.brand)} final ${card.lastFour}? Você ainda pode salvar de novo numa próxima compra.`,
      )
      if (!confirmed) return
      setBusyId(id)
      setCards((prev) => (prev ? prev.filter((c) => c.id !== id) : prev))
      try {
        await api.del(`/me/saved-cards/${id}`)
      } catch {
        // Rollback otimista em caso de falha
        void load()
      } finally {
        setBusyId(null)
      }
    },
    [api, cards, load],
  )

  const onSetDefault = useCallback(
    async (id: string) => {
      setBusyId(id)
      setCards((prev) =>
        prev
          ? prev.map((c) => ({ ...c, isDefault: c.id === id }))
          : prev,
      )
      try {
        await api.post(`/me/saved-cards/${id}/default`, {})
        void load()
      } catch {
        void load()
      } finally {
        setBusyId(null)
      }
    },
    [api, load],
  )

  const hasCards = cards !== null && cards.length > 0

  return (
    <section>
      <SecHeading
        className="px-0 pb-3 pt-0"
        action={
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-tpc-red px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-tpc-text transition hover:bg-tpc-red-dark"
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Adicionar
          </button>
        }
      >
        Pagamentos salvos
      </SecHeading>

      {cards === null ? (
        <Card className="mb-6 p-6 text-center text-sm text-tpc-text-tertiary">
          Carregando cartões…
        </Card>
      ) : !hasCards ? (
        <Card className="mb-6 p-6 text-center">
          <p className="text-sm font-semibold text-tpc-text">
            Nenhum cartão salvo
          </p>
          <p className="mt-1 text-xs text-tpc-text-tertiary">
            Adicione um cartão pra acelerar compras futuras.
          </p>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-tpc-red px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-tpc-text transition hover:bg-tpc-red-dark"
          >
            Adicionar cartão
          </button>
        </Card>
      ) : (
        <Card className="mb-6 overflow-hidden p-0">
          {cards.map((card, i) => (
            <PaymentRow
              key={card.id}
              card={card}
              last={i === cards.length - 1}
              busy={busyId === card.id}
              onRemove={() => onRemove(card.id)}
              onSetDefault={() => onSetDefault(card.id)}
            />
          ))}
        </Card>
      )}

      <SecHeading className="px-0 pb-3 pt-0">Histórico de transações</SecHeading>
      <Card className="p-4 text-center text-sm text-tpc-text-secondary">
        Pra ver todas as transações de compra de pontos, vai no{' '}
        <Link
          href="/historico"
          className="font-semibold text-tpc-red hover:underline"
        >
          Histórico → Compras
        </Link>
        .
      </Card>

      <AddCardModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => void load()}
      />
    </section>
  )
}

const PaymentRow = ({
  card,
  last,
  busy,
  onRemove,
  onSetDefault,
}: {
  card: SavedCard
  last?: boolean
  busy: boolean
  onRemove: () => void
  onSetDefault: () => void
}) => {
  const brand = card.brand.toLowerCase()
  return (
    <div
      className={cn(
        'flex items-center gap-4 px-5 py-4',
        !last && 'border-b border-tpc-border',
        busy && 'opacity-50',
      )}
    >
      {brand === 'visa' ? (
        <div className="flex h-8 w-12 flex-shrink-0 items-center justify-center rounded-md bg-[#1a1f3a] italic font-bold tracking-[-0.02em] text-white">
          VISA
        </div>
      ) : brand === 'master' || brand === 'mastercard' ? (
        <div className="relative flex h-8 w-12 flex-shrink-0 items-center justify-center rounded-md bg-tpc-elevated-2">
          <span className="absolute left-[11px] h-[14px] w-[14px] rounded-full bg-[#eb001b]" />
          <span className="absolute right-[11px] h-[14px] w-[14px] rounded-full bg-[#f79e1b] mix-blend-multiply" />
        </div>
      ) : (
        <div className="flex h-8 w-12 flex-shrink-0 items-center justify-center rounded-md border border-tpc-border bg-tpc-surface font-mono text-[9px] font-bold uppercase tracking-wider text-tpc-text-secondary">
          {brand.slice(0, 4)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-sm font-semibold text-tpc-text">
            {brandLabel(card.brand)} final {card.lastFour}
          </span>
          {card.isDefault && (
            <span className="rounded border border-tpc-green/40 bg-tpc-green/10 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-tpc-green">
              Padrão
            </span>
          )}
        </div>
        <div className="mt-1 font-mono text-[11px] tracking-wide text-tpc-text-tertiary">
          venc {card.exp}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!card.isDefault && (
          <button
            type="button"
            onClick={onSetDefault}
            disabled={busy}
            className="rounded border border-tpc-border bg-tpc-surface px-3 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-tpc-text-secondary transition hover:border-tpc-green/40 hover:text-tpc-green disabled:cursor-not-allowed"
          >
            Tornar padrão
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          disabled={busy}
          className="rounded border border-tpc-border bg-tpc-surface px-3 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-tpc-text-secondary transition hover:border-tpc-red/40 hover:text-tpc-red disabled:cursor-not-allowed"
        >
          Remover
        </button>
      </div>
    </div>
  )
}

interface SessionInfo {
  id: string
  isCurrent: boolean
  browser: string
  os: string
  city: string | null
  lastActiveAt: Date | null
}

// Toda a tela de segurança delega pro Clerk UserProfile (modal hosted) que
// já tem fluxo seguro de senha, 2FA e revoke de sessões. Aqui só mostramos
// status real e abrimos o modal nos contextos certos.
const PerfilSegurancaSection = () => {
  const { user, isLoaded } = useUser()
  const clerk = useClerk()
  const [sessions, setSessions] = useState<SessionInfo[] | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    await clerk.signOut({ redirectUrl: '/sign-in' })
  }

  const twoFactorOn = useMemo<boolean>(() => {
    if (!user) return false
    return Boolean(user.totpEnabled) || Boolean(user.backupCodeEnabled)
  }, [user])

  // user.getSessions() retorna SessionWithActivities[] do Clerk. Mapeia pra
  // shape compacto pro UI. Pode falhar (rede) — degrada pra null sem
  // quebrar a section toda.
  useEffect(() => {
    if (!user) return
    let alive = true
    user
      .getSessions()
      .then((list) => {
        if (!alive) return
        const currentId = clerk.session?.id ?? null
        setSessions(
          list.map((s) => ({
            id: s.id,
            isCurrent: s.id === currentId,
            browser: s.latestActivity?.browserName ?? 'Browser',
            os: s.latestActivity?.deviceType ?? 'Dispositivo',
            city: s.latestActivity?.city ?? null,
            lastActiveAt: s.lastActiveAt ?? null,
          })),
        )
      })
      .catch(() => setSessions([]))
    return () => {
      alive = false
    }
  }, [user, clerk.session])

  const openProfile = () => clerk.openUserProfile()

  const sessionsLabel = (() => {
    if (sessions === null) return 'carregando…'
    if (sessions.length === 0) return 'sem sessões ativas'
    const others = sessions.filter((s) => !s.isCurrent)
    if (sessions.length === 1) return '1 dispositivo · esse aqui'
    return `${sessions.length} dispositivos${others.length > 0 ? ` · ${others.length} outras sessões ativas` : ''}`
  })()

  return (
    <section>
      <SecHeading className="px-0 pb-3 pt-0">Segurança da conta</SecHeading>
      <Card className="overflow-hidden p-0">
        <SecurityRow
          title="Trocar senha"
          sub={
            user?.passwordEnabled
              ? 'troca direto pelo Clerk, sem sair do app'
              : 'login social ativo — senha gerenciada pelo provedor'
          }
          action={
            <ActionButton onClick={openProfile} disabled={!isLoaded}>
              Abrir
            </ActionButton>
          }
        />
        <SecurityRow
          title="Autenticação em 2 fatores"
          sub={
            !isLoaded
              ? 'carregando…'
              : twoFactorOn
                ? 'ativado · proteção extra contra acesso não autorizado'
                : 'recomendado pra contas com saldo alto'
          }
          action={
            <TwoFactorToggle
              on={twoFactorOn}
              disabled={!isLoaded}
              onToggle={openProfile}
            />
          }
        />
        <SecurityRow
          title="Sessões ativas"
          sub={sessionsLabel}
          action={
            <ActionButton onClick={openProfile} disabled={!isLoaded}>
              Gerenciar
            </ActionButton>
          }
        />
        {sessions && sessions.length > 0 && (
          <div className="border-b border-tpc-border bg-tpc-surface/40 px-5 py-3">
            <ul className="flex flex-col gap-2">
              {sessions.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-medium text-tpc-text">
                      {s.browser} · {s.os}
                      {s.isCurrent && (
                        <span className="ml-2 rounded border border-tpc-green/40 bg-tpc-green/10 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-tpc-green">
                          Esta sessão
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] tracking-wide text-tpc-text-tertiary">
                      {[s.city, formatLastActive(s.lastActiveAt)]
                        .filter(Boolean)
                        .join(' · ') || 'sessão ativa'}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        <SecurityRow
          title="Sair da conta"
          sub="encerra essa sessão neste dispositivo"
          last
          action={
            <ActionButton onClick={handleSignOut} disabled={signingOut}>
              {signingOut ? 'Saindo…' : 'Sair'}
            </ActionButton>
          }
        />
      </Card>
    </section>
  )
}

const formatLastActive = (date: Date | null): string => {
  if (!date) return ''
  const diff = Date.now() - date.getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'ativa agora'
  if (min < 60) return `${min}min atrás`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h atrás`
  const days = Math.floor(hr / 24)
  return `${days}d atrás`
}

const SecurityRow = ({
  title,
  sub,
  action,
  last,
}: {
  title: string
  sub: string
  action: React.ReactNode
  last?: boolean
}) => {
  return (
    <div
      className={cn(
        'flex items-center gap-4 px-5 py-4',
        !last && 'border-b border-tpc-border',
      )}
    >
      <div className="flex-1">
        <div className="text-[13px] font-medium text-tpc-text">{title}</div>
        <div className="mt-0.5 text-[11px] text-tpc-text-tertiary">{sub}</div>
      </div>
      {action}
    </div>
  )
}

const ActionButton = ({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'rounded border border-tpc-border bg-tpc-surface px-3 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-tpc-text transition',
      disabled
        ? 'cursor-not-allowed opacity-50'
        : 'cursor-pointer hover:border-tpc-border-strong hover:bg-tpc-elevated',
    )}
  >
    {children}
  </button>
)

const TwoFactorToggle = ({
  on,
  disabled,
  onToggle,
}: {
  on: boolean
  disabled?: boolean
  onToggle: () => void
}) => (
  <Toggle on={on} onToggle={disabled ? () => undefined : onToggle} />
)

type PrivacyModal = 'export' | 'consents' | 'delete' | null

const PerfilPrivacidadeSection = () => {
  const [openModal, setOpenModal] = useState<PrivacyModal>(null)
  return (
    <section>
      <SecHeading
        className="px-0 pb-3 pt-0"
        action={
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-tpc-text-tertiary">
            LGPD compliance
          </span>
        }
      >
        Privacidade e dados
      </SecHeading>
      <Card className="mb-4 overflow-hidden p-0">
        <PrivacyRow
          title="Solicitar minhas informações"
          sub="Baixa um relatório com tudo que TPC guarda sobre ti (JSON + ZIP)"
          cta="Solicitar"
          onClick={() => setOpenModal('export')}
        />
        <PrivacyRow
          title="Gerenciar consentimentos"
          sub="Controle granular do que TPC pode fazer com teus dados"
          cta="Abrir"
          onClick={() => setOpenModal('consents')}
        />
        <PrivacyRow
          title="Excluir minha conta"
          sub="Permanente · saldo e histórico apagados após carência"
          cta="Excluir"
          danger
          last
          onClick={() => setOpenModal('delete')}
        />
      </Card>

      <div className="rounded-[10px] border border-dashed border-tpc-border bg-tpc-surface p-3.5 text-[11.5px] leading-relaxed text-tpc-text-secondary">
        <strong className="font-semibold text-tpc-text">Importante:</strong> por
        questões fiscais, TPC mantém registro de transações por 5 anos (Lei
        8.846/94), mas teus dados pessoais identificáveis são apagados quando tu
        pedir.
      </div>

      <DataExportModal
        open={openModal === 'export'}
        onClose={() => setOpenModal(null)}
      />
      <ConsentsModal
        open={openModal === 'consents'}
        onClose={() => setOpenModal(null)}
      />
      <DeleteAccountModal
        open={openModal === 'delete'}
        onClose={() => setOpenModal(null)}
      />
    </section>
  )
}

const PrivacyRow = ({
  title,
  sub,
  cta,
  danger,
  last,
  onClick,
}: {
  title: string
  sub: string
  cta: string
  danger?: boolean
  last?: boolean
  onClick: () => void
}) => {
  return (
    <div
      className={cn(
        'flex items-center gap-4 px-5 py-4',
        !last && 'border-b border-tpc-border',
      )}
    >
      <div className="flex-1">
        <div
          className={cn(
            'text-[13px] font-medium',
            danger ? 'text-tpc-red' : 'text-tpc-text',
          )}
        >
          {title}
        </div>
        <div className="mt-0.5 text-[11px] leading-snug text-tpc-text-tertiary">
          {sub}
        </div>
      </div>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'cursor-pointer rounded border px-3 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] transition',
          danger
            ? 'border-tpc-red/50 bg-transparent text-tpc-red hover:bg-tpc-red/10'
            : 'border-tpc-border bg-tpc-surface text-tpc-text hover:bg-tpc-elevated',
        )}
      >
        {cta}
      </button>
    </div>
  )
}

const PerfilAjudaSection = () => {
  return (
    <section>
      <SecHeading className="px-0 pb-3 pt-0">Ajuda</SecHeading>
      <Card className="mb-6 overflow-hidden p-0">
        <div className="flex items-center gap-3.5 border-b border-tpc-border px-5 py-4">
          <div className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-lg border border-tpc-green/40 bg-tpc-green/10 text-tpc-green">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 8.4 8.4 0 0 1-3.7-.8L3 21l1.5-4.7A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-[13px] font-medium text-tpc-text">
              Falar com a TPC
            </div>
            <div className="mt-0.5 text-[11px] text-tpc-text-tertiary">
              WhatsApp · seg-sex 08h-18h
            </div>
          </div>
          <button
            type="button"
            className="rounded bg-tpc-green px-3 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-tpc-text"
          >
            Abrir chat
          </button>
        </div>
        <div className="px-5 py-4">
          <div className="text-[13px] font-medium text-tpc-text">Central de ajuda</div>
          <div className="mt-0.5 text-[11px] text-tpc-text-tertiary">
            FAQ, tutoriais e guias rápidos
          </div>
        </div>
      </Card>

      <SecHeading className="px-0 pb-3 pt-0">Legal</SecHeading>
      <Card className="overflow-hidden p-0">
        <Link
          href="/legal/termos"
          className="flex items-center justify-between border-b border-tpc-border px-5 py-3.5 text-[13px] text-tpc-text transition hover:bg-tpc-elevated"
        >
          <span>Termos de uso</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-tpc-text-tertiary"
            aria-hidden
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </Link>
        <Link
          href="/legal/privacidade"
          className="flex items-center justify-between border-b border-tpc-border px-5 py-3.5 text-[13px] text-tpc-text transition hover:bg-tpc-elevated"
        >
          <span>Política de privacidade</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-tpc-text-tertiary"
            aria-hidden
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </Link>
        <div className="flex items-center justify-between px-5 py-3.5">
          <span className="text-[13px] text-tpc-text">Versão do app</span>
          <span className="font-mono text-[11px] tracking-wide text-tpc-text-tertiary">
            2.4.1 · 2026.05
          </span>
        </div>
      </Card>
    </section>
  )
}
