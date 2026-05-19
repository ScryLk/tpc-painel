'use client'

import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-2xl font-semibold">Algo deu errado</h2>
      <p className="max-w-md text-tpc-gray-secondary">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-tpc-red px-4 py-2 font-medium text-white transition hover:bg-tpc-red-600"
      >
        Tentar de novo
      </button>
    </main>
  )
}
