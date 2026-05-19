import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'
import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8 text-center">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">TPC Painel</h1>
        <p className="mx-auto max-w-md text-tpc-text-secondary">
          Carteira pré-paga TPC Performance. Pacotes de pontos pra serviços
          presenciais e por arquivo.
        </p>
      </div>

      <SignedOut>
        <div className="flex gap-3">
          <SignInButton mode="modal">
            <button
              type="button"
              className="rounded-full bg-tpc-red px-6 py-3 font-semibold text-tpc-text shadow-lg shadow-tpc-red/40 transition hover:bg-tpc-red-dark"
            >
              Entrar
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button
              type="button"
              className="rounded-full border border-tpc-border-strong bg-transparent px-6 py-3 font-semibold text-tpc-text transition hover:bg-tpc-elevated"
            >
              Criar conta
            </button>
          </SignUpButton>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="rounded-full bg-tpc-red px-6 py-3 font-semibold text-tpc-text shadow-lg shadow-tpc-red/40 transition hover:bg-tpc-red-dark"
          >
            Ir pro painel
          </Link>
          <UserButton />
        </div>
      </SignedIn>
    </main>
  )
}
