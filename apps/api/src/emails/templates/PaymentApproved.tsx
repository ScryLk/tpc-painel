import { Section, Text } from '@react-email/components'
import * as React from 'react'

import {
  EmailButton,
  EmailLayout,
  EmailMutedText,
  EmailText,
  EmailTitle,
} from './_layout.js'

export interface PaymentApprovedProps {
  siteUrl: string
  customerName: string
  packageName: string
  pointsCredited: number
  bonusPoints: number
  amountBRL: string
  method: 'PIX' | 'CREDIT_CARD'
  newBalance: number
  dashboardUrl: string
}

const methodLabel = (m: 'PIX' | 'CREDIT_CARD') => (m === 'PIX' ? 'Pix' : 'Cartão')

const formatPoints = (n: number) =>
  new Intl.NumberFormat('pt-BR').format(Math.max(0, Math.floor(n)))

export const PaymentApprovedEmail = ({
  siteUrl,
  customerName,
  packageName,
  pointsCredited,
  bonusPoints,
  amountBRL,
  method,
  newBalance,
  dashboardUrl,
}: PaymentApprovedProps) => (
  <EmailLayout
    siteUrl={siteUrl}
    preview={`+${formatPoints(pointsCredited)} pts creditados na tua conta TPC`}
  >
    <EmailTitle>Pontos creditados, {customerName.split(' ')[0]}.</EmailTitle>
    <EmailText>
      Recebemos teu pagamento de <strong>{amountBRL}</strong> via{' '}
      <strong>{methodLabel(method)}</strong>. Os pontos já estão disponíveis
      pra usar.
    </EmailText>

    <Section className="my-5 rounded-lg border border-[#22e07a]/40 bg-[#22e07a]/[0.08] p-5 text-center">
      <Text className="m-0 text-[11px] uppercase tracking-wider text-[#22e07a]">
        Creditado
      </Text>
      <Text className="m-0 mt-1 text-[36px] font-bold leading-none tracking-tight text-[#22e07a]">
        +{formatPoints(pointsCredited)}
      </Text>
      <Text className="m-0 mt-1 text-[12px] text-[#888888]">pts</Text>
      {bonusPoints > 0 && (
        <Text className="m-0 mt-3 text-[12px] text-[#22e07a]">
          inclui +{formatPoints(bonusPoints)} pts de bônus do pacote{' '}
          <strong>{packageName}</strong>
        </Text>
      )}
    </Section>

    <Section className="rounded-lg border border-[#1a1a1a] bg-[#141414] p-4">
      <Text className="m-0 text-[11px] uppercase tracking-wider text-[#555555]">
        Saldo atual
      </Text>
      <Text className="m-0 mt-1 text-[20px] font-semibold text-[#ebebeb]">
        {formatPoints(newBalance)} pts
      </Text>
    </Section>

    <EmailButton href={dashboardUrl}>Abrir o painel</EmailButton>

    <EmailMutedText>
      Pontos não expiram. Pra recibo fiscal, fala com a TPC pelo WhatsApp.
    </EmailMutedText>
  </EmailLayout>
)
