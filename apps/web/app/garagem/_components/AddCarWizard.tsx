'use client'

import { useState, useTransition } from 'react'

import { useApi } from '@/lib/api/client'
import { normalizePlate } from '@tpc/lib/formatters'
import type { CreateCarBody, MotorType } from '@tpc/lib/validators'
import { Button, Card, cn } from '@tpc/ui'

const BRANDS: Array<{
  name: string
  slug: string
  logo: string
  mono?: boolean
}> = [
  { name: 'Volkswagen', slug: 'volkswagen', logo: '/logos/volkswagen.png' },
  { name: 'Audi', slug: 'audi', logo: '/logos/audi.png', mono: true },
  { name: 'BMW', slug: 'bmw', logo: '/logos/bmw.png' },
  { name: 'Porsche', slug: 'porsche', logo: '/logos/porsche.png', mono: true },
  { name: 'Toyota', slug: 'toyota', logo: '/logos/toyota.png' },
  { name: 'Mercedes', slug: 'mercedes', logo: '/logos/mercedes.png' },
  { name: 'Ford', slug: 'ford', logo: '/logos/ford.png' },
  { name: 'Chevrolet', slug: 'chevrolet', logo: '/logos/chevrolet.png', mono: true },
  { name: 'Renault', slug: 'renault', logo: '/logos/renault.png', mono: true },
  { name: 'Fiat', slug: 'fiat', logo: '/logos/fiat.png', mono: true },
  { name: 'Honda', slug: 'honda', logo: '/logos/honda.png' },
  { name: 'Hyundai', slug: 'hyundai', logo: '/logos/hyundai.svg', mono: true },
]

const isKnownBrand = (name: string | undefined) =>
  Boolean(name && BRANDS.some((b) => b.name === name))

const MOTOR_OPTIONS: Array<{ value: MotorType; label: string; sub: string }> = [
  { value: 'gasoline', label: 'Gasolina', sub: 'Aspirado/turbo a gasolina' },
  { value: 'turbo', label: 'Turbo', sub: 'Gasolina turbo (TSI/TFSI/MPI)' },
  { value: 'diesel', label: 'Diesel', sub: 'Picapes, SUVs turbo-diesel' },
  { value: 'flex', label: 'Flex', sub: 'Etanol + gasolina' },
  { value: 'atmo', label: 'Aspirado', sub: 'Atmosférico, sem turbo' },
  { value: 'hybrid', label: 'Híbrido', sub: 'Combustão + elétrico' },
]

const TOTAL_STEPS = 5
const currentYear = new Date().getFullYear()

type Draft = Partial<CreateCarBody>

interface AddCarWizardProps {
  onClose: () => void
  onSuccess: (carId: string) => void
}

export const AddCarWizard = ({ onClose, onSuccess }: AddCarWizardProps) => {
  const api = useApi()
  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState<Draft>({})
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const canAdvance = (() => {
    switch (step) {
      case 1:
        return Boolean(draft.brand && draft.brand.length >= 2)
      case 2:
        return Boolean(draft.model && draft.model.length >= 2)
      case 3:
        return Boolean(draft.year && draft.year >= 1980 && draft.year <= currentYear + 1)
      case 4:
        return Boolean(draft.motorType)
      case 5:
        return Boolean(draft.plate && /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(draft.plate))
      default:
        return false
    }
  })()

  const submit = () => {
    if (!draft.brand || !draft.model || !draft.year || !draft.motorType || !draft.plate) return
    setError(null)
    startTransition(async () => {
      try {
        const res = await api.post<{ car: { id: string } }>('/me/cars', {
          brand: draft.brand,
          model: draft.model,
          year: draft.year,
          motorType: draft.motorType,
          plate: draft.plate,
          ...(draft.color ? { color: draft.color } : {}),
        })
        onSuccess(res.car.id)
      } catch (err) {
        const m = err instanceof Error ? err.message : 'Falha ao adicionar carro.'
        setError(m)
      }
    })
  }

  const next = () => {
    if (!canAdvance) return
    if (step === TOTAL_STEPS) {
      submit()
      return
    }
    setStep((s) => s + 1)
    setError(null)
  }

  const back = () => {
    if (step === 1) {
      onClose()
      return
    }
    setStep((s) => s - 1)
    setError(null)
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-tpc-border px-5 py-4">
        <button
          type="button"
          onClick={back}
          aria-label={step === 1 ? 'Fechar' : 'Voltar'}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-tpc-text transition hover:bg-tpc-elevated"
        >
          {step === 1 ? (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          )}
        </button>
        <div className="flex flex-1 gap-1">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-[3px] flex-1 rounded-sm',
                i + 1 < step
                  ? 'bg-tpc-red/70'
                  : i + 1 === step
                    ? 'bg-tpc-red shadow-[0_0_6px_rgba(225,38,28,0.5)]'
                    : 'bg-tpc-elevated-2',
              )}
            />
          ))}
        </div>
        <div className="min-w-[32px] text-right font-mono text-[10px] tracking-[0.1em] text-tpc-text-tertiary">
          {step}/{TOTAL_STEPS}
        </div>
      </header>

      <main className="tpc-scroll flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-12 pt-5 [mask-image:linear-gradient(to_bottom,black_calc(100%-48px),transparent)]">
        {step === 1 && <BrandStep draft={draft} setDraft={setDraft} />}
        {step === 2 && <ModelStep draft={draft} setDraft={setDraft} />}
        {step === 3 && <YearStep draft={draft} setDraft={setDraft} />}
        {step === 4 && <MotorStep draft={draft} setDraft={setDraft} />}
        {step === 5 && <PlateStep draft={draft} setDraft={setDraft} />}

        {error && (
          <div className="rounded-lg border border-tpc-red/40 bg-tpc-red/10 px-3 py-2 text-sm text-tpc-red">
            {error}
          </div>
        )}
      </main>

      <footer className="border-t border-tpc-border px-5 py-4">
        <Button fullWidth onClick={next} disabled={!canAdvance || isPending}>
          {step === TOTAL_STEPS
            ? isPending
              ? 'Adicionando…'
              : 'Adicionar carro'
            : 'Continuar'}
        </Button>
      </footer>
    </div>
  )
}

interface StepProps {
  draft: Draft
  setDraft: React.Dispatch<React.SetStateAction<Draft>>
}

function BrandLogo({
  src,
  alt,
  mono,
}: {
  src: string
  alt: string
  mono?: boolean
}) {
  const [errored, setErrored] = useState(false)
  if (errored) {
    return (
      <span
        aria-hidden
        className="flex h-7 w-7 items-center justify-center rounded-full border border-tpc-border-strong font-mono text-[10px] font-bold uppercase tracking-wider text-tpc-text-tertiary"
      >
        {alt[0]}
      </span>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setErrored(true)}
      className={cn(
        'h-8 w-auto max-w-[52px] object-contain',
        mono && 'brightness-0 invert',
      )}
    />
  )
}

function BrandStep({ draft, setDraft }: StepProps) {
  const [other, setOther] = useState(
    draft.brand && !isKnownBrand(draft.brand) ? draft.brand : '',
  )
  const showOther = Boolean(other) || (!!draft.brand && !isKnownBrand(draft.brand))

  return (
    <>
      <div className="tpc-eyebrow">Marca</div>
      <h1 className="text-[26px] font-bold leading-tight tracking-tight md:text-[28px]">
        Qual a marca do teu carro?
      </h1>
      <p className="text-sm text-tpc-text-secondary">
        Escolhe uma das marcas mais comuns ou digita a tua.
      </p>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {BRANDS.map((b) => {
          const selected = draft.brand === b.name
          return (
            <button
              key={b.slug}
              type="button"
              onClick={() => {
                setDraft((d) => ({ ...d, brand: b.name }))
                setOther('')
              }}
              className={cn(
                'flex h-[96px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border p-2 text-center transition md:h-[104px]',
                selected
                  ? 'border-tpc-red/60 bg-tpc-red/10 text-tpc-text'
                  : 'border-tpc-border bg-tpc-surface text-tpc-text-secondary hover:border-tpc-red/60 hover:bg-tpc-red/[0.04] hover:text-tpc-text',
              )}
            >
              <BrandLogo src={b.logo} alt={b.name} mono={b.mono} />
              <span className="text-[12px] font-semibold tracking-tight">{b.name}</span>
            </button>
          )
        })}
      </div>

      <details open={showOther} className="rounded-xl border border-dashed border-tpc-border p-3">
        <summary className="cursor-pointer text-sm font-medium text-tpc-text-secondary">
          Outra marca
        </summary>
        <input
          type="text"
          value={other}
          onChange={(e) => {
            const v = e.target.value
            setOther(v)
            setDraft((d) => ({ ...d, brand: v.trim() }))
          }}
          placeholder="Digite a marca"
          className="mt-3 w-full rounded-lg border border-tpc-border bg-tpc-elevated-2 px-3 py-2 text-sm text-tpc-text outline-none placeholder:text-tpc-text-tertiary focus:border-tpc-red"
        />
      </details>
    </>
  )
}

function ModelStep({ draft, setDraft }: StepProps) {
  return (
    <>
      <div className="tpc-eyebrow">Modelo</div>
      <h1 className="text-[26px] font-bold leading-tight tracking-tight md:text-[28px]">
        Qual o modelo?
      </h1>
      <p className="text-sm text-tpc-text-secondary">
        Ex: M340i, Golf GTI, Civic Si, A4 Avant.
      </p>

      <input
        type="text"
        value={draft.model ?? ''}
        onChange={(e) => setDraft((d) => ({ ...d, model: e.target.value }))}
        placeholder="Modelo"
        autoFocus
        className="rounded-xl border border-tpc-border bg-tpc-surface px-4 py-3 text-base text-tpc-text outline-none placeholder:text-tpc-text-tertiary focus:border-tpc-red focus:ring-2 focus:ring-tpc-red/30"
      />
    </>
  )
}

function YearStep({ draft, setDraft }: StepProps) {
  return (
    <>
      <div className="tpc-eyebrow">Ano</div>
      <h1 className="text-[26px] font-bold leading-tight tracking-tight md:text-[28px]">
        Qual o ano?
      </h1>
      <p className="text-sm text-tpc-text-secondary">
        Ano modelo, entre 1980 e {currentYear + 1}.
      </p>

      <input
        type="number"
        inputMode="numeric"
        min={1980}
        max={currentYear + 1}
        value={draft.year ?? ''}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10)
          setDraft((d) => ({ ...d, year: Number.isFinite(n) ? n : undefined }))
        }}
        placeholder={String(currentYear)}
        autoFocus
        className="tpc-num rounded-xl border border-tpc-border bg-tpc-surface px-4 py-3 text-2xl outline-none focus:border-tpc-red focus:ring-2 focus:ring-tpc-red/30"
      />
    </>
  )
}

function MotorStep({ draft, setDraft }: StepProps) {
  return (
    <>
      <div className="tpc-eyebrow">Motor</div>
      <h1 className="text-[26px] font-bold leading-tight tracking-tight md:text-[28px]">
        Qual o motor?
      </h1>
      <p className="text-sm text-tpc-text-secondary">
        Define os serviços compatíveis no catálogo.
      </p>

      <div className="flex flex-col gap-2.5">
        {MOTOR_OPTIONS.map((m) => {
          const selected = draft.motorType === m.value
          return (
            <Card
              key={m.value}
              onClick={() => setDraft((d) => ({ ...d, motorType: m.value }))}
              className={cn(
                'flex cursor-pointer items-center gap-3.5 transition hover:border-tpc-red/40',
                selected ? 'border-tpc-red/55 bg-tpc-red/[0.06]' : '',
              )}
            >
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
                  selected
                    ? 'border-tpc-red bg-tpc-red text-tpc-text'
                    : 'border-tpc-border bg-tpc-elevated-2 text-tpc-text-secondary',
                )}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="6" y="8" width="12" height="10" rx="1" />
                  <path d="M4 12h2M18 12h2M9 6V8M15 6V8M9 18v2M15 18v2" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-base font-semibold tracking-tight">{m.label}</div>
                <div className="mt-0.5 font-mono text-[11px] tracking-wider text-tpc-text-secondary">
                  {m.sub}
                </div>
              </div>
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full border-[1.5px]',
                  selected ? 'border-tpc-red bg-tpc-red' : 'border-tpc-text-tertiary',
                )}
              >
                {selected && (
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                )}
              </span>
            </Card>
          )
        })}
      </div>
    </>
  )
}

function PlateStep({ draft, setDraft }: StepProps) {
  const formatted = formatPlate(draft.plate ?? '')
  const showPreview = formatted.length >= 7
  return (
    <>
      <div className="tpc-eyebrow">Placa</div>
      <h1 className="text-[26px] font-bold leading-tight tracking-tight md:text-[28px]">
        Falta só a placa
      </h1>
      <p className="text-sm text-tpc-text-secondary">
        Formato Mercosul (ABC1D23) ou antigo (ABC1234).
      </p>

      {showPreview && (
        <div className="rounded-2xl border border-tpc-border-strong bg-tpc-elevated p-3.5">
          <div className="mb-2 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-tpc-text-tertiary">
            Brasil · Mercosul
          </div>
          <div className="rounded-lg bg-white py-4 text-center">
            <span className="font-mono text-[28px] font-bold tracking-[0.16em] text-black">
              {formatted.slice(0, 3)}
              <span className="opacity-30">·</span>
              {formatted.slice(3)}
            </span>
          </div>
        </div>
      )}

      <input
        type="text"
        value={formatted}
        onChange={(e) => {
          const cleaned = normalizePlate(e.target.value).slice(0, 7)
          setDraft((d) => ({ ...d, plate: cleaned }))
        }}
        placeholder="ABC1D23"
        autoFocus
        autoComplete="off"
        autoCapitalize="characters"
        className="tpc-num rounded-xl border border-tpc-border bg-tpc-surface px-4 py-3 text-center text-2xl tracking-[0.2em] outline-none focus:border-tpc-red focus:ring-2 focus:ring-tpc-red/30"
      />
    </>
  )
}

const formatPlate = (raw: string): string =>
  raw.replace(/[^A-Z0-9]/g, '').toUpperCase().slice(0, 7)
