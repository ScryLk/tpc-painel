import { redirect } from 'next/navigation'

export default function AdminIndexPage() {
  // V1: única seção do admin é /admin/leads. Quando crescer (ordens
  // pendentes, configurações, etc), vira dashboard real aqui.
  redirect('/admin/leads')
}
