'use client'

import { useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'

import { Button, ScreenChrome, cn } from '@tpc/ui'

const ONBOARDING_FLAG = 'tpc-onboarding-done'

interface Step {
  key: string
  eyebrow: string
  title: ReactNode
  body: ReactNode
  cta: string
}

const STEPS: Step[] = [
  {
    key: 'welcome',
    eyebrow: 'Bem-vindo',
    title: (
      <>
        Bora carregar pontos
        <br />
        antes do próximo arrancada?
      </>
    ),
    body: (
      <>
        TPC Painel é a carteira oficial da{' '}
        <span className="text-tpc-text">TPC Performance</span>: cliente compra
        pacotes de pontos com bônus por volume e resgata em serviços de remap,
        presenciais em Panambi ou por arquivo.
      </>
    ),
    cta: 'Continuar',
  },
  {
    key: 'pontos',
    eyebrow: 'Como funcionam os pontos',
    title: (
      <>
        Pontos não expiram.
        <br />
        Bônus por volume.
      </>
    ),
    body: (
      <>
        Quanto maior o pacote, mais ponto bônus você ganha. Pacote{' '}
        <span className="text-tpc-text">Stage 1</span> rende +10% bônus, o{' '}
        <span className="text-tpc-text">Pro</span> +15%, o{' '}
        <span className="text-tpc-text">VIP</span> +25%. Pagamento via Pix
        instantâneo ou cartão em até 3x sem juros.
      </>
    ),
    cta: 'Continuar',
  },
  {
    key: 'go',
    eyebrow: 'Pronto',
    title: (
      <>
        Tua garagem
        <br />
        digital começa aqui.
      </>
    ),
    body: (
      <>
        Próximo passo: cadastra teu carro (até 3 na garagem) e escolhe um
        serviço no catálogo. Tudo dentro do app, sem fricção. Diagnóstico
        sempre grátis.
      </>
    ),
    cta: 'Bora pro painel',
  },
]

export const OnboardingView = () => {
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const step = STEPS[index]
  const isLast = index === STEPS.length - 1
  if (!step) return null

  const finish = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ONBOARDING_FLAG, new Date().toISOString())
    }
    router.replace('/dashboard')
  }

  const onPrimary = () => {
    if (isLast) {
      finish()
      return
    }
    setIndex((i) => Math.min(i + 1, STEPS.length - 1))
  }

  const onBack = () => {
    if (index === 0) return
    setIndex((i) => Math.max(i - 1, 0))
  }

  return (
    <ScreenChrome>
      <div className="flex items-center gap-3 px-5 pt-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar"
          disabled={index === 0}
          className="flex h-8 w-8 items-center justify-center rounded-full text-tpc-text transition disabled:opacity-30"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="flex flex-1 gap-1">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-[3px] flex-1 rounded-sm',
                i < index
                  ? 'bg-tpc-red/70'
                  : i === index
                    ? 'bg-tpc-red shadow-[0_0_6px_rgba(225,38,28,0.5)]'
                    : 'bg-tpc-elevated-2',
              )}
            />
          ))}
        </div>
        <div className="min-w-[32px] text-right font-mono text-[10px] tracking-[0.1em] text-tpc-text-tertiary">
          {index + 1}/{STEPS.length}
        </div>
      </div>

      <main className="tpc-scroll flex flex-1 flex-col gap-5 overflow-y-auto px-6 pt-7">
        <div className="tpc-eyebrow">{step.eyebrow}</div>
        <h1 className="text-3xl font-bold leading-[0.95] tracking-tight">{step.title}</h1>
        <p className="text-sm leading-relaxed text-tpc-text-secondary">{step.body}</p>
      </main>

      <div className="flex flex-col gap-2 px-6 pb-6 pt-3">
        <Button fullWidth onClick={onPrimary}>
          {step.cta}
        </Button>
        {!isLast && (
          <button
            type="button"
            onClick={finish}
            className="bg-transparent py-1 text-xs text-tpc-text-secondary transition hover:text-tpc-text"
          >
            Pular por enquanto
          </button>
        )}
      </div>
    </ScreenChrome>
  )
}
