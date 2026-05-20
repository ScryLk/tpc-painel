import { ClerkLoaded, ClerkLoading, SignUp } from '@clerk/nextjs'

import { AuthFormSkeleton } from '../../_components/AuthFormSkeleton'
import { AuthSplitLayout } from '../../_components/AuthSplitLayout'
import { authEmbedAppearance } from '../../_components/clerk-appearance'

export default function SignUpPage() {
  return (
    <AuthSplitLayout
      title="Cria tua conta"
      subtitle="Em 30 segundos tu já tá dentro."
    >
      <ClerkLoading>
        <AuthFormSkeleton />
      </ClerkLoading>
      <ClerkLoaded>
        <SignUp signInUrl="/sign-in" appearance={authEmbedAppearance} />
      </ClerkLoaded>
    </AuthSplitLayout>
  )
}
