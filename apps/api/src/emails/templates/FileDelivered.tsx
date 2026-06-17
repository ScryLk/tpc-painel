import { Section, Text } from '@react-email/components'
import * as React from 'react'

import {
  EmailButton,
  EmailLayout,
  EmailMutedText,
  EmailText,
  EmailTitle,
} from './_layout.js'

export interface FileDeliveredProps {
  siteUrl: string
  customerName: string
  protocol: string
  serviceName: string
  pointsToDebit: number
  orderUrl: string
}

export const FileDeliveredEmail = ({
  siteUrl,
  customerName,
  protocol,
  serviceName,
  pointsToDebit,
  orderUrl,
}: FileDeliveredProps) => (
  <EmailLayout
    siteUrl={siteUrl}
    preview={`Arquivo de ${serviceName} entregue — aprova pra liberar`}
  >
    <EmailTitle>Teu arquivo tá pronto, {customerName.split(' ')[0]}.</EmailTitle>
    <EmailText>
      A TPC entregou o arquivo modificado de <strong>{serviceName}</strong>{' '}
      (pedido <strong>#{protocol}</strong>).
    </EmailText>
    <EmailText>
      Confere no chat, aprova pra liberar o download permanente e debitar{' '}
      <strong>{pointsToDebit} pts</strong>.
    </EmailText>

    <EmailButton href={orderUrl}>Ver e aprovar</EmailButton>

    <Section className="mt-5 rounded-lg border border-[#22e07a]/30 bg-[#22e07a]/[0.06] p-4">
      <Text className="m-0 text-[11px] uppercase tracking-wider text-[#22e07a]">
        Arquivo pra sempre
      </Text>
      <Text className="m-0 mt-2 text-[13px] leading-relaxed text-[#ebebeb]">
        Depois de aprovar, o arquivo modificado fica baixável pra sempre pelo
        Histórico. Trocou de celular? Faz login e baixa de novo.
      </Text>
    </Section>

    <EmailMutedText>
      Se algum parâmetro precisa de ajuste, responde no chat do pedido — TPC
      pode fazer até 3 revisões sem custo extra.
    </EmailMutedText>
  </EmailLayout>
)
