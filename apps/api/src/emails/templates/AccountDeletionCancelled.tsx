import { Section, Text } from '@react-email/components'
import * as React from 'react'

import {
  EmailButton,
  EmailLayout,
  EmailMutedText,
  EmailText,
  EmailTitle,
} from './_layout.js'

export interface AccountDeletionCancelledProps {
  siteUrl: string
  customerName: string
  dashboardUrl: string
}

export const AccountDeletionCancelledEmail = ({
  siteUrl,
  customerName,
  dashboardUrl,
}: AccountDeletionCancelledProps) => (
  <EmailLayout
    siteUrl={siteUrl}
    preview="Boa, tua conta TPC continua ativa."
  >
    <EmailTitle>Tudo certo, {customerName.split(' ')[0]}.</EmailTitle>
    <EmailText>
      A exclusão da tua conta foi <strong>cancelada</strong>. Saldo, carros,
      pedidos e cartões continuam disponíveis normalmente.
    </EmailText>

    <Section className="my-5 rounded-xl border border-[#0f3a1a] bg-[#001a05] p-5 text-center">
      <Text className="m-0 text-[11px] uppercase tracking-wider text-[#7CB342]">
        Status
      </Text>
      <Text className="m-0 mt-2 text-[18px] font-bold text-[#ebebeb]">
        Conta ativa
      </Text>
    </Section>

    <EmailButton href={dashboardUrl}>Voltar ao app</EmailButton>

    <EmailMutedText>
      Se tu não cancelou essa exclusão, alguém pode ter acesso à tua conta.
      Troca a senha agora em Perfil → Segurança.
    </EmailMutedText>
  </EmailLayout>
)
