import { SignInButton, SignUpButton, SignedOut } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { TPCLogo } from '@tpc/ui'

export default async function LandingPage() {
  const { userId } = await auth()
  if (userId) redirect('/dashboard')

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8 text-center">
      <div className="flex flex-col items-center gap-3">
        <TPCLogo size={56} />
        <h1 className="text-4xl font-bold tracking-tight">Painel</h1>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-tpc-text-secondary">
          Carteira pré-paga TPC Performance. Pacotes de pontos pra serviços
          presenciais em Panambi e por arquivo.
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
    </main>
  )
}
