import { Section, Text } from '@react-email/components'
import * as React from 'react'

import {
  EmailButton,
  EmailLayout,
  EmailMutedText,
  EmailText,
  EmailTitle,
} from './_layout.js'

export interface PasswordResetProps {
  siteUrl: string
  customerName: string
  resetUrl: string
  expiresInMinutes: number
  // Quantas sessões ativas foram revogadas no momento do envio. Quando > 0,
  // o template adiciona uma nota explicando que o user foi deslogado dos
  // dispositivos onde estava logado.
  sessionsRevoked?: number
}

export const PasswordResetEmail = ({
  siteUrl,
  customerName,
  resetUrl,
  expiresInMinutes,
  sessionsRevoked = 0,
}: PasswordResetProps) => (
  <EmailLayout
    siteUrl={siteUrl}
    preview="Link pra redefinir tua senha da TPC Performance"
  >
    <EmailTitle>Redefinir senha, {customerName.split(' ')[0]}.</EmailTitle>
    <EmailText>
      Um admin da TPC iniciou uma redefinição de senha pra tua conta. Clica
      no botão pra entrar e definir uma senha nova.
    </EmailText>

    <EmailButton href={resetUrl}>Redefinir minha senha</EmailButton>

    <Section className="mt-5 rounded-lg border border-[#1a1a1a] bg-[#141414] p-4">
      <Text className="m-0 text-[11px] uppercase tracking-wider text-[#555555]">
        Como funciona
      </Text>
      <Text className="m-0 mt-2 text-[13px] text-[#ebebeb]">
        1. Clica no botão acima — vai te logar automaticamente.
      </Text>
      <Text className="m-0 mt-1 text-[13px] text-[#ebebeb]">
        2. Abre Perfil → Segurança no app.
      </Text>
      <Text className="m-0 mt-1 text-[13px] text-[#ebebeb]">
        3. Toca em &quot;Trocar senha&quot; e define a nova.
      </Text>
    </Section>

    {sessionsRevoked > 0 && (
      <EmailMutedText>
        Por segurança, {sessionsRevoked === 1
          ? 'tua sessão ativa foi encerrada'
          : `${sessionsRevoked} sessões ativas foram encerradas`}
        . Tu vai precisar entrar de novo nos dispositivos onde estava logado.
      </EmailMutedText>
    )}

    <EmailMutedText>
      O link expira em <strong>{expiresInMinutes} minutos</strong> e só pode
      ser usado uma vez. Se não foi tu que pediu, ignora esse email — a senha
      atual continua valendo.
    </EmailMutedText>
  </EmailLayout>
)
