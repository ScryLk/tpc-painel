'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { useApi } from '@/lib/api/client'
import {
  onboardingCtas,
  onboardingSlides,
  onboardingWelcomeTitle,
} from '@/lib/copy/onboarding'
import { Button, cn } from '@tpc/ui'

interface WelcomeModalProps {
  firstName: string
  onAddCar: () => void
}

const TOTAL = onboardingSlides.length

export const WelcomeModal = ({ firstName, onAddCar }: WelcomeModalProps) => {
  const api = useApi()
  const [open, setOpen] = useState(true)
  const [step, setStep] = useState(0)
  const dismissed = useRef(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const dismiss = useCallback(async () => {
    if (dismissed.current) return
    dismissed.current = true
    setOpen(false)
    try {
      await api.post('/me/onboarding/dismiss')
    } catch {
      /* best effort, banner ainda guia o usuário */
    }
  }, [api])

  const advance = () => {
    if (step < TOTAL - 1) setStep(step + 1)
  }
  const back = () => {
    if (step > 0) setStep(step - 1)
  }

  const startWizard = () => {
    dismissed.current = true
    setOpen(false)
    api.post('/me/onboarding/dismiss').catch(() => {
      /* idem */
    })
    onAddCar()
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, dismiss])

  if (!open) return null

  const slide = onboardingSlides[step]!
  const isFirst = step === 0
  const isLast = step === TOTAL - 1

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm md:items-center md:p-4"
      onClick={dismiss}
    >
      <div
        className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-tpc-border bg-tpc-bg shadow-[0_20px_60px_rgba(0,0,0,0.6)] md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={dismiss}
          aria-label="Fechar"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-tpc-border bg-tpc-elevated text-tpc-text-secondary transition hover:bg-tpc-elevated-2 hover:text-tpc-text"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="px-6 pt-8 pb-2 md:px-8">
          <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.18em] text-tpc-text-tertiary">
            Bem-vindo
          </div>
          <h2
            id="welcome-modal-title"
            className="text-[22px] font-bold tracking-[-0.03em] text-tpc-text md:text-[26px]"
          >
            {isFirst ? onboardingWelcomeTitle(firstName) : slide.title}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-2 md:px-8">
          {slide.body && (
            <p className="mt-2 text-[14px] leading-relaxed text-tpc-text-secondary">
              {slide.body}
            </p>
          )}

          {slide.bullets && (
            <div className="mt-4 flex flex-col gap-2.5">
              {slide.bullets.map((b) => (
                <div
                  key={b.label}
                  className="rounded-xl border border-tpc-border bg-tpc-elevated p-3.5"
                >
                  <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-tpc-red">
                    {b.label}
                  </div>
                  <p className="text-[13px] leading-relaxed text-tpc-text">{b.text}</p>
                </div>
              ))}
            </div>
          )}

          {slide.note && (
            <p className="mt-4 text-[12px] italic text-tpc-text-tertiary">{slide.note}</p>
          )}
        </div>

        <div className="flex items-center justify-center gap-1.5 px-6 py-3">
          {onboardingSlides.map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === step
                  ? 'w-6 bg-tpc-red'
                  : i < step
                    ? 'w-1.5 bg-tpc-red/50'
                    : 'w-1.5 bg-tpc-border',
              )}
              aria-hidden
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-tpc-border bg-tpc-surface px-6 py-4 md:px-8">
          {isLast ? (
            <>
              <button
                type="button"
                onClick={dismiss}
                className="text-[13px] font-medium text-tpc-text-secondary transition hover:text-tpc-text"
              >
                {onboardingCtas.explore}
              </button>
              <Button onClick={startWizard}>{onboardingCtas.addCar}</Button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={back}
                disabled={isFirst}
                className={cn(
                  'text-[13px] font-medium transition',
                  isFirst
                    ? 'cursor-not-allowed text-tpc-text-tertiary opacity-40'
                    : 'text-tpc-text-secondary hover:text-tpc-text',
                )}
              >
                {onboardingCtas.back}
              </button>
              <Button onClick={advance}>{onboardingCtas.next}</Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
