'use client'

import { useEffect, useMemo, useState } from 'react'

import { cn } from '@tpc/ui'

import { useApi } from '@/lib/api/client'

interface AddCardModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

type Brand = 'visa' | 'mastercard' | 'amex' | 'elo' | 'hipercard' | 'diners' | 'other'

const detectBrand = (digits: string): Brand => {
  const d = digits.replace(/\D/g, '')
  if (!d) return 'other'
  if (/^4/.test(d)) return 'visa'
  if (/^3[47]/.test(d)) return 'amex'
  if (/^(5[1-5]|2[2-7])/.test(d)) return 'mastercard'
  if (/^(4011|4312|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|6504|6505|6516|6550)/.test(d))
    return 'elo'
  if (/^(606282|6062)/.test(d)) return 'hipercard'
  if (/^(30[0-5]|36|38)/.test(d)) return 'diners'
  return 'other'
}

const brandMaxLen = (brand: Brand): number => (brand === 'amex' ? 15 : brand === 'diners' ? 14 : 16)
const brandCvvLen = (brand: Brand): number => (brand === 'amex' ? 4 : 3)

// Algoritmo Luhn padrão (checksum de cartão). Não garante que o cartão
// existe, só que os dígitos passam no checksum.
const luhnValid = (digits: string): boolean => {
  const d = digits.replace(/\D/g, '')
  if (d.length < 12) return false
  let sum = 0
  let even = false
  for (let i = d.length - 1; i >= 0; i--) {
    let n = parseInt(d[i] as string, 10)
    if (even) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    even = !even
  }
  return sum % 10 === 0
}

const formatCardNumber = (raw: string, brand: Brand): string => {
  const d = raw.replace(/\D/g, '').slice(0, brandMaxLen(brand))
  if (brand === 'amex') {
    // 4-6-5
    return d.replace(/^(\d{4})(\d{0,6})(\d{0,5}).*/, (_, a, b, c) =>
      [a, b, c].filter(Boolean).join(' '),
    )
  }
  // 4-4-4-4
  return d.replace(/(\d{4})(?=\d)/g, '$1 ')
}

const formatExpiry = (raw: string): string => {
  const d = raw.replace(/\D/g, '').slice(0, 4)
  if (d.length < 3) return d
  return `${d.slice(0, 2)}/${d.slice(2)}`
}

interface FormState {
  number: string
  name: string
  expiry: string
  cvv: string
  setAsDefault: boolean
}

const initial: FormState = {
  number: '',
  name: '',
  expiry: '',
  cvv: '',
  setAsDefault: false,
}

export const AddCardModal = ({ open, onClose, onCreated }: AddCardModalProps) => {
  const api = useApi()
  const [form, setForm] = useState<FormState>(initial)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const numberDigits = form.number.replace(/\D/g, '')
  const brand = useMemo<Brand>(() => detectBrand(numberDigits), [numberDigits])
  const numberValid = luhnValid(numberDigits)
  const [expMM, expYY] = form.expiry.split('/')
  const expMonth = expMM ? parseInt(expMM, 10) : 0
  const expYear = expYY ? 2000 + parseInt(expYY, 10) : 0
  const now = new Date()
  const expFutureValid =
    expMonth >= 1 &&
    expMonth <= 12 &&
    expYY?.length === 2 &&
    new Date(expYear, expMonth, 1) > now
  const cvvValid = form.cvv.length === brandCvvLen(brand)
  const nameValid = form.name.trim().length >= 3
  const formValid = numberValid && expFutureValid && cvvValid && nameValid

  useEffect(() => {
    if (!open) return
    setForm(initial)
    setError(null)
    setSubmitting(false)
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
  }, [open, onClose])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formValid || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await api.post('/me/saved-cards', {
        // Em prod: gerar token via MP JS SDK aqui e enviar como cardToken.
        // Por enquanto omitimos — backend gera mock token em mock mode.
        brand: brand === 'other' ? 'unknown' : brand,
        lastFour: numberDigits.slice(-4),
        holderName: form.name.trim(),
        expMonth,
        expYear,
        setAsDefault: form.setAsDefault,
      })
      onCreated()
      onClose()
    } catch (err) {
      const message =
        err instanceof Error && err.message ? err.message : 'Falha ao salvar cartão'
      setError(message)
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

      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-label="Adicionar cartão"
        className="relative z-10 flex w-full max-w-[460px] flex-col gap-4 rounded-2xl border border-tpc-border bg-tpc-bg p-6 shadow-[0_30px_80px_rgba(0,0,0,0.7)]"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-tpc-text">
              Adicionar cartão
            </h2>
            <p className="mt-1 text-xs text-tpc-text-tertiary">
              Salva pra usar em compras futuras. Os dados ficam tokenizados,
              sem ficar no nosso servidor.
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

        <Field label="Número do cartão">
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="cc-number"
              value={form.number}
              onChange={(e) =>
                setForm((f) => ({ ...f, number: formatCardNumber(e.target.value, detectBrand(e.target.value)) }))
              }
              placeholder="0000 0000 0000 0000"
              className={cn(
                'w-full rounded-lg border bg-tpc-surface px-3 py-2.5 pr-14 font-mono text-[14px] tracking-wider text-tpc-text placeholder:text-tpc-text-tertiary focus:outline-none',
                form.number.length > 0 && !numberValid
                  ? 'border-tpc-red/50 focus:border-tpc-red'
                  : 'border-tpc-border focus:border-tpc-border-strong',
              )}
            />
            <BrandBadge brand={brand} />
          </div>
        </Field>

        <Field label="Nome no cartão">
          <input
            type="text"
            autoComplete="cc-name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value.toUpperCase() }))}
            placeholder="COMO IMPRESSO NO CARTÃO"
            className="w-full rounded-lg border border-tpc-border bg-tpc-surface px-3 py-2.5 text-[14px] uppercase tracking-wider text-tpc-text placeholder:text-tpc-text-tertiary focus:border-tpc-border-strong focus:outline-none"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Validade">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="cc-exp"
              value={form.expiry}
              onChange={(e) => setForm((f) => ({ ...f, expiry: formatExpiry(e.target.value) }))}
              placeholder="MM/AA"
              maxLength={5}
              className={cn(
                'w-full rounded-lg border bg-tpc-surface px-3 py-2.5 font-mono text-[14px] text-tpc-text placeholder:text-tpc-text-tertiary focus:outline-none',
                form.expiry.length === 5 && !expFutureValid
                  ? 'border-tpc-red/50 focus:border-tpc-red'
                  : 'border-tpc-border focus:border-tpc-border-strong',
              )}
            />
          </Field>
          <Field label="CVV">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="cc-csc"
              value={form.cvv}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  cvv: e.target.value.replace(/\D/g, '').slice(0, brandCvvLen(brand)),
                }))
              }
              placeholder={brand === 'amex' ? '0000' : '000'}
              maxLength={brandCvvLen(brand)}
              className="w-full rounded-lg border border-tpc-border bg-tpc-surface px-3 py-2.5 font-mono text-[14px] text-tpc-text placeholder:text-tpc-text-tertiary focus:border-tpc-border-strong focus:outline-none"
            />
          </Field>
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 text-[12px] text-tpc-text-secondary">
          <input
            type="checkbox"
            checked={form.setAsDefault}
            onChange={(e) => setForm((f) => ({ ...f, setAsDefault: e.target.checked }))}
            className="h-4 w-4 cursor-pointer accent-tpc-red"
          />
          Definir como padrão pra próximas compras
        </label>

        {error && (
          <div className="rounded-lg border border-tpc-red/40 bg-tpc-red/10 px-3 py-2 text-[12px] text-tpc-red">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-tpc-border bg-tpc-surface px-4 py-2 text-[13px] font-medium text-tpc-text-secondary transition hover:bg-tpc-elevated"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!formValid || submitting}
            className={cn(
              'rounded-lg px-4 py-2 text-[13px] font-semibold text-tpc-text transition',
              !formValid || submitting
                ? 'cursor-not-allowed bg-tpc-elevated text-tpc-text-tertiary'
                : 'cursor-pointer bg-tpc-red hover:bg-tpc-red-dark',
            )}
          >
            {submitting ? 'Salvando…' : 'Salvar cartão'}
          </button>
        </div>
      </form>
    </div>
  )
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="flex flex-col gap-1.5">
    <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-tpc-text-tertiary">
      {label}
    </span>
    {children}
  </label>
)

const BrandBadge = ({ brand }: { brand: Brand }) => {
  if (brand === 'other')
    return (
      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[9px] uppercase tracking-wider text-tpc-text-tertiary">
        cartão
      </span>
    )
  if (brand === 'visa')
    return (
      <span className="absolute right-2 top-1/2 flex h-6 w-10 -translate-y-1/2 items-center justify-center rounded bg-[#1a1f3a] italic text-[11px] font-bold text-white">
        VISA
      </span>
    )
  if (brand === 'mastercard')
    return (
      <span className="absolute right-2 top-1/2 flex h-6 w-10 -translate-y-1/2 items-center justify-center rounded bg-tpc-elevated-2">
        <span className="absolute left-[9px] h-[12px] w-[12px] rounded-full bg-[#eb001b]" />
        <span className="absolute right-[9px] h-[12px] w-[12px] rounded-full bg-[#f79e1b] mix-blend-multiply" />
      </span>
    )
  return (
    <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-tpc-elevated px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-tpc-text-secondary">
      {brand}
    </span>
  )
}
