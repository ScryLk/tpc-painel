'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { formatPoints } from '@tpc/lib/formatters'
import { Card, SecHeading, cn } from '@tpc/ui'

import { useApi } from '@/lib/api/client'

import type { AdminUserDetail } from './page'

interface Props {
  initial: AdminUserDetail
  actorIsAdmin: boolean
  actorIsSelf: boolean
}

type Role = AdminUserDetail['role']

const ROLE_LABEL: Record<Role, string> = {
  CUSTOMER: 'Cliente',
  STAFF: 'TPC Staff',
  ADMIN: 'Admin',
}

const ROLE_BADGE_CLS: Record<Role, string> = {
  CUSTOMER: 'border-tpc-border bg-tpc-elevated text-tpc-text-tertiary',
  STAFF: 'border-tpc-yellow/40 bg-tpc-yellow/10 text-tpc-yellow',
  ADMIN: 'border-tpc-red/40 bg-tpc-red/10 text-tpc-red',
}

export const UsuarioDetailView = ({
  initial,
  actorIsAdmin,
  actorIsSelf,
}: Props) => {
  const router = useRouter()
  const [user, setUser] = useState<AdminUserDetail>(initial)
  const [editOpen, setEditOpen] = useState(false)
  const [roleOpen, setRoleOpen] = useState(false)
  // Bumpado quando uma ação altera sessões (ex: password reset revogou
  // tudo). SessionsSection observa e re-fetcha.
  const [sessionsRefreshKey, setSessionsRefreshKey] = useState(0)
  const bumpSessions = () => setSessionsRefreshKey((k) => k + 1)

  const onEditDone = (next: Partial<AdminUserDetail>) => {
    setUser((u) => ({ ...u, ...next }))
    setEditOpen(false)
    router.refresh()
  }

  const onRoleDone = (nextRole: Role) => {
    setUser((u) => ({ ...u, role: nextRole }))
    setRoleOpen(false)
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-[1000px] px-6 py-6 md:px-8">
      <div className="mb-5">
        <Link
          href="/admin/usuarios"
          className="inline-flex items-center gap-1.5 text-[12px] text-tpc-text-secondary transition hover:text-tpc-text"
        >
          <svg
            width="12"
            height="12"
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
          Voltar pra lista
        </Link>
      </div>

      <UserHero user={user} />

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="flex flex-col gap-4">
          <DadosSection user={user} onEdit={() => setEditOpen(true)} />
          <SessionsSection
            userId={user.id}
            actorIsSelf={actorIsSelf}
            refreshKey={sessionsRefreshKey}
          />
          <AtividadeSection user={user} />
        </div>
        <div className="flex flex-col gap-4">
          <ContaSection
            user={user}
            canChangeRole={actorIsAdmin && !actorIsSelf}
            isSelf={actorIsSelf}
            onChangeRole={() => setRoleOpen(true)}
            onSessionsChanged={bumpSessions}
          />
          <ConsentSection user={user} />
        </div>
      </div>

      {editOpen && (
        <EditModal user={user} onClose={() => setEditOpen(false)} onDone={onEditDone} />
      )}
      {roleOpen && (
        <RoleModal user={user} onClose={() => setRoleOpen(false)} onDone={onRoleDone} />
      )}
    </div>
  )
}

// ----------------------------------------------------------------------------
// Sections
// ----------------------------------------------------------------------------

const UserHero = ({ user }: { user: AdminUserDetail }) => {
  const inactive = Boolean(user.deletedAt) || user.pendingDeletion
  return (
    <div className="mb-5 flex flex-wrap items-center gap-4 rounded-2xl border border-tpc-border bg-tpc-surface p-5">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-tpc-red to-tpc-red-dark text-[20px] font-bold text-tpc-text">
        {initials(user.name)}
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[22px] font-bold tracking-[-0.03em] text-tpc-text">
          {user.name}
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-tpc-text-tertiary">
          <span>{user.email}</span>
          <span>·</span>
          <span>ID {user.id.slice(-6).toUpperCase()}</span>
          <span>·</span>
          <span>Cadastro {formatDate(user.createdAt)}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            'rounded border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em]',
            ROLE_BADGE_CLS[user.role],
          )}
        >
          {ROLE_LABEL[user.role]}
        </span>
        {user.deletedAt && (
          <span className="rounded border border-tpc-text-tertiary/40 bg-tpc-elevated px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-tpc-text-tertiary">
            Deletado
          </span>
        )}
        {user.pendingDeletion && !user.deletedAt && (
          <span className="rounded border border-tpc-yellow/40 bg-tpc-yellow/10 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-tpc-yellow">
            Pending del.
          </span>
        )}
      </div>
      {inactive && (
        <p className="basis-full text-[12px] text-tpc-text-tertiary">
          Conta inativa — leitura permitida pra audit, mas edição pode falhar
          dependendo do estado.
        </p>
      )}
    </div>
  )
}

const DadosSection = ({
  user,
  onEdit,
}: {
  user: AdminUserDetail
  onEdit: () => void
}) => {
  return (
    <section>
      <SecHeading
        className="px-0 pb-3 pt-0"
        action={
          <button
            type="button"
            onClick={onEdit}
            className="cursor-pointer rounded border border-tpc-border bg-tpc-surface px-3 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-tpc-text-secondary transition hover:border-tpc-red/40 hover:text-tpc-red"
          >
            Editar
          </button>
        }
      >
        Dados pessoais
      </SecHeading>
      <Card className="overflow-hidden p-0">
        <KVRow k="Nome" v={user.name} />
        <KVRow k="Email" v={user.email} sub="gerenciado pelo Clerk" />
        <KVRow k="Telefone" v={user.phone || '—'} />
        <KVRow k="CPF/CNPJ" v={formatCpfCnpj(user.cpfCnpj)} />
        <KVRow
          k="Endereço"
          v={user.address ? formatAddress(user.address) : '—'}
          last
        />
      </Card>
    </section>
  )
}

const ContaSection = ({
  user,
  canChangeRole,
  isSelf,
  onChangeRole,
  onSessionsChanged,
}: {
  user: AdminUserDetail
  canChangeRole: boolean
  isSelf: boolean
  onChangeRole: () => void
  onSessionsChanged: () => void
}) => {
  return (
    <section>
      <SecHeading className="px-0 pb-3 pt-0">Conta</SecHeading>
      <Card className="overflow-hidden p-0">
        <div className="flex items-start justify-between gap-3 border-b border-tpc-border px-4 py-3">
          <div>
            <div className="text-[12px] font-medium text-tpc-text-secondary">
              Role
            </div>
            <div
              className={cn(
                'mt-1 inline-block rounded border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em]',
                ROLE_BADGE_CLS[user.role],
              )}
            >
              {ROLE_LABEL[user.role]}
            </div>
          </div>
          {canChangeRole ? (
            <button
              type="button"
              onClick={onChangeRole}
              className="shrink-0 cursor-pointer rounded border border-tpc-border bg-tpc-surface px-3 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-tpc-text-secondary transition hover:border-tpc-red/40 hover:text-tpc-red"
            >
              Trocar
            </button>
          ) : (
            <span className="shrink-0 text-right font-mono text-[9px] uppercase tracking-[0.12em] text-tpc-text-tertiary">
              {isSelf ? 'não dá pra mudar a própria' : 'apenas admin'}
            </span>
          )}
        </div>
        <PasswordResetRow user={user} onSessionsChanged={onSessionsChanged} />
        <KVRow
          k="Status"
          v={
            user.deletedAt
              ? 'Deletado'
              : user.pendingDeletion
                ? 'Pending deletion'
                : 'Ativo'
          }
        />
        <KVRow k="Clerk ID" v={user.clerkId} mono />
        <KVRow k="Última atualização" v={formatDate(user.updatedAt)} last />
      </Card>
    </section>
  )
}

const ConsentSection = ({ user }: { user: AdminUserDetail }) => {
  if (!user.consent) return null
  const items: Array<{ k: string; v: boolean }> = [
    { k: 'Email marketing', v: user.consent.marketingEmail },
    { k: 'WhatsApp marketing', v: user.consent.marketingWhatsapp },
    { k: 'Email transacional', v: user.consent.transactionalEmail },
    { k: 'WhatsApp transacional', v: user.consent.transactionalWhatsapp },
    { k: 'Push transacional', v: user.consent.transactionalPush },
  ]
  return (
    <section>
      <SecHeading className="px-0 pb-3 pt-0">Consentimentos</SecHeading>
      <Card className="overflow-hidden p-0">
        {items.map((it, i) => (
          <div
            key={it.k}
            className={cn(
              'flex items-center justify-between px-4 py-2.5',
              i < items.length - 1 && 'border-b border-tpc-border',
            )}
          >
            <span className="text-[12.5px] text-tpc-text-secondary">{it.k}</span>
            <span
              className={cn(
                'font-mono text-[10px] font-bold uppercase tracking-[0.14em]',
                it.v ? 'text-tpc-green' : 'text-tpc-text-tertiary',
              )}
            >
              {it.v ? 'On' : 'Off'}
            </span>
          </div>
        ))}
      </Card>
    </section>
  )
}

const AtividadeSection = ({ user }: { user: AdminUserDetail }) => {
  return (
    <section>
      <SecHeading className="px-0 pb-3 pt-0">Atividade</SecHeading>
      <Card className="p-4">
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Saldo disponível" value={`${formatPoints(user.balance.available)} pts`} />
          <Stat
            label="Reservado"
            value={`${formatPoints(user.balance.reserved)} pts`}
            warn={user.balance.reserved > 0}
          />
          <Stat label="Carros" value={String(user.counts.cars)} />
          <Stat label="Compras" value={String(user.counts.purchases)} />
          <Stat label="Pedidos presenciais" value={String(user.counts.solicitacoes)} />
          <Stat label="Pedidos file service" value={String(user.counts.remapOrders)} />
        </div>

        <div className="border-t border-tpc-border pt-3">
          <div className="mb-2 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-tpc-text-tertiary">
            Últimas transações
          </div>
          {user.recentTransactions.length === 0 ? (
            <p className="text-[12px] text-tpc-text-tertiary">
              Nenhuma transação.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {user.recentTransactions.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 text-[12px]"
                >
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-tpc-text-tertiary">
                    {formatDate(t.createdAt)}
                  </span>
                  <span className="flex-1 text-tpc-text-secondary">
                    {txTypeLabel(t.type)}
                  </span>
                  <span
                    className={cn(
                      'tpc-num font-semibold',
                      txAmountClass(t.type),
                    )}
                  >
                    {txSign(t.type)}
                    {formatPoints(t.amount)}
                  </span>
                  <span className="font-mono text-[10px] text-tpc-text-tertiary">
                    saldo {formatPoints(t.balanceAfter)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </section>
  )
}

// ----------------------------------------------------------------------------
// Sessions — read via API que chama Clerk SDK. Carrega on-mount, permite
// revogar sessões individuais. Phase 2 da spec admin-usuarios.
// ----------------------------------------------------------------------------

interface SessionRow {
  id: string
  status: string
  createdAt: string
  lastActiveAt: string
  expireAt: string
  browser: string | null
  browserVersion: string | null
  deviceType: string | null
  isMobile: boolean
  city: string | null
  country: string | null
  ipAddress: string | null
}

const SessionsSection = ({
  userId,
  actorIsSelf,
  refreshKey,
}: {
  userId: string
  actorIsSelf: boolean
  refreshKey: number
}) => {
  const api = useApi()
  const [items, setItems] = useState<SessionRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)

  const load = async () => {
    setError(null)
    try {
      const res = await api.get<{ items: SessionRow[] }>(
        `/admin/users/${userId}/sessions`,
      )
      setItems(res.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar sessões')
      setItems([])
    }
  }

  // Re-fetch quando userId muda OU quando refreshKey é bumpado (ex: depois
  // de password reset que revogou sessões).
  useEffect(() => {
    void load()
    // load não muda — dependência só do userId/refreshKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, refreshKey])

  const revoke = async (sessionId: string) => {
    if (revoking) return
    if (!confirm('Forçar logout dessa sessão? O usuário precisará entrar de novo.'))
      return
    setRevoking(sessionId)
    try {
      await api.post(`/admin/users/${userId}/sessions/${sessionId}/revoke`, {})
      setItems((prev) => prev?.filter((s) => s.id !== sessionId) ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao revogar')
    } finally {
      setRevoking(null)
    }
  }

  return (
    <section>
      <SecHeading
        className="px-0 pb-3 pt-0"
        action={
          <button
            type="button"
            onClick={() => void load()}
            className="cursor-pointer rounded border border-tpc-border bg-tpc-surface px-3 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-tpc-text-secondary transition hover:border-tpc-border-strong hover:text-tpc-text"
          >
            Atualizar
          </button>
        }
      >
        Sessões ativas
      </SecHeading>

      <Card className="overflow-hidden p-0">
        {items === null ? (
          <div className="px-4 py-8 text-center text-[12px] text-tpc-text-tertiary">
            Carregando sessões…
          </div>
        ) : error && items.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <div className="text-[12.5px] text-tpc-red">{error}</div>
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-6 text-center text-[12px] text-tpc-text-tertiary">
            Nenhuma sessão ativa agora.
          </div>
        ) : (
          <ul>
            {items.map((s, i) => (
              <SessionRowItem
                key={s.id}
                session={s}
                last={i === items.length - 1}
                revoking={revoking === s.id}
                disabled={actorIsSelf || revoking !== null}
                onRevoke={() => void revoke(s.id)}
              />
            ))}
          </ul>
        )}
      </Card>

      {actorIsSelf && (
        <p className="mt-2 font-mono text-[10px] tracking-wide text-tpc-text-tertiary">
          Não dá pra revogar sessões da própria conta por aqui. Use o perfil.
        </p>
      )}

      <p className="mt-2 font-mono text-[10px] tracking-wide text-tpc-text-tertiary">
        Caveat: o JWT do cliente expira no próximo refresh (~5min). Logout
        instantâneo só com reload do app.
      </p>
    </section>
  )
}

const SessionRowItem = ({
  session,
  last,
  revoking,
  disabled,
  onRevoke,
}: {
  session: SessionRow
  last: boolean
  revoking: boolean
  disabled: boolean
  onRevoke: () => void
}) => {
  const deviceLine = [
    session.browser,
    session.deviceType,
    session.isMobile ? 'mobile' : null,
  ]
    .filter(Boolean)
    .join(' · ') || 'Dispositivo'

  const locLine = [session.city, session.country, session.ipAddress]
    .filter(Boolean)
    .join(' · ')

  return (
    <li
      className={cn(
        'flex items-start justify-between gap-3 px-4 py-3',
        !last && 'border-b border-tpc-border',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-tpc-text">
          {deviceLine}
        </div>
        {locLine && (
          <div className="mt-0.5 truncate font-mono text-[10px] tracking-wide text-tpc-text-tertiary">
            {locLine}
          </div>
        )}
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-tpc-text-tertiary">
          <span>Última atividade: {formatRelative(session.lastActiveAt)}</span>
          <span>Criada: {formatRelative(session.createdAt)}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onRevoke}
        disabled={disabled}
        className="shrink-0 cursor-pointer rounded border border-tpc-border bg-tpc-surface px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-tpc-text-secondary transition hover:border-tpc-red/40 hover:text-tpc-red disabled:cursor-not-allowed disabled:opacity-50"
      >
        {revoking ? 'Revogando…' : 'Forçar logout'}
      </button>
    </li>
  )
}

// ----------------------------------------------------------------------------
// Password reset — dispara email com sign-in token do Clerk. Admin nunca
// vê a senha; usuário entra pelo link, troca a senha em /perfil → Segurança.
// ----------------------------------------------------------------------------

const PasswordResetRow = ({
  user,
  onSessionsChanged,
}: {
  user: AdminUserDetail
  onSessionsChanged: () => void
}) => {
  const api = useApi()
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const disabled = sending || Boolean(user.deletedAt)

  const send = async () => {
    if (disabled) return
    if (
      !confirm(
        `Enviar email de redefinição de senha pra ${user.email}?\n\nO link vale por 1h e todas as sessões ativas do usuário serão encerradas por segurança.`,
      )
    )
      return
    setError(null)
    setSuccess(null)
    setSending(true)
    try {
      const res = await api.post<{
        ok: boolean
        expiresInMinutes: number
        sentTo: string
        revokedSessions: number
      }>(`/admin/users/${user.id}/password-reset`, {})
      const parts = [
        `Email enviado pra ${res.sentTo}`,
        `link válido por ${res.expiresInMinutes}min`,
      ]
      if (res.revokedSessions > 0) {
        parts.push(
          `${res.revokedSessions} sessã${res.revokedSessions === 1 ? 'o' : 'ões'} revogada${res.revokedSessions === 1 ? '' : 's'}`,
        )
        onSessionsChanged()
      }
      setSuccess(parts.join(' · '))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao enviar email')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="border-b border-tpc-border px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[12px] font-medium text-tpc-text-secondary">
            Senha
          </div>
          <div className="mt-0.5 text-[11.5px] leading-snug text-tpc-text-tertiary">
            Envia email com link pro user definir uma senha nova.
          </div>
        </div>
        <button
          type="button"
          onClick={send}
          disabled={disabled}
          className="shrink-0 cursor-pointer rounded border border-tpc-border bg-tpc-surface px-3 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-tpc-text-secondary transition hover:border-tpc-red/40 hover:text-tpc-red disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? 'Enviando…' : 'Enviar link'}
        </button>
      </div>
      {success && (
        <div className="mt-2 rounded-[8px] border border-tpc-green/40 bg-tpc-green/10 px-3 py-1.5 text-[11.5px] text-tpc-green">
          {success}
        </div>
      )}
      {error && (
        <div className="mt-2 rounded-[8px] border border-tpc-red/40 bg-tpc-red/10 px-3 py-1.5 text-[11.5px] text-tpc-red">
          {error}
        </div>
      )}
    </div>
  )
}

const formatRelative = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min}min atrás`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h atrás`
  const days = Math.floor(hr / 24)
  if (days < 7) return `${days}d atrás`
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
}

const Stat = ({
  label,
  value,
  warn,
}: {
  label: string
  value: string
  warn?: boolean
}) => (
  <div className="rounded-[10px] border border-tpc-border bg-tpc-surface/40 px-3 py-2.5">
    <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-tpc-text-tertiary">
      {label}
    </div>
    <div
      className={cn(
        'tpc-num mt-1 text-[15px] font-semibold tracking-tight',
        warn ? 'text-tpc-yellow' : 'text-tpc-text',
      )}
    >
      {value}
    </div>
  </div>
)

const KVRow = ({
  k,
  v,
  sub,
  mono,
  last,
}: {
  k: string
  v: string
  sub?: string
  mono?: boolean
  last?: boolean
}) => (
  <div
    className={cn(
      'flex items-start justify-between gap-4 px-4 py-3',
      !last && 'border-b border-tpc-border',
    )}
  >
    <div className="min-w-0">
      <div className="text-[12px] text-tpc-text-secondary">{k}</div>
      <div
        className={cn(
          'mt-0.5 break-words text-[13px] text-tpc-text',
          mono && 'font-mono text-[11px] tracking-tight',
        )}
      >
        {v}
      </div>
    </div>
    {sub && (
      <div className="shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-tpc-text-tertiary">
        {sub}
      </div>
    )}
  </div>
)

// ----------------------------------------------------------------------------
// Edit modal
// ----------------------------------------------------------------------------

const EditModal = ({
  user,
  onClose,
  onDone,
}: {
  user: AdminUserDetail
  onClose: () => void
  onDone: (next: Partial<AdminUserDetail>) => void
}) => {
  const api = useApi()
  const [name, setName] = useState(user.name)
  const [phone, setPhone] = useState(user.phone ?? '')
  const [cpfCnpj, setCpfCnpj] = useState(user.cpfCnpj ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, saving])

  const save = async () => {
    if (saving) return
    setError(null)
    const body: Record<string, string | null> = {}
    if (name.trim() !== user.name) body.name = name.trim()
    const phoneN = phone.trim() || null
    if (phoneN !== user.phone) body.phone = phoneN
    const cpfN = cpfCnpj.trim() || null
    if (cpfN !== user.cpfCnpj) body.cpfCnpj = cpfN
    if (Object.keys(body).length === 0) {
      onClose()
      return
    }
    setSaving(true)
    try {
      await api.patch(`/admin/users/${user.id}`, body)
      onDone({
        name: name.trim(),
        phone: phoneN,
        cpfCnpj: cpfN,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell title="Editar dados pessoais" onClose={onClose} disabled={saving}>
      <div className="flex flex-col gap-3">
        <Field label="Nome">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
            className="w-full rounded-[10px] border border-tpc-border bg-tpc-bg px-3 py-2 text-[13px] text-tpc-text focus:border-tpc-border-strong focus:outline-none"
          />
        </Field>
        <Field label="Telefone">
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={40}
            placeholder="ex: +55 55 99999-9999"
            className="w-full rounded-[10px] border border-tpc-border bg-tpc-bg px-3 py-2 text-[13px] text-tpc-text focus:border-tpc-border-strong focus:outline-none"
          />
        </Field>
        <Field label="CPF / CNPJ" hint="só dígitos">
          <input
            type="text"
            value={cpfCnpj}
            onChange={(e) => setCpfCnpj(e.target.value.replace(/\D/g, ''))}
            maxLength={14}
            placeholder="11 ou 14 dígitos"
            className="w-full rounded-[10px] border border-tpc-border bg-tpc-bg px-3 py-2 font-mono text-[12px] text-tpc-text focus:border-tpc-border-strong focus:outline-none"
          />
        </Field>

        {error && (
          <div className="rounded-[10px] border border-tpc-red/40 bg-tpc-red/10 px-3 py-2 text-[12px] text-tpc-red">
            {error}
          </div>
        )}

        <div className="mt-1 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-[10px] border border-tpc-border bg-tpc-surface px-3.5 py-2 text-[12px] text-tpc-text-secondary transition hover:text-tpc-text disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-[10px] bg-tpc-red px-3.5 py-2 text-[12px] font-semibold text-tpc-text shadow-md shadow-tpc-red/20 transition hover:bg-tpc-red-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

// ----------------------------------------------------------------------------
// Role modal — admin-only
// ----------------------------------------------------------------------------

const RoleModal = ({
  user,
  onClose,
  onDone,
}: {
  user: AdminUserDetail
  onClose: () => void
  onDone: (role: Role) => void
}) => {
  const api = useApi()
  const [nextRole, setNextRole] = useState<Role>(user.role)
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, saving])

  const changed = nextRole !== user.role
  const canConfirm = changed && confirm.trim() === user.email

  const save = async () => {
    if (!canConfirm || saving) return
    setError(null)
    setSaving(true)
    try {
      await api.patch(`/admin/users/${user.id}/role`, { role: nextRole })
      onDone(nextRole)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao trocar role')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell
      title="Trocar role"
      onClose={onClose}
      disabled={saving}
      tone="danger"
    >
      <div className="flex flex-col gap-3">
        <p className="text-[12.5px] leading-relaxed text-tpc-text-secondary">
          Mudar a role afeta o que esse usuário pode fazer no sistema. STAFF
          tem acesso ao painel admin; ADMIN também pode promover outros
          usuários. Confirma digitando o email da conta abaixo.
        </p>

        <Field label="Nova role">
          <div className="flex gap-1.5">
            {(['CUSTOMER', 'STAFF', 'ADMIN'] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setNextRole(r)}
                className={cn(
                  'flex-1 rounded-[10px] border px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] transition',
                  nextRole === r
                    ? ROLE_BADGE_CLS[r]
                    : 'border-tpc-border bg-tpc-bg text-tpc-text-tertiary hover:text-tpc-text',
                )}
              >
                {ROLE_LABEL[r]}
              </button>
            ))}
          </div>
        </Field>

        <Field
          label="Confirmar"
          hint={`digite ${user.email}`}
        >
          <input
            type="text"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={user.email}
            className="w-full rounded-[10px] border border-tpc-border bg-tpc-bg px-3 py-2 font-mono text-[11px] text-tpc-text focus:border-tpc-border-strong focus:outline-none"
          />
        </Field>

        {error && (
          <div className="rounded-[10px] border border-tpc-red/40 bg-tpc-red/10 px-3 py-2 text-[12px] text-tpc-red">
            {error}
          </div>
        )}

        <div className="mt-1 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-[10px] border border-tpc-border bg-tpc-surface px-3.5 py-2 text-[12px] text-tpc-text-secondary transition hover:text-tpc-text disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!canConfirm || saving}
            className="rounded-[10px] bg-tpc-red px-3.5 py-2 text-[12px] font-semibold text-tpc-text shadow-md shadow-tpc-red/20 transition hover:bg-tpc-red-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Aplicando…' : 'Confirmar troca'}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

// ----------------------------------------------------------------------------
// Modal shell
// ----------------------------------------------------------------------------

const ModalShell = ({
  title,
  onClose,
  disabled,
  tone = 'default',
  children,
}: {
  title: string
  onClose: () => void
  disabled?: boolean
  tone?: 'default' | 'danger'
  children: React.ReactNode
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal
        className="relative flex w-full max-w-[440px] flex-col gap-4 rounded-2xl border border-tpc-border bg-tpc-bg p-5 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-center justify-between">
          <h2
            className={cn(
              'text-[16px] font-bold tracking-tight',
              tone === 'danger' ? 'text-tpc-red' : 'text-tpc-text',
            )}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={disabled}
            aria-label="Fechar"
            className="cursor-pointer rounded-md p-1 text-tpc-text-tertiary transition hover:bg-tpc-surface hover:text-tpc-text disabled:cursor-not-allowed"
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
              aria-hidden
            >
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const Field = ({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) => (
  <div>
    <div className="mb-1 flex items-baseline justify-between">
      <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-tpc-text-secondary">
        {label}
      </label>
      {hint && (
        <span className="font-mono text-[9px] tracking-wide text-tpc-text-tertiary">
          {hint}
        </span>
      )}
    </div>
    {children}
  </div>
)

// ----------------------------------------------------------------------------
// Formatters
// ----------------------------------------------------------------------------

const initials = (name: string): string => {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
  }
  return (parts[0]?.[0] ?? 'U').toUpperCase()
}

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

const formatCpfCnpj = (v: string | null): string => {
  if (!v) return '—'
  const d = v.replace(/\D/g, '')
  if (d.length === 11)
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  if (d.length === 14)
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  return v
}

const formatAddress = (a: NonNullable<AdminUserDetail['address']>): string => {
  const line1 = [a.street, a.number].filter(Boolean).join(', ')
  const line2 = [a.neighborhood, `${a.city}/${a.state}`].filter(Boolean).join(' · ')
  const cep = a.cep ? `CEP ${a.cep}` : ''
  return [line1, a.complement, line2, cep].filter(Boolean).join(' · ')
}

const txTypeLabel = (t: AdminUserDetail['recentTransactions'][number]['type']): string => {
  switch (t) {
    case 'CREDIT':
      return 'Crédito (compra)'
    case 'DEBIT':
      return 'Débito (serviço)'
    case 'RESERVE':
      return 'Reserva'
    case 'UNRESERVE':
      return 'Liberação de reserva'
  }
}

const txSign = (t: AdminUserDetail['recentTransactions'][number]['type']): string =>
  t === 'CREDIT' || t === 'UNRESERVE' ? '+' : t === 'DEBIT' ? '−' : ''

const txAmountClass = (
  t: AdminUserDetail['recentTransactions'][number]['type'],
): string => {
  if (t === 'CREDIT') return 'text-tpc-green'
  if (t === 'DEBIT') return 'text-tpc-text-secondary'
  if (t === 'RESERVE') return 'text-tpc-yellow'
  return 'text-tpc-text-secondary'
}
