import Image from 'next/image'
import type { ReactNode } from 'react'

interface AuthSplitLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
}

export const AuthSplitLayout = ({ title, subtitle, children }: AuthSplitLayoutProps) => {
  return (
    <main className="grid h-screen grid-cols-1 overflow-hidden bg-tpc-bg md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <section className="relative flex h-full flex-col overflow-y-auto px-6 py-5 md:px-10 md:py-7 lg:px-12">
        <div className="flex items-center justify-between">
          <Image
            src="/_LOGO_TCP.png"
            alt="TPC Performance"
            width={200}
            height={64}
            priority
            className="h-auto w-24"
          />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-tpc-text-tertiary">
            Painel
          </span>
        </div>

        <div
          className="flex flex-1 flex-col items-center justify-center py-4"
          style={{ animation: 'tpc-rise 1.1s cubic-bezier(0.22, 1, 0.36, 1) both' }}
        >
          <div className="w-full max-w-[420px] rounded-2xl border border-tpc-border bg-tpc-surface/70 p-7 shadow-xl shadow-black/40 backdrop-blur-sm md:p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold leading-tight tracking-tight text-tpc-text md:text-[28px]">
                {title}
              </h1>
              <p className="mt-1.5 text-sm text-tpc-text-secondary">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>

        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-tpc-text-tertiary">
          © TPC Performance · Panambi/RS
        </p>
      </section>

      <section className="relative hidden overflow-hidden border-l border-tpc-border bg-black md:block">
        <div
          className="absolute inset-0"
          style={{
            animation: 'tpc-hero-zoom 22s ease-in-out infinite alternate',
          }}
        >
          <Image
            src="/car.png"
            alt=""
            fill
            priority
            sizes="50vw"
            className="object-cover"
            style={{
              objectPosition: 'center 25%',
              filter: 'grayscale(1) brightness(0.78) contrast(1.05)',
            }}
          />
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.0) 35%, rgba(0,0,0,0.65) 100%)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.0) 30%)',
          }}
        />

        <div className="absolute bottom-8 left-8 right-8 max-w-md lg:bottom-10 lg:left-10 lg:right-10">
          <p
            className="font-mono text-[10px] uppercase tracking-[0.22em]"
            style={{
              color: '#ff2a2a',
              textShadow: '0 0 8px rgba(255, 42, 42, 0.55)',
            }}
          >
            Thomas Power Chip
          </p>
          <h2 className="mt-1.5 text-xl font-semibold leading-tight tracking-tight text-tpc-text lg:text-2xl">
            Mais potência pro teu carro.
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-tpc-text-secondary">
            Reprogramação ECU presencial em Panambi/RS ou por arquivo, com chat
            em tempo real.
          </p>
        </div>
      </section>
    </main>
  )
}
