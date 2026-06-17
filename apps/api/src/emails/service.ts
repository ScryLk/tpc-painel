import { Resend } from 'resend'

import { env } from '../lib/env.js'

// Singleton: Resend client só inicializa se a chave existe; sem chave entra
// em modo dry-run (log no stdout em vez de mandar email real).
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null

export interface SendEmailInput {
  to: string | string[]
  subject: string
  html: string
  // Opcional: texto plain pra clientes que não renderizam HTML (Gmail's preview).
  text?: string
  // Tags pro Resend rastrear no dashboard ("category=transactional").
  tags?: Array<{ name: string; value: string }>
}

export interface SendEmailResult {
  id: string
  dryRun: boolean
}

export const sendEmail = async (input: SendEmailInput): Promise<SendEmailResult> => {
  const payload = {
    from: env.EMAIL_FROM,
    to: Array.isArray(input.to) ? input.to : [input.to],
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: env.EMAIL_REPLY_TO,
    tags: input.tags,
  }

  if (!resend) {
    // Dry-run: ainda emite log estruturado pra debug.
    console.warn(
      `[email:dry-run] to=${payload.to.join(',')} subject="${payload.subject}"`,
    )
    return { id: `dryrun-${Date.now()}`, dryRun: true }
  }

  const { data, error } = await resend.emails.send(payload)
  if (error) {
    throw new Error(`Resend error: ${error.message || JSON.stringify(error)}`)
  }
  if (!data?.id) {
    throw new Error('Resend returned no id')
  }
  return { id: data.id, dryRun: false }
}
