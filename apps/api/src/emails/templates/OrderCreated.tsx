import { Section, Text } from '@react-email/components'
import * as React from 'react'

import {
  EmailButton,
  EmailLayout,
  EmailMutedText,
  EmailText,
  EmailTitle,
} from './_layout.js'

export interface OrderCreatedProps {
  siteUrl: string
  customerName: string
  protocol: string
  serviceName: string
  isCustomQuote: boolean
  pointsReserved: number
  orderUrl: string
}

export const OrderCreatedEmail = ({
  siteUrl,
  customerName,
  protocol,
  serviceName,
  isCustomQuote,
  pointsReserved,
  orderUrl,
}: OrderCreatedProps) => (
  <EmailLayout
    siteUrl={siteUrl}
    preview={`Pedido #${protocol} aberto — TPC analisa em breve`}
  >
    <EmailTitle>Pedido aberto, {customerName.split(' ')[0]}.</EmailTitle>
    <EmailText>
      Recebemos teu pedido <strong>{serviceName}</strong> com protocolo{' '}
      <strong>#{protocol}</strong>.
    </EmailText>

    {isCustomQuote ? (
      <EmailText>
        Como é um pedido personalizado, a TPC vai analisar e mandar orçamento em
        até <strong>24h</strong> direto pelo chat do app.
      </EmailText>
    ) : (
      <EmailText>
        <strong>{pointsReserved} pts</strong> ficam reservados até a TPC entregar
        e tu aprovar o arquivo.
      </EmailText>
    )}

    <EmailButton href={orderUrl}>Abrir conversa</EmailButton>

    <Section className="mt-5 rounded-lg border border-[#1a1a1a] bg-[#141414] p-4">
      <Text className="m-0 text-[11px] uppercase tracking-wider text-[#555555]">
        Resumo
      </Text>
      <Text className="m-0 mt-2 text-[13px] text-[#ebebeb]">
        Serviço: <strong>{serviceName}</strong>
      </Text>
      <Text className="m-0 mt-1 text-[13px] text-[#ebebeb]">
        Protocolo: <strong>#{protocol}</strong>
      </Text>
      {!isCustomQuote && (
        <Text className="m-0 mt-1 text-[13px] text-[#ebebeb]">
          Reservado: <strong>{pointsReserved} pts</strong>
        </Text>
      )}
    </Section>

    <EmailMutedText>
      Qualquer dúvida, responde esse email ou chama no WhatsApp da TPC.
    </EmailMutedText>
  </EmailLayout>
)
