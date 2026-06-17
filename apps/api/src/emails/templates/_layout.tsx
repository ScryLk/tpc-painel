import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components'
import * as React from 'react'

interface LayoutProps {
  preview: string
  siteUrl: string
  children: React.ReactNode
}

// Header textual em vez de logo PNG. Email clients (Gmail principalmente)
// bloqueiam data URIs em <img>, e URL publica do site nao alcanca em dev
// (proxy do Gmail nao chega no localhost). Texto estilizado funciona em
// 100% dos clientes, zero dependencia externa.
const EmailHeader = () => (
  <Section className="pb-6 text-center">
    <Text className="m-0 text-[10px] font-bold uppercase tracking-[0.3em] text-[#e1261c]">
      TPC
    </Text>
    <Heading className="m-0 mt-1 text-[20px] font-bold tracking-tight text-[#ebebeb]">
      Performance
    </Heading>
    <Section className="mx-auto mt-3 h-[2px] w-[40px] bg-[#e1261c]" />
  </Section>
)

// Layout base com header + footer. Tailwind classes via @react-email/tailwind
// (subset compatível com inbox clients — sem CSS variables, sem flex moderno).
// Cores hardcoded pq inbox não resolve CSS vars.
export const EmailLayout = ({ preview, siteUrl, children }: LayoutProps) => (
  <Html>
    <Head />
    <Preview>{preview}</Preview>
    <Tailwind>
      <Body className="bg-[#000000] py-8 font-sans text-[#ebebeb]">
        <Container className="mx-auto max-w-[560px] rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] p-8">
          <EmailHeader />

          {children}

          <Hr className="my-7 border-[#1a1a1a]" />
          <Section>
            <Text className="m-0 text-center text-[11px] text-[#555555]">
              Recebeu esse email por causa da tua conta TPC Performance.
            </Text>
            <Text className="m-0 mt-1 text-center text-[11px] text-[#555555]">
              Pra mudar preferências de notificação, abre o app em{' '}
              <a href={`${siteUrl}/perfil`} className="text-[#e1261c]">
                Perfil → Notificações
              </a>
              .
            </Text>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
)

// Helpers reutilizáveis nos templates filhos.
export const EmailTitle = ({ children }: { children: React.ReactNode }) => (
  <Heading className="m-0 mb-3 text-[24px] font-bold tracking-tight text-[#ebebeb]">
    {children}
  </Heading>
)

export const EmailText = ({ children }: { children: React.ReactNode }) => (
  <Text className="m-0 mb-3 text-[15px] leading-relaxed text-[#ebebeb]">
    {children}
  </Text>
)

export const EmailMutedText = ({ children }: { children: React.ReactNode }) => (
  <Text className="m-0 mb-3 text-[13px] leading-relaxed text-[#888888]">
    {children}
  </Text>
)

export const EmailButton = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Section className="my-5">
    <a
      href={href}
      className="inline-block rounded-full bg-[#e1261c] px-6 py-3 text-[14px] font-semibold text-[#ebebeb] no-underline"
    >
      {children}
    </a>
  </Section>
)
