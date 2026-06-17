'use client'

import { useCallback, useEffect, useState } from 'react'

import { cn } from '@tpc/ui'

import { useApi } from '@/lib/api/client'

interface ConsentsModalProps {
  open: boolean
  onClose: () => void
}

interface Consents {
  marketingEmail: boolean
  marketingWhatsapp: boolean
  transactionalEmail: boolean
  transactionalWhatsapp: boolean
  transactionalPush: boolean
}

export const ConsentsModal = ({ open, onClose }: ConsentsModalProps) => {
  const api = useApi()
  const [consents, setConsents] = useState<Consents | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ consents: Consents }>('/me/consents')
      setConsents(res.consents)
    } catch {
      setError('Falha ao carregar consentimentos')
    }
  }, [api])

  useEffect(() => {
    if (!open) return
    setError(null)
    setSavedAt(null)
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

  const update = (patch: Partial<Consents>) => {
    if (!consents) return
    setConsents({ ...consents, ...patch })
  }

  const save = async () => {
    if (!consents) return
    setSaving(true)
    setError(null)
    try {
      const data = await api.put<{ consents: Consents }>('/me/consents', consents)
      setConsents(data.consents)
      setSavedAt(Date.now())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar')
    } finally {
      setSaving(false)
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
        aria-label="Gerenciar consentimentos"
        className="relative z-10 flex w-full max-w-[520px] flex-col gap-4 rounded-2xl border border-tpc-border bg-tpc-bg p-6 shadow-[0_30px_80px_rgba(0,0,0,0.7)]"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-tpc-text">
              Gerenciar consentimentos
            </h2>
            <p className="mt-1 text-xs text-tpc-text-tertiary">
              Controla canal a canal. Tu pode mudar a qualquer momento.
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

        {!consents ? (
          <div className="py-10 text-center text-[12px] text-tpc-text-tertiary">
            Carregando…
          </div>
        ) : (
          <>
            <Section
              title="Transacional"
              hint="Avisos sobre pedidos, pagamentos, mudanças importantes. Recomendado deixar ligado."
            >
              <ConsentRow
                label="Email"
                checked={consents.transactionalEmail}
                onChange={(v) => update({ transactionalEmail: v })}
              />
              <ConsentRow
                label="WhatsApp"
                checked={consents.transactionalWhatsapp}
                onChange={(v) => update({ transactionalWhatsapp: v })}
              />
              <ConsentRow
                label="Push (notificações do app)"
                checked={consents.transactionalPush}
                onChange={(v) => update({ transactionalPush: v })}
              />
            </Section>

            <Section
              title="Marketing"
              hint="Novidades, promoções, divulgação de serviços. Desligado por padrão."
            >
              <ConsentRow
                label="Email"
                checked={consents.marketingEmail}
                onChange={(v) => update({ marketingEmail: v })}
              />
              <ConsentRow
                label="WhatsApp"
                checked={consents.marketingWhatsapp}
                onChange={(v) => update({ marketingWhatsapp: v })}
              />
            </Section>

            {error && (
              <div className="rounded-lg border border-tpc-red/40 bg-tpc-red/10 px-3 py-2 text-[12px] text-tpc-red">
                {error}
              </div>
            )}
            {savedAt && (
              <div className="rounded-lg border border-tpc-green/40 bg-tpc-green/10 px-3 py-2 text-[12px] text-tpc-green">
                Preferências salvas
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-lg border border-tpc-border bg-tpc-surface px-4 py-2 text-[13px] font-medium text-tpc-text-secondary transition hover:bg-tpc-elevated disabled:cursor-not-allowed"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className={cn(
                  'rounded-lg px-4 py-2 text-[13px] font-semibold text-tpc-text transition',
                  saving
                    ? 'cursor-not-allowed bg-tpc-elevated text-tpc-text-tertiary'
                    : 'cursor-pointer bg-tpc-red hover:bg-tpc-red-dark',
                )}
              >
                {saving ? 'Salvando…' : 'Salvar preferências'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const Section = ({
  title,
  hint,
  children,
}: {
  title: string
  hint: string
  children: React.ReactNode
}) => (
  <div className="rounded-xl border border-tpc-border bg-tpc-surface/40 p-4">
    <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-tpc-text-tertiary">
      {title}
    </div>
    <div className="mb-3 mt-1 text-[11.5px] text-tpc-text-tertiary">{hint}</div>
    <div className="flex flex-col gap-2.5">{children}</div>
  </div>
)

const ConsentRow = ({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) => (
  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-tpc-border bg-tpc-bg px-3 py-2">
    <span className="text-[13px] text-tpc-text">{label}</span>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="h-4 w-4 cursor-pointer accent-tpc-red"
    />
  </label>
)
