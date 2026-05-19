import { auth, currentUser } from '@clerk/nextjs/server'
import { UserButton } from '@clerk/nextjs'

export default async function DashboardPage() {
  const { userId } = await auth()
  const user = await currentUser()

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Painel</h1>
        <UserButton afterSignOutUrl="/" />
      </header>

      <section className="rounded-lg border border-tpc-border bg-white p-6">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-tpc-gray-secondary">
          Sessão Clerk
        </h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-tpc-gray-secondary">User ID</dt>
          <dd className="font-mono">{userId}</dd>
          <dt className="text-tpc-gray-secondary">Email</dt>
          <dd>{user?.emailAddresses[0]?.emailAddress}</dd>
          <dt className="text-tpc-gray-secondary">Nome</dt>
          <dd>{[user?.firstName, user?.lastName].filter(Boolean).join(' ') || '—'}</dd>
        </dl>
      </section>

      <p className="text-sm text-tpc-gray-secondary">
        Sprint 1 substitui esta página pelo dashboard real (saldo, atalhos,
        próximas atividades).
      </p>
    </main>
  )
}
