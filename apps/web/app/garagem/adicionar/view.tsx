'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { useApi } from '@/lib/api/client'
import { type CreateCarBody, type MotorType, normalizePlate } from '@tpc/lib/validators'
import { Button, Card, ScreenChrome, cn } from '@tpc/ui'

const BRANDS = [
  'Volkswagen',
  'Audi',
  'BMW',
  'Porsche',
  'Toyota',
  'Mercedes',
  'Ford',
  'Chevrolet',
  'Renault',
  'Fiat',
  'Honda',
  'Hyundai',
]

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

export const AdicionarCarroView = () => {
  const router = useRouter()
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
        await api.post<{ car: { id: string } }>('/me/cars', {
          brand: draft.brand,
          model: draft.model,
          year: draft.year,
          motorType: draft.motorType,
          plate: draft.plate,
          ...(draft.color ? { color: draft.color } : {}),
        })
        router.push('/garagem')
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
      router.push('/garagem')
      return
    }
    setStep((s) => s - 1)
    setError(null)
  }

  return (
    <ScreenChrome>
      <div className="flex items-center gap-3 px-5 pt-3">
        <button
          type="button"
          onClick={back}
          aria-label="Voltar"
          className="flex h-8 w-8 items-center justify-center rounded-full text-tpc-text transition hover:bg-tpc-elevated"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
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
      </div>

      <main className="tpc-scroll flex flex-1 flex-col gap-5 overflow-y-auto px-6 pt-6">
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

      <div className="px-6 pb-6 pt-3">
        <Button fullWidth onClick={next} disabled={!canAdvance || isPending}>
          {step === TOTAL_STEPS
            ? isPending
              ? 'Adicionando…'
              : 'Adicionar carro'
            : 'Continuar'}
        </Button>
      </div>
    </ScreenChrome>
  )
}

interface StepProps {
  draft: Draft
  setDraft: React.Dispatch<React.SetStateAction<Draft>>
}

function BrandStep({ draft, setDraft }: StepProps) {
  const [other, setOther] = useState(
    draft.brand && !BRANDS.includes(draft.brand) ? draft.brand : '',
  )
  const showOther = Boolean(other) || (!!draft.brand && !BRANDS.includes(draft.brand))

  return (
    <>
      <div className="tpc-eyebrow">Marca</div>
      <h1 className="text-3xl font-bold leading-[0.95] tracking-tight">
        Qual a marca
        <br />
        do teu carro?
      </h1>
      <p className="text-sm text-tpc-text-secondary">
        Picka uma das mais comuns ou digita a tua.
      </p>

      <div className="grid grid-cols-3 gap-2.5">
        {BRANDS.map((b) => {
          const selected = draft.brand === b
          return (
            <button
              key={b}
              type="button"
              onClick={() => {
                setDraft((d) => ({ ...d, brand: b }))
                setOther('')
              }}
              className={cn(
                'flex aspect-square flex-col items-center justify-center rounded-2xl border p-2 text-center transition',
                selected
                  ? 'border-tpc-red/60 bg-tpc-red/10 text-tpc-text'
                  : 'border-tpc-border bg-tpc-surface text-tpc-text-secondary',
              )}
            >
              <span className="text-sm font-semibold tracking-tight">{b.slice(0, 3)}</span>
              <span className="mt-1 text-[10px] leading-tight text-tpc-text-tertiary">{b}</span>
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
      <h1 className="text-3xl font-bold leading-[0.95] tracking-tight">
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
      <h1 className="text-3xl font-bold leading-[0.95] tracking-tight">
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
      <h1 className="text-3xl font-bold leading-[0.95] tracking-tight">
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
                'flex cursor-pointer items-center gap-3.5 transition',
                selected ? 'border-tpc-red/55 bg-tpc-red/[0.06]' : '',
              )}
            >
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
                  selected ? 'border-tpc-red bg-tpc-red text-tpc-text' : 'border-tpc-border bg-tpc-elevated-2 text-tpc-text-secondary',
                )}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
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
      <h1 className="text-3xl font-bold leading-[0.95] tracking-tight">
        Falta só a placa
      </h1>
      <p className="text-sm text-tpc-text-secondary">
        Mercosul (ABC1D23) ou antiga (ABC1234), tanto faz.
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

const formatPlate = (raw: string): string => raw.replace(/[^A-Z0-9]/g, '').toUpperCase().slice(0, 7)
