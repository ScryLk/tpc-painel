import { Section, Text } from '@react-email/components'
import * as React from 'react'

import {
  EmailButton,
  EmailLayout,
  EmailMutedText,
  EmailText,
  EmailTitle,
} from './_layout.js'

export interface AccountDeletionScheduledProps {
  siteUrl: string
  customerName: string
  scheduledForBR: string
  graceDays: number
  cancelUrl: string
}

export const AccountDeletionScheduledEmail = ({
  siteUrl,
  customerName,
  scheduledForBR,
  graceDays,
  cancelUrl,
}: AccountDeletionScheduledProps) => (
  <EmailLayout
    siteUrl={siteUrl}
    preview={`Tua conta será excluída em ${scheduledForBR}. Dá pra cancelar.`}
  >
    <EmailTitle>Exclusão agendada, {customerName.split(' ')[0]}.</EmailTitle>
    <EmailText>
      Recebemos teu pedido pra apagar a conta. Tu tem{' '}
      <strong>{graceDays} dias</strong> de carência caso mude de ideia.
    </EmailText>

    <Section className="my-5 rounded-xl border border-[#3a3a1a] bg-[#1a1700] p-5 text-center">
      <Text className="m-0 text-[11px] uppercase tracking-wider text-[#f7c948]">
        Data prevista
      </Text>
      <Text className="m-0 mt-2 text-[20px] font-bold text-[#ebebeb]">
        {scheduledForBR}
      </Text>
    </Section>

    <EmailText>
      Pra cancelar, é só fazer login no app antes da data e clicar em
      &quot;Cancelar exclusão&quot; no Perfil → Privacidade.
    </EmailText>

    <EmailButton href={cancelUrl}>Abrir Perfil</EmailButton>

    <Section className="mt-5 rounded-lg border border-[#1a1a1a] bg-[#141414] p-4">
      <Text className="m-0 text-[11px] uppercase tracking-wider text-[#555555]">
        O que vai acontecer
      </Text>
      <Text className="m-0 mt-2 text-[13px] text-[#ebebeb]">
        • Dados pessoais (nome, CPF, endereço, telefone) anonimizados
      </Text>
      <Text className="m-0 mt-1 text-[13px] text-[#ebebeb]">
        • Cartões salvos, arquivos .bin e mensagens apagados
      </Text>
      <Text className="m-0 mt-1 text-[13px] text-[#ebebeb]">
        • Saldo de pontos zerado (sem reembolso)
      </Text>
      <Text className="m-0 mt-1 text-[13px] text-[#888888]">
        • Transações ficam guardadas anonimamente por 5 anos (Lei 8.846/94)
      </Text>
    </Section>

    <EmailMutedText>
      Se não foste tu que pediu essa exclusão, abre o app agora e cancela. Em
      caso de dúvida, responde esse email.
    </EmailMutedText>
  </EmailLayout>
)
