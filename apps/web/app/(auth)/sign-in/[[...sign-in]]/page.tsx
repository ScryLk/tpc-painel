'use client'

import { ClerkLoaded, ClerkLoading, SignIn } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

import { AuthFormSkeleton } from '../../_components/AuthFormSkeleton'
import { AuthSplitLayout } from '../../_components/AuthSplitLayout'
import { authEmbedAppearance } from '../../_components/clerk-appearance'

// Mount gate: SSR e primeiro paint do client renderizam o skeleton (idêntico).
// Após hidratação, useEffect flipa e o Clerk monta. Sem isso, o SignIn do Clerk
// rehidrata de forma inconsistente (especialmente com __clerk_ticket na URL,
// como no link de reset de senha) e gera hydration mismatch.
export default function SignInPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <AuthSplitLayout
      title="Bem-vindo de volta"
      subtitle="Acessa tua conta pra continuar."
    >
      {mounted ? (
        <>
          <ClerkLoading>
            <AuthFormSkeleton />
          </ClerkLoading>
          <ClerkLoaded>
            <SignIn signUpUrl="/sign-up" appearance={authEmbedAppearance} />
          </ClerkLoaded>
        </>
      ) : (
        <AuthFormSkeleton />
      )}
    </AuthSplitLayout>
  )
}
