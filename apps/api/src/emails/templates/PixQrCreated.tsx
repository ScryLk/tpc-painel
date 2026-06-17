import { Section, Text } from '@react-email/components'
import * as React from 'react'

import {
  EmailButton,
  EmailLayout,
  EmailMutedText,
  EmailText,
  EmailTitle,
} from './_layout.js'

export interface PixQrCreatedProps {
  siteUrl: string
  customerName: string
  packageName: string
  pointsTotal: number
  amountBRL: string
  expiresAt: string
  reopenUrl: string
}

export const PixQrCreatedEmail = ({
  siteUrl,
  customerName,
  packageName,
  pointsTotal,
  amountBRL,
  expiresAt,
  reopenUrl,
}: PixQrCreatedProps) => (
  <EmailLayout
    siteUrl={siteUrl}
    preview={`Pix do pacote ${packageName} pronto · ${amountBRL}`}
  >
    <EmailTitle>QR Pix gerado, {customerName.split(' ')[0]}.</EmailTitle>
    <EmailText>
      Teu Pix do pacote <strong>{packageName}</strong> ({pointsTotal} pts) está
      esperando confirmação. Se fechou a aba, é só reabrir pelo botão abaixo
      e finalizar o pagamento.
    </EmailText>

    <EmailButton href={reopenUrl}>Abrir QR Pix</EmailButton>

    <Section className="mt-5 rounded-lg border border-[#1a1a1a] bg-[#141414] p-4">
      <Text className="m-0 text-[11px] uppercase tracking-wider text-[#555555]">
        Resumo
      </Text>
      <Text className="m-0 mt-2 text-[13px] text-[#ebebeb]">
        Pacote: <strong>{packageName}</strong>
      </Text>
      <Text className="m-0 mt-1 text-[13px] text-[#ebebeb]">
        Valor: <strong>{amountBRL}</strong>
      </Text>
      <Text className="m-0 mt-1 text-[13px] text-[#ebebeb]">
        Pontos: <strong>{pointsTotal}</strong>
      </Text>
      <Text className="m-0 mt-1 text-[13px] text-[#ebebeb]">
        Expira em: <strong>{expiresAt}</strong>
      </Text>
    </Section>

    <EmailMutedText>
      Assim que o pagamento for confirmado, os pontos caem na tua carteira na
      hora. Se o Pix expirar, é só voltar ao app e gerar outro.
    </EmailMutedText>
  </EmailLayout>
)
