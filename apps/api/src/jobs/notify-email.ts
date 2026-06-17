import { render } from '@react-email/render'
import type { Job } from 'bullmq'
import * as React from 'react'

import { siteUrl } from '../emails/jobs.js'
import { sendEmail } from '../emails/service.js'
import { PaymentApprovedEmail } from '../emails/templates/PaymentApproved.js'
import { defineJob } from '../lib/queue.js'

export interface NotifyEmailData {
  userId: string
  purchaseId: string
  email: string
  customerName?: string
  amountCents: number
  pointsCredited: number
  bonusPoints?: number
  newBalance?: number
  packageName: string
  method?: 'PIX' | 'CREDIT_CARD'
  cpfCnpj: string | null
  [key: string]: unknown
}

export const NOTIFY_EMAIL_JOB = 'notify-email'

const formatBRL = (cents: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    cents / 100,
  )

const processor = async (job: Job<NotifyEmailData>) => {
  const d = job.data
  const html = await render(
    React.createElement(PaymentApprovedEmail, {
      siteUrl: siteUrl(),
      customerName: d.customerName ?? 'cliente',
      packageName: d.packageName,
      pointsCredited: d.pointsCredited,
      bonusPoints: d.bonusPoints ?? 0,
      amountBRL: formatBRL(d.amountCents),
      method: d.method ?? 'PIX',
      newBalance: d.newBalance ?? d.pointsCredited,
      dashboardUrl: `${siteUrl()}/dashboard`,
    }),
  )

  const result = await sendEmail({
    to: d.email,
    subject: `+${d.pointsCredited} pts creditados · TPC Performance`,
    html,
    tags: [
      { name: 'kind', value: 'paymentApproved' },
      { name: 'purchaseId', value: d.purchaseId },
    ],
  })

  return { delivered: !result.dryRun, id: result.id, dryRun: result.dryRun }
}

defineJob<NotifyEmailData>({ name: NOTIFY_EMAIL_JOB, processor })
