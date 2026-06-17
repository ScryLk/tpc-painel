'use client'

import { ClerkLoaded, ClerkLoading, SignUp } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

import { AuthFormSkeleton } from '../../_components/AuthFormSkeleton'
import { AuthSplitLayout } from '../../_components/AuthSplitLayout'
import { authEmbedAppearance } from '../../_components/clerk-appearance'

// Mesma estratégia da página de sign-in: mount gate evita hydration mismatch
// quando o Clerk faz seu próprio handshake client-side.
export default function SignUpPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <AuthSplitLayout
      title="Cria tua conta"
      subtitle="Em 30 segundos tu já tá dentro."
    >
      {mounted ? (
        <>
          <ClerkLoading>
            <AuthFormSkeleton />
          </ClerkLoading>
          <ClerkLoaded>
            <SignUp signInUrl="/sign-in" appearance={authEmbedAppearance} />
          </ClerkLoaded>
        </>
      ) : (
        <AuthFormSkeleton />
      )}
    </AuthSplitLayout>
  )
}
