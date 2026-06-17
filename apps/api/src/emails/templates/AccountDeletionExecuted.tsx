import { Section, Text } from '@react-email/components'
import * as React from 'react'

import {
  EmailLayout,
  EmailMutedText,
  EmailText,
  EmailTitle,
} from './_layout.js'

export interface AccountDeletionExecutedProps {
  siteUrl: string
  customerName: string
  executedAtBR: string
}

export const AccountDeletionExecutedEmail = ({
  siteUrl,
  customerName,
  executedAtBR,
}: AccountDeletionExecutedProps) => (
  <EmailLayout
    siteUrl={siteUrl}
    preview="Tua conta TPC foi excluída conforme solicitado."
  >
    <EmailTitle>Conta excluída, {customerName.split(' ')[0]}.</EmailTitle>
    <EmailText>
      Tua conta TPC Performance foi excluída em <strong>{executedAtBR}</strong>{' '}
      conforme tua solicitação. Esse é o último email que tu vai receber.
    </EmailText>

    <Section className="my-5 rounded-xl border border-[#1a1a1a] bg-[#141414] p-5">
      <Text className="m-0 text-[11px] uppercase tracking-wider text-[#555555]">
        O que aconteceu
      </Text>
      <Text className="m-0 mt-2 text-[13px] text-[#ebebeb]">
        • Dados pessoais (nome, CPF, endereço, telefone, avatar) anonimizados
      </Text>
      <Text className="m-0 mt-1 text-[13px] text-[#ebebeb]">
        • Cartões salvos removidos
      </Text>
      <Text className="m-0 mt-1 text-[13px] text-[#ebebeb]">
        • Arquivos enviados e mensagens do chat apagados
      </Text>
      <Text className="m-0 mt-1 text-[13px] text-[#ebebeb]">
        • Saldo de pontos zerado
      </Text>
      <Text className="m-0 mt-1 text-[13px] text-[#888888]">
        • Histórico de compras e transações preservado anonimamente por 5 anos
        (Lei 8.846/94)
      </Text>
    </Section>

    <EmailMutedText>
      Se quiser voltar um dia, é só criar conta nova com qualquer email — o
      teu agora está liberado. Obrigado pela parceria até aqui.
    </EmailMutedText>
  </EmailLayout>
)
