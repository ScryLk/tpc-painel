'use client'

import { useEffect, type ReactNode } from 'react'

import { cn } from '@tpc/ui'

// Shell reutilizável pros modais de edição/criação no admin (serviços,
// pacotes, etc). Cuida do overlay, Esc-to-close, focus trap simples, e do
// header padronizado. O conteúdo (forms, footer) vem como children.
export const AdminModalShell = ({
  title,
  onClose,
  disabled,
  children,
}: {
  title: string
  onClose: () => void
  disabled?: boolean
  children: ReactNode
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !disabled) onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose, disabled])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal
        className="relative flex max-h-[calc(100vh-4rem)] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border border-tpc-border bg-tpc-bg shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-tpc-border px-5 py-4">
          <h2 className="text-[16px] font-bold tracking-tight text-tpc-text">
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

export const Field = ({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
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

const baseInput =
  'w-full rounded-[10px] border border-tpc-border bg-tpc-bg px-3 py-2 text-[13px] text-tpc-text focus:border-tpc-border-strong focus:outline-none disabled:opacity-60'

export const TextInput = ({
  value,
  onChange,
  placeholder,
  maxLength,
  disabled,
  mono,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  maxLength?: number
  disabled?: boolean
  mono?: boolean
}) => (
  <input
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    maxLength={maxLength}
    disabled={disabled}
    className={cn(baseInput, mono && 'font-mono text-[12px]')}
  />
)

export const Textarea = ({
  value,
  onChange,
  placeholder,
  maxLength,
  disabled,
  rows = 3,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  maxLength?: number
  disabled?: boolean
  rows?: number
}) => (
  <textarea
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    maxLength={maxLength}
    disabled={disabled}
    rows={rows}
    className={cn(baseInput, 'resize-y leading-relaxed')}
  />
)

export const NumberInput = ({
  value,
  onChange,
  min,
  max,
  disabled,
}: {
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
  disabled?: boolean
}) => (
  <input
    type="number"
    value={Number.isFinite(value) ? value : 0}
    onChange={(e) => {
      const n = parseInt(e.target.value, 10)
      onChange(Number.isFinite(n) ? n : 0)
    }}
    min={min}
    max={max}
    disabled={disabled}
    className={cn(baseInput, 'tpc-num')}
  />
)

export const Checkbox = ({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  disabled?: boolean
}) => (
  <label
    className={cn(
      'flex cursor-pointer items-center gap-2 rounded-[10px] border border-tpc-border bg-tpc-bg px-3 py-2 text-[12px] text-tpc-text-secondary transition hover:border-tpc-border-strong',
      disabled && 'cursor-not-allowed opacity-60',
    )}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
      className="h-3.5 w-3.5 cursor-pointer accent-tpc-red"
    />
    {label}
  </label>
)

// Editor de string[]: usa textarea com 1 item por linha. Simples e
// suficiente pro MVP — depois pode virar tag input se precisar.
export const StringListInput = ({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string[]
  onChange: (v: string[]) => void
  placeholder?: string
  disabled?: boolean
}) => (
  <textarea
    value={value.join('\n')}
    onChange={(e) =>
      onChange(
        e.target.value
          .split('\n')
          .map((s) => s.trim())
          .filter((s) => s.length > 0),
      )
    }
    placeholder={placeholder ?? 'Um item por linha'}
    disabled={disabled}
    rows={3}
    className={cn(baseInput, 'resize-y font-mono text-[12px] leading-relaxed')}
  />
)

export const ModalFooter = ({
  onCancel,
  onSubmit,
  submitLabel,
  disabled,
  submitting,
  error,
  secondaryAction,
}: {
  onCancel: () => void
  onSubmit: () => void
  submitLabel: string
  disabled?: boolean
  submitting: boolean
  error: string | null
  // Ação opcional renderizada no canto esquerdo do footer (ex: "Excluir").
  // Fica fora do flow de submit pra ficar visualmente separada.
  secondaryAction?: ReactNode
}) => (
  <div className="shrink-0 border-t border-tpc-border bg-tpc-surface/40 px-5 py-4">
    {error && (
      <div className="mb-3 rounded-[10px] border border-tpc-red/40 bg-tpc-red/10 px-3 py-2 text-[12px] text-tpc-red">
        {error}
      </div>
    )}
    <div className="flex items-center justify-between gap-2">
      <div>{secondaryAction}</div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-[10px] border border-tpc-border bg-tpc-surface px-3.5 py-2 text-[12px] text-tpc-text-secondary transition hover:text-tpc-text disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || disabled}
          className="rounded-[10px] bg-tpc-red px-3.5 py-2 text-[12px] font-semibold text-tpc-text shadow-md shadow-tpc-red/20 transition hover:bg-tpc-red-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Salvando…' : submitLabel}
        </button>
      </div>
    </div>
  </div>
)

export const ModalBody = ({ children }: { children: ReactNode }) => (
  <div className="tpc-scroll flex-1 overflow-y-auto p-5">
    <div className="flex flex-col gap-3.5">{children}</div>
  </div>
)
