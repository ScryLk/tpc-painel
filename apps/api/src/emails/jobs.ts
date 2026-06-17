import { render } from '@react-email/render'
import * as React from 'react'

import { prisma } from '@tpc/db'

import { env } from '../lib/env.js'
import { defineJob, enqueue } from '../lib/queue.js'

import { sendEmail } from './service.js'
import {
  FileDeliveredEmail,
  type FileDeliveredProps,
} from './templates/FileDelivered.js'
import {
  OrderCreatedEmail,
  type OrderCreatedProps,
} from './templates/OrderCreated.js'
import {
  PaymentApprovedEmail,
  type PaymentApprovedProps,
} from './templates/PaymentApproved.js'
import {
  PixQrCreatedEmail,
  type PixQrCreatedProps,
} from './templates/PixQrCreated.js'
import {
  ServicesShowcaseEmail,
  type ServicesShowcaseProps,
} from './templates/ServicesShowcase.js'
import {
  DataExportReadyEmail,
  type DataExportReadyProps,
} from './templates/DataExportReady.js'
import {
  AccountDeletionScheduledEmail,
  type AccountDeletionScheduledProps,
} from './templates/AccountDeletionScheduled.js'
import {
  AccountDeletionCancelledEmail,
  type AccountDeletionCancelledProps,
} from './templates/AccountDeletionCancelled.js'
import {
  AccountDeletionExecutedEmail,
  type AccountDeletionExecutedProps,
} from './templates/AccountDeletionExecuted.js'
import {
  PasswordResetEmail,
  type PasswordResetProps,
} from './templates/PasswordReset.js'
import {
  MarketingCustomEmail,
  type MarketingCustomProps,
} from './templates/MarketingCustom.js'
import {
  buildLeadAdminNotificationEmail,
  type LeadAdminNotificationProps,
} from './templates/LeadAdminNotification.js'
import {
  buildLeadResponseEmail,
  type LeadResponseProps,
} from './templates/LeadResponse.js'

// Registry de templates. Cada entry mapeia kind → render fn.
// Adicionar template novo = 1 entry aqui + 1 case no payload union abaixo.
type EmailPayload =
  | { kind: 'orderCreated'; to: string; props: OrderCreatedProps }
  | { kind: 'fileDelivered'; to: string; props: FileDeliveredProps }
  | { kind: 'paymentApproved'; to: string; props: PaymentApprovedProps }
  | { kind: 'pixQrCreated'; to: string; props: PixQrCreatedProps }
  | { kind: 'servicesShowcase'; to: string; props: ServicesShowcaseProps }
  | { kind: 'dataExportReady'; to: string; props: DataExportReadyProps }
  | {
      kind: 'accountDeletionScheduled'
      to: string
      props: AccountDeletionScheduledProps
    }
  | {
      kind: 'accountDeletionCancelled'
      to: string
      props: AccountDeletionCancelledProps
    }
  | {
      kind: 'accountDeletionExecuted'
      to: string
      props: AccountDeletionExecutedProps
    }
  | { kind: 'leadAdminNotification'; to: string; props: LeadAdminNotificationProps }
  | { kind: 'leadResponse'; to: string; props: LeadResponseProps }
  | { kind: 'passwordReset'; to: string; props: PasswordResetProps }
  | {
      kind: 'marketingCustom'
      to: string
      // Subject é separado do título visível dentro do email (props.title).
      // Ambos vêm da campanha mas são campos distintos.
      subject: string
      props: MarketingCustomProps
      // campaignId/deliveryId: usados pra atualizar status do delivery
      // quando o job processa (job lê pra marcar SENT/FAILED).
      campaignId?: string
      deliveryId?: string
      // tags: passadas pro Resend pra cruzar webhooks (Fase 2).
      tags?: Array<{ name: string; value: string }>
    }

const buildEmail = async (
  payload: EmailPayload,
): Promise<{ subject: string; html: string }> => {
  switch (payload.kind) {
    case 'orderCreated': {
      const html = await render(React.createElement(OrderCreatedEmail, payload.props))
      return {
        subject: `Pedido #${payload.props.protocol} aberto · TPC Performance`,
        html,
      }
    }
    case 'fileDelivered': {
      const html = await render(React.createElement(FileDeliveredEmail, payload.props))
      return {
        subject: `Arquivo pronto · ${payload.props.serviceName} #${payload.props.protocol}`,
        html,
      }
    }
    case 'paymentApproved': {
      const html = await render(React.createElement(PaymentApprovedEmail, payload.props))
      return {
        subject: `+${payload.props.pointsCredited} pts creditados · TPC Performance`,
        html,
      }
    }
    case 'pixQrCreated': {
      const html = await render(React.createElement(PixQrCreatedEmail, payload.props))
      return {
        subject: `Pix do pacote ${payload.props.packageName} · reabrir QR`,
        html,
      }
    }
    case 'servicesShowcase': {
      const html = await render(React.createElement(ServicesShowcaseEmail, payload.props))
      return {
        subject: payload.props.subject,
        html,
      }
    }
    case 'dataExportReady': {
      const html = await render(React.createElement(DataExportReadyEmail, payload.props))
      return {
        subject: 'Teu pacote de dados está pronto · TPC Performance',
        html,
      }
    }
    case 'accountDeletionScheduled': {
      const html = await render(
        React.createElement(AccountDeletionScheduledEmail, payload.props),
      )
      return {
        subject: `Exclusão de conta agendada · ${payload.props.scheduledForBR}`,
        html,
      }
    }
    case 'accountDeletionCancelled': {
      const html = await render(
        React.createElement(AccountDeletionCancelledEmail, payload.props),
      )
      return {
        subject: 'Exclusão cancelada · tua conta TPC continua ativa',
        html,
      }
    }
    case 'accountDeletionExecuted': {
      const html = await render(
        React.createElement(AccountDeletionExecutedEmail, payload.props),
      )
      return {
        subject: 'Tua conta TPC foi excluída',
        html,
      }
    }
    case 'leadAdminNotification': {
      // Template em HTML string (não react-email). Retorna {subject, html} pronto.
      return buildLeadAdminNotificationEmail(payload.props)
    }
    case 'leadResponse': {
      return buildLeadResponseEmail(payload.props)
    }
    case 'passwordReset': {
      const html = await render(React.createElement(PasswordResetEmail, payload.props))
      return {
        subject: 'Redefinir senha · TPC Performance',
        html,
      }
    }
    case 'marketingCustom': {
      const html = await render(
        React.createElement(MarketingCustomEmail, payload.props),
      )
      // Pra test-sends, prefixa [TEST] pra não confundir com envio real
      // na inbox (banner visual é separado, via props.isTest).
      const isTest = payload.props.isTest === true
      const subject = isTest ? `[TEST] ${payload.subject}` : payload.subject
      return { subject, html }
    }
  }
}

export const SEND_EMAIL_JOB = 'send-email'

defineJob<{ payload: EmailPayload }>({
  name: SEND_EMAIL_JOB,
  processor: async (job) => {
    const { payload } = job.data
    const { subject, html } = await buildEmail(payload)

    // Tags por kind + extras (ex: campaignId pra rastrear via webhook Resend
    // depois). Fica salvo no Resend dashboard pra filtros.
    const baseTags = [{ name: 'kind', value: payload.kind }]
    const extraTags =
      payload.kind === 'marketingCustom' ? (payload.tags ?? []) : []
    const tags = [...baseTags, ...extraTags]

    try {
      const result = await sendEmail({ to: payload.to, subject, html, tags })

      // Marketing: marca delivery como SENT, salva resendId pra cruzar com
      // webhooks (Fase 2). Falha aqui é não-fatal pro email já foi enviado.
      if (
        payload.kind === 'marketingCustom' &&
        payload.deliveryId &&
        !result.dryRun
      ) {
        await prisma.marketingCampaignDelivery
          .update({
            where: { id: payload.deliveryId },
            data: {
              status: 'SENT',
              sentAt: new Date(),
              resendId: result.id,
            },
          })
          .catch(() => {
            /* delivery row missing — não impede o envio */
          })
      }

      return { id: result.id, dryRun: result.dryRun }
    } catch (err) {
      // Marketing: registra falha no delivery antes de propagar pro BullMQ
      // retry. Backoff exponencial vai tentar 3x; após esgotar, fica como
      // FAILED com a última razão.
      if (payload.kind === 'marketingCustom' && payload.deliveryId) {
        const reason = err instanceof Error ? err.message : String(err)
        await prisma.marketingCampaignDelivery
          .update({
            where: { id: payload.deliveryId },
            data: { status: 'FAILED', failureReason: reason.slice(0, 500) },
          })
          .catch(() => {})
      }
      throw err
    }
  },
})

// API pública usada pelos endpoints: enfileira e responde 200 imediato.
// Erros de send são retried pelo BullMQ (3x backoff exp); se falhar 3x,
// fica na dead-letter queue (removeOnFail age 7d).
export const queueEmail = async (payload: EmailPayload): Promise<void> => {
  await enqueue(SEND_EMAIL_JOB, { payload })
}

// Helper pra montar URLs absolutas usadas dentro dos templates (botões
// pro app). Concentra a fonte de NEXT_PUBLIC_SITE_URL aqui.
export const siteUrl = (): string => env.NEXT_PUBLIC_SITE_URL

// Checa Consent.transactionalEmail (default ON quando linha não existe per
// LGPD) e enfileira só se permitido. Falha silente — email é best-effort,
// não bloqueia o caminho crítico (criar pedido, aprovar, etc).
export const queueEmailIfConsented = async (
  prisma: {
    consent: {
      findUnique: (args: { where: { userId: string } }) => Promise<{
        transactionalEmail: boolean
      } | null>
    }
  },
  userId: string,
  payload: EmailPayload,
): Promise<void> => {
  try {
    const consent = await prisma.consent.findUnique({ where: { userId } })
    if (consent && !consent.transactionalEmail) return
    await queueEmail(payload)
  } catch (err) {
    console.error('email enqueue failed:', err)
  }
}

// === Marketing ===
// LGPD: marketing exige opt-in explícito (Consent.marketingEmail default
// false). Diferente de transacional, marketing NÃO envia se a linha de
// consent não existir. Helper genérico — qualquer template de divulgação
// (showcase de catálogo, lançamento, newsletter) passa por aqui.

export const queueMarketingEmail = async (
  prisma: {
    consent: {
      findUnique: (args: { where: { userId: string } }) => Promise<{
        marketingEmail: boolean
      } | null>
    }
  },
  userId: string,
  payload: EmailPayload,
  opts?: { dedupKey?: string },
): Promise<void> => {
  try {
    const consent = await prisma.consent.findUnique({ where: { userId } })
    if (!consent?.marketingEmail) return
    await enqueue(
      SEND_EMAIL_JOB,
      { payload },
      opts?.dedupKey ? { jobId: opts.dedupKey } : undefined,
    )
  } catch (err) {
    console.error('marketing email enqueue failed:', err)
  }
}

// Forma mínima esperada de cada serviço passado pro showcase. Rota cuida
// da query Prisma; jobs.ts fica desacoplado do schema.
interface ShowcaseServiceInput {
  id: string
  name: string
  description: string | null
  pts: number
  category: string | null
}

// Curadoria do showcase: monta os props a partir de listas já consultadas
// pela rota. Retorna null se ambas vazias — sem oferta concreta, não manda
// email de divulgação.
export const buildServicesShowcaseProps = (
  presencial: ShowcaseServiceInput[],
  arquivo: ShowcaseServiceInput[],
  ctx: { siteUrl: string; customerName: string },
): ServicesShowcaseProps | null => {
  if (presencial.length === 0 && arquivo.length === 0) return null

  const mapItem = (s: ShowcaseServiceInput) => ({
    ...s,
    url: `${ctx.siteUrl}/servico/${s.id}`,
  })

  return {
    siteUrl: ctx.siteUrl,
    subject: 'Conhece os serviços TPC · novidades no app',
    customerName: ctx.customerName,
    presencial: presencial.map(mapItem),
    arquivo: arquivo.map(mapItem),
    catalogUrl: `${ctx.siteUrl}/catalogo`,
    preferencesUrl: `${ctx.siteUrl}/perfil`,
  }
}
