'use client'

import { useUser } from '@clerk/nextjs'
import { useCallback, useEffect, useState } from 'react'

import { cn } from '@tpc/ui'

import { useApi } from '@/lib/api/client'

interface DeleteAccountModalProps {
  open: boolean
  onClose: () => void
}

interface PendingDeletion {
  id: string
  scheduledFor: string
  graceDays: number
  createdAt: string
}

const CONFIRM_TEXT = 'EXCLUIR'

export const DeleteAccountModal = ({ open, onClose }: DeleteAccountModalProps) => {
  const api = useApi()
  const { user: clerkUser, isLoaded } = useUser()
  // Se Clerk ainda carregando, assume password ON pra não permitir bypass
  // acidental do EXCLUIR enquanto o estado real não chega. Backend valida
  // de qualquer jeito.
  const usePassword = !isLoaded || Boolean(clerkUser?.passwordEnabled)

  const [pending, setPending] = useState<PendingDeletion | null | undefined>(undefined)
  const [reason, setReason] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ deletion: PendingDeletion | null }>(
        '/me/account/deletion',
      )
      setPending(res.deletion)
    } catch {
      setPending(null)
    }
  }, [api])

  useEffect(() => {
    if (!open) return
    setReason('')
    setConfirmText('')
    setPassword('')
    setError(null)
    setPending(undefined)
    void load()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose, load])

  if (!open) return null

  const schedule = async () => {
    if (submitting) return

    if (usePassword && !password) {
      setError('Digite tua senha pra confirmar')
      return
    }
    if (!usePassword && confirmText !== CONFIRM_TEXT) return

    setSubmitting(true)
    setError(null)

    try {
      // Backend valida senha contra Clerk (bate na API deles) quando user
      // tem senha; senão exige confirmText='EXCLUIR'. Mandamos os 2 campos
      // e deixamos o backend decidir.
      const res = await api.post<{
        deletion: { id: string; scheduledFor: string; graceDays: number }
      }>('/me/account/deletion', {
        reason: reason.trim() || undefined,
        ...(usePassword ? { password } : { confirmText }),
      })
      setPending({
        ...res.deletion,
        createdAt: new Date().toISOString(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao agendar exclusão')
    } finally {
      setSubmitting(false)
    }
  }

  const cancel = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await api.del('/me/account/deletion')
      setPending(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao cancelar exclusão')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[8vh] sm:items-center sm:pt-0">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-label="Excluir minha conta"
        className="relative z-10 flex w-full max-w-[520px] flex-col gap-4 rounded-2xl border border-tpc-red/40 bg-tpc-bg p-6 shadow-[0_30px_80px_rgba(0,0,0,0.7)]"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-tpc-red">
              Excluir minha conta
            </h2>
            <p className="mt-1 text-xs text-tpc-text-tertiary">
              Direito de esquecimento (LGPD). Ação reversível durante a carência
              de 30 dias.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-tpc-text-tertiary hover:bg-tpc-surface hover:text-tpc-text"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {pending === undefined ? (
          <div className="py-10 text-center text-[12px] text-tpc-text-tertiary">
            Carregando…
          </div>
        ) : pending ? (
          <PendingPanel
            pending={pending}
            onCancel={cancel}
            onClose={onClose}
            submitting={submitting}
            error={error}
          />
        ) : (
          <FormPanel
            reason={reason}
            setReason={setReason}
            confirmText={confirmText}
            setConfirmText={setConfirmText}
            password={password}
            setPassword={setPassword}
            usePassword={usePassword}
            submitting={submitting}
            error={error}
            onSubmit={schedule}
            onCancel={onClose}
          />
        )}
      </div>
    </div>
  )
}

const FormPanel = ({
  reason,
  setReason,
  confirmText,
  setConfirmText,
  password,
  setPassword,
  usePassword,
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  reason: string
  setReason: (v: string) => void
  confirmText: string
  setConfirmText: (v: string) => void
  password: string
  setPassword: (v: string) => void
  usePassword: boolean
  submitting: boolean
  error: string | null
  onSubmit: () => void
  onCancel: () => void
}) => {
  const canSubmit = usePassword
    ? password.length >= 1 && !submitting
    : confirmText === CONFIRM_TEXT && !submitting
  return (
    <>
      <div className="rounded-xl border border-tpc-red/40 bg-tpc-red/5 p-4">
        <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.15em] text-tpc-red">
          O que acontece
        </div>
        <ul className="flex flex-col gap-2 text-[12.5px] text-tpc-text-secondary">
          <li className="flex items-start gap-2">
            <BulletDot />
            Tua conta fica bloqueada pra novos pedidos imediatamente
          </li>
          <li className="flex items-start gap-2">
            <BulletDot />
            Durante 30 dias dá pra cancelar fazendo login no app
          </li>
          <li className="flex items-start gap-2">
            <BulletDot />
            Depois dos 30 dias: dados pessoais (nome, email, CPF, endereço,
            telefone) são anonimizados
          </li>
          <li className="flex items-start gap-2">
            <BulletDot />
            Saldo de pontos disponível é zerado (sem reembolso)
          </li>
          <li className="flex items-start gap-2">
            <BulletDot />
            Cartões salvos, arquivos .bin e mensagens são apagados
          </li>
        </ul>
      </div>

      <div className="rounded-xl border border-tpc-border bg-tpc-surface/40 p-4">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-tpc-text-tertiary">
          Por questões fiscais
        </div>
        <p className="text-[12px] leading-relaxed text-tpc-text-tertiary">
          Compras e transações ficam guardadas por 5 anos sem dados pessoais
          (Lei 8.846/94). Não dá pra apagar essa parte por exigência legal.
        </p>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-tpc-text-tertiary">
          Motivo (opcional)
        </span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value.slice(0, 500))}
          rows={3}
          placeholder="Conta pra TPC o motivo. Ajuda a melhorar o serviço."
          className="resize-none rounded-lg border border-tpc-border bg-tpc-surface px-3 py-2.5 text-[13px] text-tpc-text placeholder:text-tpc-text-tertiary focus:border-tpc-border-strong focus:outline-none"
        />
        <span className="text-right font-mono text-[10px] text-tpc-text-tertiary">
          {reason.length}/500
        </span>
      </label>

      {usePassword ? (
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-tpc-red">
            Senha pra confirmar
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
            className="rounded-lg border border-tpc-border bg-tpc-surface px-3 py-2.5 text-[14px] text-tpc-text placeholder:text-tpc-text-tertiary focus:border-tpc-border-strong focus:outline-none"
          />
          <span className="text-[11px] text-tpc-text-tertiary">
            Re-autenticação obrigatória pra ações destrutivas.
          </span>
        </label>
      ) : (
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-tpc-red">
            Digite <strong>EXCLUIR</strong> pra confirmar
          </span>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="EXCLUIR"
            className={cn(
              'rounded-lg border bg-tpc-surface px-3 py-2.5 font-mono text-[14px] uppercase tracking-wider text-tpc-text placeholder:text-tpc-text-tertiary focus:outline-none',
              confirmText && confirmText !== CONFIRM_TEXT
                ? 'border-tpc-red/50 focus:border-tpc-red'
                : 'border-tpc-border focus:border-tpc-border-strong',
            )}
          />
          <span className="text-[11px] text-tpc-text-tertiary">
            Tua conta usa login social (sem senha gerenciada por nós).
          </span>
        </label>
      )}

      {error && (
        <div className="rounded-lg border border-tpc-red/40 bg-tpc-red/10 px-3 py-2 text-[12px] text-tpc-red">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-lg border border-tpc-border bg-tpc-surface px-4 py-2 text-[13px] font-medium text-tpc-text-secondary transition hover:bg-tpc-elevated disabled:cursor-not-allowed"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className={cn(
            'rounded-lg px-4 py-2 text-[13px] font-semibold transition',
            canSubmit
              ? 'cursor-pointer bg-tpc-red text-tpc-text hover:bg-tpc-red-dark'
              : 'cursor-not-allowed bg-tpc-elevated text-tpc-text-tertiary',
          )}
        >
          {submitting ? 'Agendando…' : 'Excluir conta'}
        </button>
      </div>
    </>
  )
}

const PendingPanel = ({
  pending,
  onCancel,
  onClose,
  submitting,
  error,
}: {
  pending: PendingDeletion
  onCancel: () => void
  onClose: () => void
  submitting: boolean
  error: string | null
}) => {
  const scheduledDate = new Date(pending.scheduledFor)
  const formattedDate = scheduledDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  const daysLeft = Math.max(
    0,
    Math.ceil((scheduledDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  )

  return (
    <>
      <div className="rounded-xl border border-tpc-yellow/40 bg-tpc-yellow/5 p-5 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-tpc-yellow/40 bg-tpc-yellow/10 text-tpc-yellow">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
        <h3 className="text-[15px] font-semibold text-tpc-text">
          Exclusão agendada
        </h3>
        <p className="mt-1 text-[12.5px] text-tpc-text-secondary">
          Tua conta será excluída em <strong>{formattedDate}</strong>
        </p>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.15em] text-tpc-yellow">
          {daysLeft} {daysLeft === 1 ? 'dia restante' : 'dias restantes'}
        </p>
      </div>

      <div className="rounded-xl border border-tpc-border bg-tpc-surface/40 p-4 text-[12.5px] leading-relaxed text-tpc-text-secondary">
        Mudou de ideia? Cancela a qualquer momento dentro da carência. Depois
        de excluída, não dá mais pra reverter — só criar conta nova do zero.
      </div>

      {error && (
        <div className="rounded-lg border border-tpc-red/40 bg-tpc-red/10 px-3 py-2 text-[12px] text-tpc-red">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="rounded-lg border border-tpc-border bg-tpc-surface px-4 py-2 text-[13px] font-medium text-tpc-text-secondary transition hover:bg-tpc-elevated disabled:cursor-not-allowed"
        >
          Fechar
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-lg bg-tpc-green px-4 py-2 text-[13px] font-semibold text-tpc-text transition hover:bg-tpc-green/80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Cancelando…' : 'Cancelar exclusão'}
        </button>
      </div>
    </>
  )
}

const BulletDot = () => (
  <span className="mt-1.5 inline-block h-1 w-1 flex-shrink-0 rounded-full bg-tpc-red" />
)
