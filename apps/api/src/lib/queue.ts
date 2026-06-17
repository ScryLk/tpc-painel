import {
  Queue,
  Worker,
  type ConnectionOptions,
  type JobsOptions,
  type Processor,
} from 'bullmq'

import { env } from './env.js'

// Single named queue. Cada job type registra um nome dentro dela e o worker
// dispatcha pelo name. Mantemos uma fila só pra simplificar observability.
export const NOTIFICATIONS_QUEUE = 'notifications'

const connection: ConnectionOptions = {
  // BullMQ aceita uma URL ou um config de IORedis. URL é menos código.
  // maxRetriesPerRequest: null é necessário pro Worker funcionar.
  // enableReadyCheck: false é recomendado pra Redis gerenciado tipo Upstash
  // (evita ping na inicialização que pode falhar em modos serverless).
  url: env.REDIS_URL,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
}

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2_000 },
  removeOnComplete: { age: 24 * 60 * 60, count: 1_000 },
  removeOnFail: { age: 7 * 24 * 60 * 60 },
}

let queueInstance: Queue | null = null

const getQueue = (): Queue => {
  if (!queueInstance) {
    queueInstance = new Queue(NOTIFICATIONS_QUEUE, {
      connection,
      defaultJobOptions,
    })
  }
  return queueInstance
}

// Enfileira um job. Tests mockam essa função via vi.mock no módulo inteiro.
// opts.jobId pode ser usado pra de-dup (BullMQ ignora add com jobId
// existente). Util pra throttling de marketing por exemplo.
export const enqueue = async <T extends Record<string, unknown>>(
  name: string,
  data: T,
  opts?: JobsOptions,
): Promise<void> => {
  await getQueue().add(name, data, opts)
}

// Agenda um job recorrente. Idempotente: remove agendamento anterior com
// mesmo nome antes de adicionar o novo (protege contra duplicação após
// restart do worker).
export const scheduleRepeatable = async (name: string, intervalMs: number): Promise<void> => {
  const queue = getQueue()
  const existing = await queue.getRepeatableJobs()
  for (const job of existing) {
    if (job.name === name) {
      await queue.removeRepeatableByKey(job.key)
    }
  }
  await queue.add(name, {}, { repeat: { every: intervalMs } })
}

// Agenda um job recorrente via padrão cron (UTC). Usado quando precisa
// rodar em horário específico (ex: '0 3 * * *' = 3h da manhã UTC todo dia)
// em vez de intervalo fixo a partir do startup. Idempotente como o
// scheduleRepeatable.
export const scheduleCron = async (name: string, pattern: string): Promise<void> => {
  const queue = getQueue()
  const existing = await queue.getRepeatableJobs()
  for (const job of existing) {
    if (job.name === name) {
      await queue.removeRepeatableByKey(job.key)
    }
  }
  await queue.add(name, {}, { repeat: { pattern } })
}

// Catálogo dos processadores registrados. Workers dispatcham pelo job.name.
interface JobDef<T extends Record<string, unknown>> {
  name: string
  processor: Processor<T>
}

const registry: Record<string, JobDef<Record<string, unknown>>> = {}

export const defineJob = <T extends Record<string, unknown>>(job: JobDef<T>): void => {
  registry[job.name] = job as JobDef<Record<string, unknown>>
}

// Inicia o worker que processa todos jobs registrados. Chamado SÓ pelo main
// (não pelo buildServer, pra testes não conectarem em Redis real).
export const startNotificationsWorker = (): Worker => {
  return new Worker(
    NOTIFICATIONS_QUEUE,
    async (job) => {
      const def = registry[job.name]
      if (!def) throw new Error(`Unknown job name: ${job.name}`)
      return def.processor(job)
    },
    { connection },
  )
}

export const closeQueue = async (): Promise<void> => {
  await queueInstance?.close()
  queueInstance = null
}
