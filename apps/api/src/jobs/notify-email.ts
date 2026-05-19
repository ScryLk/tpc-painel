import type { Job } from 'bullmq'

import { defineJob } from '../lib/queue.js'

export interface NotifyEmailData {
  userId: string
  purchaseId: string
  email: string
  amountCents: number
  pointsCredited: number
  packageName: string
  cpfCnpj: string | null
  [key: string]: unknown
}

export const NOTIFY_EMAIL_JOB = 'notify-email'

const processor = async (job: Job<NotifyEmailData>) => {
  // TODO: integrar provider real (Resend, AWS SES, etc) e anexar NF quando
  // cpfCnpj estiver preenchido. Stub por enquanto.
  job.log(`[stub] would send email to ${job.data.email}`)
  return { delivered: false, stub: true }
}

defineJob<NotifyEmailData>({ name: NOTIFY_EMAIL_JOB, processor })
