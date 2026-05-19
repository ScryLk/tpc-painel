import type { Job } from 'bullmq'

import { defineJob } from '../lib/queue.js'

export interface NotifyWhatsappData {
  userId: string
  purchaseId: string
  phone: string | null
  amountCents: number
  pointsCredited: number
  packageName: string
  [key: string]: unknown
}

export const NOTIFY_WHATSAPP_JOB = 'notify-whatsapp'

const processor = async (job: Job<NotifyWhatsappData>) => {
  // TODO: integrar provider real (Twilio, Z-API, ou WhatsApp Cloud API)
  // assim que TPC definir [TPC-DECISION #4]. Por enquanto loga e marca como
  // ok pra a fila não retentar.
  job.log(`[stub] would send whatsapp to ${job.data.phone ?? '(no phone)'}`)
  return { delivered: false, stub: true }
}

defineJob<NotifyWhatsappData>({ name: NOTIFY_WHATSAPP_JOB, processor })
