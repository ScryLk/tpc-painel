import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-2xl font-semibold">404</h2>
      <p className="text-tpc-text-secondary">Página não encontrada.</p>
      <Link href="/" className="text-tpc-text underline underline-offset-4">
        Voltar pra home
      </Link>
    </main>
  )
}
