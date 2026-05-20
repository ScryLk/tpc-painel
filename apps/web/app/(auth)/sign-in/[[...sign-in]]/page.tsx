import { ClerkLoaded, ClerkLoading, SignIn } from '@clerk/nextjs'

import { AuthFormSkeleton } from '../../_components/AuthFormSkeleton'
import { AuthSplitLayout } from '../../_components/AuthSplitLayout'
import { authEmbedAppearance } from '../../_components/clerk-appearance'

export default function SignInPage() {
  return (
    <AuthSplitLayout
      title="Bem-vindo de volta"
      subtitle="Acessa tua conta pra continuar."
    >
      <ClerkLoading>
        <AuthFormSkeleton />
      </ClerkLoading>
      <ClerkLoaded>
        <SignIn signUpUrl="/sign-up" appearance={authEmbedAppearance} />
      </ClerkLoaded>
    </AuthSplitLayout>
  )
}
