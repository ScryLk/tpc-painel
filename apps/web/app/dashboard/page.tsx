import { UserButton } from '@clerk/nextjs'
import { auth, currentUser } from '@clerk/nextjs/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const { userId } = await auth()
  const user = await currentUser()

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Painel</h1>
        <UserButton afterSignOutUrl="/" />
      </header>

      <section className="rounded-2xl border border-tpc-border bg-tpc-surface p-6">
        <h2 className="tpc-eyebrow mb-3">Sessão Clerk</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-tpc-text-secondary">User ID</dt>
          <dd className="font-mono text-xs">{userId}</dd>
          <dt className="text-tpc-text-secondary">Email</dt>
          <dd>{user?.emailAddresses[0]?.emailAddress}</dd>
          <dt className="text-tpc-text-secondary">Nome</dt>
          <dd>{[user?.firstName, user?.lastName].filter(Boolean).join(' ') || '—'}</dd>
        </dl>
      </section>

      <Link
        href="/pontos/comprar"
        className="rounded-full bg-tpc-red px-6 py-3 text-center font-semibold text-tpc-text shadow-lg shadow-tpc-red/40 transition hover:bg-tpc-red-dark"
      >
        Carregar pontos
      </Link>

      <p className="text-sm text-tpc-text-tertiary">
        Sprint 2 substitui esta página pelo dashboard real (saldo persistente,
        atalhos, próximas atividades).
      </p>
    </main>
  )
}
