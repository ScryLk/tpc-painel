import type { Job } from 'bullmq'

import { prisma } from '@tpc/db'

import { queueEmail, siteUrl } from '../emails/jobs.js'
import { defineJob } from '../lib/queue.js'

export const SEND_MARKETING_CAMPAIGN_JOB = 'send-marketing-campaign'

export interface SendMarketingCampaignData extends Record<string, unknown> {
  campaignId: string
}

interface ProcessResult {
  campaignId: string
  enqueued: number
  alreadyDelivered: number
  status: 'SENT' | 'FAILED'
}

// Spacing entre enfileiramentos. Resend free tier aceita 10 req/s. Mantemos
// 150ms entre cada enqueue pra ficar bem abaixo do limite (~6.7 req/s).
const ENQUEUE_INTERVAL_MS = 150

// Processor de fan-out de campanha de marketing:
// 1. Marca campanha como SENDING
// 2. Lê audiência (User com Consent.marketingEmail=true)
// 3. Cria Delivery row pra cada um (skip se já existe — idempotente)
// 4. Enfileira email-job pra cada um, espaçando pra respeitar rate-limit
// 5. Marca campanha como SENT (ou FAILED se algo fatal antes do fan-out)
//
// Note: status SENT aqui significa "todos os jobs foram enfileirados".
// Os jobs individuais marcam cada Delivery como SENT/FAILED via SEND_EMAIL_JOB
// processor. Status de entrega individual é Phase 2 (webhooks Resend).
export const sendMarketingCampaignProcessor = async (
  job: Pick<Job, 'log'>,
  data: SendMarketingCampaignData,
): Promise<ProcessResult> => {
  const { campaignId } = data

  const campaign = await prisma.marketingCampaign.findUnique({
    where: { id: campaignId },
  })
  if (!campaign) {
    throw new Error(`Campaign ${campaignId} not found`)
  }
  if (campaign.status !== 'DRAFT' && campaign.status !== 'SENDING') {
    throw new Error(
      `Campaign ${campaignId} is in status ${campaign.status}, can't send`,
    )
  }

  // Marca SENDING antes de começar pra evitar dupla execução acidental
  // (idempotência via guard no status).
  if (campaign.status === 'DRAFT') {
    await prisma.marketingCampaign.update({
      where: { id: campaignId },
      data: { status: 'SENDING', sentAt: new Date() },
    })
  }

  // Audiência: usuários ativos com Consent.marketingEmail=true.
  // pendingDeletion/deletedAt excluídos.
  const recipients = await prisma.user.findMany({
    where: {
      deletedAt: null,
      pendingDeletion: false,
      consent: { marketingEmail: true },
    },
    select: { id: true, email: true, name: true },
  })

  job.log(
    `campaign ${campaignId}: ${recipients.length} elegíveis (opt-in + ativos)`,
  )

  let enqueued = 0
  let alreadyDelivered = 0

  for (const user of recipients) {
    // Cria Delivery se ainda não existir (idempotente via unique constraint
    // [campaignId, userId]). Se já existe e foi enviada, pula.
    const existing = await prisma.marketingCampaignDelivery.findUnique({
      where: { campaignId_userId: { campaignId, userId: user.id } },
    })

    if (existing && existing.status !== 'QUEUED' && existing.status !== 'FAILED') {
      alreadyDelivered++
      continue
    }

    const delivery =
      existing ??
      (await prisma.marketingCampaignDelivery.create({
        data: { campaignId, userId: user.id, status: 'QUEUED' },
      }))

    await queueEmail({
      kind: 'marketingCustom',
      to: user.email,
      subject: campaign.subject,
      props: {
        siteUrl: siteUrl(),
        customerName: user.name,
        title: campaign.title,
        body: campaign.body,
        ctaText: campaign.ctaText,
        ctaUrl: campaign.ctaUrl,
        isTest: false,
      },
      campaignId,
      deliveryId: delivery.id,
      tags: [{ name: 'campaignId', value: campaignId }],
    })

    enqueued++
    // Throttle entre enqueues pro rate limit do Resend não estourar quando
    // os workers processarem em sequência rápida.
    if (enqueued < recipients.length) {
      await new Promise((r) => setTimeout(r, ENQUEUE_INTERVAL_MS))
    }
  }

  // Atualiza estimatedReach (snapshot do que de fato enfileiramos) e marca
  // SENT. Status individual fica nos Delivery rows.
  await prisma.marketingCampaign.update({
    where: { id: campaignId },
    data: { status: 'SENT', estimatedReach: enqueued + alreadyDelivered },
  })

  return {
    campaignId,
    enqueued,
    alreadyDelivered,
    status: 'SENT',
  }
}

defineJob<SendMarketingCampaignData>({
  name: SEND_MARKETING_CAMPAIGN_JOB,
  processor: async (job) => sendMarketingCampaignProcessor(job, job.data),
})
