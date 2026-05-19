'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-2xl font-semibold">Algo deu errado</h2>
      <p className="max-w-md text-tpc-text-secondary">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-tpc-red px-5 py-2.5 font-medium text-tpc-text transition hover:bg-tpc-red-dark"
      >
        Tentar de novo
      </button>
    </main>
  )
}
