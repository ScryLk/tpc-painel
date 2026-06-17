import { Hr, Row, Section, Text } from '@react-email/components'
import * as React from 'react'

import {
  EmailButton,
  EmailLayout,
  EmailMutedText,
  EmailText,
  EmailTitle,
} from './_layout.js'

interface ShowcaseItem {
  id: string
  name: string
  description: string | null
  pts: number
  category: string | null
  url: string
}

export interface ServicesShowcaseProps {
  siteUrl: string
  subject: string
  customerName: string
  presencial: ShowcaseItem[]
  arquivo: ShowcaseItem[]
  catalogUrl: string
  preferencesUrl: string
}

const ServiceCard = ({ item }: { item: ShowcaseItem }) => (
  <Row className="mt-3">
    <Section className="rounded-lg border border-[#1a1a1a] bg-[#141414] p-4">
      {item.category && (
        <Text className="m-0 text-[10px] uppercase tracking-wider text-[#888888]">
          {item.category}
        </Text>
      )}
      <Text className="m-0 mt-1 text-[15px] font-bold text-[#ebebeb]">
        {item.name}
      </Text>
      {item.description && (
        <Text className="m-0 mt-2 text-[12.5px] leading-relaxed text-[#888888]">
          {item.description}
        </Text>
      )}
      <Text className="m-0 mt-3 text-[13px] text-[#e1261c]">
        <strong>{item.pts} pts</strong> ·{' '}
        <a href={item.url} className="text-[#e1261c]">
          ver detalhes →
        </a>
      </Text>
    </Section>
  </Row>
)

export const ServicesShowcaseEmail = ({
  siteUrl,
  customerName,
  presencial,
  arquivo,
  catalogUrl,
  preferencesUrl,
}: ServicesShowcaseProps) => (
  <EmailLayout
    siteUrl={siteUrl}
    preview="Conhece os serviços que a TPC tem pra teu carro"
  >
    <EmailTitle>E aí, {customerName.split(' ')[0]}.</EmailTitle>
    <EmailText>
      Separamos alguns serviços do catálogo TPC pra ti ver o que dá pra fazer
      com teus pontos. Tanto na oficina em Panambi quanto pelo nosso file
      service, à distância.
    </EmailText>

    {presencial.length > 0 && (
      <>
        <Hr className="my-6 border-[#1a1a1a]" />
        <Text className="m-0 mb-1 text-[11px] uppercase tracking-[0.2em] text-[#e1261c]">
          Na oficina · Panambi/RS
        </Text>
        <Text className="m-0 mb-2 text-[13px] text-[#888888]">
          Serviços executados presencialmente no nosso ponto.
        </Text>
        {presencial.map((item) => (
          <ServiceCard key={item.id} item={item} />
        ))}
      </>
    )}

    {arquivo.length > 0 && (
      <>
        <Hr className="my-6 border-[#1a1a1a]" />
        <Text className="m-0 mb-1 text-[11px] uppercase tracking-[0.2em] text-[#e1261c]">
          Por arquivo · à distância
        </Text>
        <Text className="m-0 mb-2 text-[13px] text-[#888888]">
          Manda teu arquivo, a TPC mapeia, devolve pelo chat. Sem sair de casa.
        </Text>
        {arquivo.map((item) => (
          <ServiceCard key={item.id} item={item} />
        ))}
      </>
    )}

    <Hr className="my-6 border-[#1a1a1a]" />

    <EmailButton href={catalogUrl}>Ver catálogo completo</EmailButton>

    <EmailMutedText>
      Tudo no app, pagando com pontos. Sem boleto avulso, sem espera de
      cotação na hora.
    </EmailMutedText>

    <Text className="m-0 mt-6 text-center text-[11px] text-[#555555]">
      Esse é um email de divulgação. Pra parar de receber,{' '}
      <a href={preferencesUrl} className="text-[#e1261c]">
        ajusta tuas preferências
      </a>
      .
    </Text>
  </EmailLayout>
)
