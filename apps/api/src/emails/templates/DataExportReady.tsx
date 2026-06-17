import { Section, Text } from '@react-email/components'
import * as React from 'react'

import {
  EmailButton,
  EmailLayout,
  EmailMutedText,
  EmailText,
  EmailTitle,
} from './_layout.js'

export interface DataExportReadyProps {
  siteUrl: string
  customerName: string
  exportId: string
  downloadUrl: string
  expiresAt: string
  includedSections: string[]
}

const SECTION_LABELS: Record<string, string> = {
  includeTransactions: 'Transações',
  includeOrders: 'Pedidos',
  includeFiles: 'Arquivos',
  includeMessages: 'Mensagens do chat',
}

const formatExpiry = (iso: string): string => {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

export const DataExportReadyEmail = ({
  siteUrl,
  customerName,
  downloadUrl,
  expiresAt,
  includedSections,
}: DataExportReadyProps) => (
  <EmailLayout
    siteUrl={siteUrl}
    preview="Teu pacote de dados está pronto pra baixar"
  >
    <EmailTitle>Pacote pronto, {customerName.split(' ')[0]}.</EmailTitle>
    <EmailText>
      Terminamos de preparar teus dados. Tu pode baixar pelo Perfil →
      Privacidade no app.
    </EmailText>

    <EmailButton href={downloadUrl}>Abrir Perfil pra baixar</EmailButton>

    <Section className="mt-5 rounded-lg border border-[#1a1a1a] bg-[#141414] p-4">
      <Text className="m-0 text-[11px] uppercase tracking-wider text-[#555555]">
        Incluído nesse pacote
      </Text>
      <Text className="m-0 mt-2 text-[13px] text-[#ebebeb]">
        Dados pessoais, endereço, carros e consentimentos (sempre)
      </Text>
      {includedSections.map((key) => (
        <Text key={key} className="m-0 mt-1 text-[13px] text-[#ebebeb]">
          {SECTION_LABELS[key] ?? key}
        </Text>
      ))}
    </Section>

    <EmailMutedText>
      O link expira em <strong>{formatExpiry(expiresAt)}</strong>. Depois disso,
      é só pedir um novo pacote pelo app.
    </EmailMutedText>
  </EmailLayout>
)
