import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { apiGet } from '@/lib/api/server'

interface Me {
  id: string
  email: string
  name: string
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN'
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Server-side gate: usuário sem role STAFF/ADMIN é redirecionado pro
  // dashboard cliente. Não renderiza nada de admin pra esse usuário, evita
  // flash de conteúdo restrito. Se /me falha (sem JWT ou API down), trata
  // como sem permissão por segurança.
  const me = await apiGet<Me>('/me').catch(() => null)

  if (!me || (me.role !== 'STAFF' && me.role !== 'ADMIN')) {
    redirect('/dashboard')
  }

  return <>{children}</>
}
