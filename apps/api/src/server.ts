import { fileURLToPath } from 'node:url'

import cors from '@fastify/cors'
import Fastify, { type FastifyInstance } from 'fastify'

// Side-effect: registra o job de email no registry do BullMQ.
import './emails/jobs.js'

import {
  EXECUTE_ACCOUNT_DELETION_JOB,
  EXPIRE_RESERVATION_JOB,
  scheduleCron,
  scheduleRepeatable,
  startNotificationsWorker,
} from './jobs/index.js'
import { env } from './lib/env.js'
import authPlugin from './plugins/auth.js'
import errorPlugin from './plugins/error.js'
import prismaPlugin from './plugins/prisma.js'
import { adminLeadsRoutes } from './routes/admin/leads.js'
import { adminRemapOrdersRoutes } from './routes/admin/remap-orders.js'
import { adminSolicitacoesRoutes } from './routes/admin/solicitacoes.js'
import { adminMarketingCampaignsRoutes } from './routes/admin/marketing-campaigns.js'
import { adminPackagesRoutes } from './routes/admin/packages.js'
import { adminServicesRoutes } from './routes/admin/services.js'
import { adminRemapServicesRoutes } from './routes/admin/remap-services.js'
import { adminUsersRoutes } from './routes/admin/users.js'
import { carRoutes } from './routes/cars.js'
import { checkoutRoutes } from './routes/checkout.js'
import { healthRoutes } from './routes/health.js'
import { leadsRoutes } from './routes/leads.js'
import { lgpdRoutes } from './routes/lgpd.js'
import { meRoutes } from './routes/me.js'
import { notificationsRoutes } from './routes/notifications.js'
import { pacotesRoutes } from './routes/pacotes.js'
import { purchaseRoutes } from './routes/purchases.js'
import { remapOrdersRoutes } from './routes/remap-orders.js'
import { remapServicesRoutes } from './routes/remap-services.js'
import { savedCardsRoutes } from './routes/saved-cards.js'
import { servicosRoutes } from './routes/servicos.js'
import { solicitacoesRoutes } from './routes/solicitacoes.js'
import { webhookRoutes } from './routes/webhooks.js'

export const buildServer = async (): Promise<FastifyInstance> => {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss.l', ignore: 'pid,hostname' } }
          : undefined,
    },
  })

  await app.register(errorPlugin)
  await app.register(cors, {
    origin: env.NODE_ENV === 'production' ? false : true,
    credentials: true,
    // Cache do preflight pelo máximo permitido pelo Chrome (2h). Sem isso,
    // browser dispara OPTIONS antes de cada GET/POST cross-origin, duplicando
    // round-trips. Browsers limitam: Chrome 7200s, Firefox 86400s.
    maxAge: 7200,
  })
  await app.register(prismaPlugin)
  await app.register(authPlugin)

  await app.register(healthRoutes)
  await app.register(meRoutes)
  await app.register(lgpdRoutes)
  await app.register(notificationsRoutes)
  await app.register(carRoutes)
  await app.register(pacotesRoutes)
  await app.register(checkoutRoutes)
  await app.register(purchaseRoutes)
  await app.register(savedCardsRoutes)
  await app.register(servicosRoutes)
  await app.register(solicitacoesRoutes)
  await app.register(adminSolicitacoesRoutes)
  await app.register(remapServicesRoutes)
  await app.register(remapOrdersRoutes)
  await app.register(adminRemapOrdersRoutes)
  await app.register(leadsRoutes)
  await app.register(adminLeadsRoutes)
  await app.register(adminUsersRoutes)
  await app.register(adminServicesRoutes)
  await app.register(adminRemapServicesRoutes)
  await app.register(adminPackagesRoutes)
  await app.register(adminMarketingCampaignsRoutes)
  await app.register(webhookRoutes)

  return app
}

const start = async () => {
  const app = await buildServer()

  // Workers do BullMQ rodam no mesmo processo do Fastify por enquanto. Quando
  // formos pra prod (Railway), separar em service dedicado.
  const worker = startNotificationsWorker()
  app.addHook('onClose', async () => {
    await worker.close()
  })

  // Job recorrente: expira Reservations PENDENTE > 24h. Idempotente, remove
  // schedule anterior antes de adicionar.
  await scheduleRepeatable(EXPIRE_RESERVATION_JOB, 60 * 60 * 1000)

  // LGPD: roda 1x por dia (3h UTC = 0h Brasília no horário padrão) pra
  // executar AccountDeletion vencidas. Cron evita janelas de tráfego.
  await scheduleCron(EXECUTE_ACCOUNT_DELETION_JOB, '0 3 * * *')

  try {
    await app.listen({ host: env.API_HOST, port: env.PORT ?? env.API_PORT })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url)
if (isMainModule) {
  void start()
}
