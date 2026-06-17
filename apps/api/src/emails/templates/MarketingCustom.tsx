import { Section, Text } from '@react-email/components'
import * as React from 'react'

import {
  EmailButton,
  EmailLayout,
  EmailMutedText,
  EmailText,
  EmailTitle,
} from './_layout.js'

export interface MarketingCustomProps {
  siteUrl: string
  customerName: string
  // Snapshot do conteúdo da campanha (subject já foi resolvido pelo job).
  title: string
  body: string
  ctaText: string | null
  ctaUrl: string | null
  // Indica se é um envio real (false) ou test-send pra preview (true). No
  // teste, mostra um banner no topo deixando claro que é só preview.
  isTest?: boolean
}

const splitParagraphs = (raw: string): string[] =>
  raw
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

export const MarketingCustomEmail = ({
  siteUrl,
  customerName,
  title,
  body,
  ctaText,
  ctaUrl,
  isTest = false,
}: MarketingCustomProps) => {
  const paragraphs = splitParagraphs(body)
  const firstName = customerName.split(' ')[0] || 'cliente'
  const hasCta = Boolean(ctaText && ctaUrl)
  return (
    <EmailLayout siteUrl={siteUrl} preview={title}>
      {isTest && (
        <Section className="mb-4 rounded-md border border-[#7f5c00] bg-[#2a2200] px-3 py-2">
          <Text className="m-0 text-[11px] uppercase tracking-[0.16em] text-[#ffd14d]">
            Test send · preview admin
          </Text>
        </Section>
      )}

      <EmailTitle>{title}</EmailTitle>

      <EmailText>Olá {firstName},</EmailText>

      {paragraphs.map((p, i) => (
        <Text
          key={i}
          className="m-0 mb-3 text-[15px] leading-relaxed text-[#ebebeb]"
        >
          {p}
        </Text>
      ))}

      {hasCta && <EmailButton href={ctaUrl!}>{ctaText}</EmailButton>}

      <EmailMutedText>
        Recebeu esse email porque optou por receber novidades da TPC. Pra
        deixar de receber, atualize suas preferências em{' '}
        <a href={`${siteUrl}/perfil`} style={{ color: '#e1261c' }}>
          Perfil → Notificações
        </a>
        .
      </EmailMutedText>
    </EmailLayout>
  )
}
