import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { NotFoundError, UnauthorizedError } from '../lib/errors.js'

const idParamsSchema = z.object({ id: z.string().uuid() })

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  unreadOnly: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((v) => (typeof v === 'boolean' ? v : v === 'true'))
    .optional(),
})

const shapeNotification = (n: {
  id: string
  userId: string
  kind: string
  title: string
  body: string | null
  link: string | null
  source: string | null
  readAt: Date | null
  createdAt: Date
}) => ({
  id: n.id,
  kind: n.kind,
  title: n.title,
  body: n.body,
  link: n.link,
  source: n.source,
  readAt: n.readAt?.toISOString() ?? null,
  createdAt: n.createdAt.toISOString(),
})

export const notificationsRoutes: FastifyPluginAsync = async (app) => {
  // GET /me/notifications — lista do user logado, mais recente primeiro.
  app.get(
    '/me/notifications',
    { preHandler: [app.requireAuth] },
    async (request) => {
      const user = request.user
      if (!user) throw new UnauthorizedError()
      const { limit, unreadOnly } = listQuerySchema.parse(request.query)

      const items = await app.prisma.notification.findMany({
        where: {
          userId: user.id,
          ...(unreadOnly ? { readAt: null } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })

      const unreadCount = await app.prisma.notification.count({
        where: { userId: user.id, readAt: null },
      })

      return {
        items: items.map(shapeNotification),
        unreadCount,
      }
    },
  )

  // POST /me/notifications/:id/read — marca uma como lida (idempotente).
  app.post(
    '/me/notifications/:id/read',
    { preHandler: [app.requireAuth] },
    async (request) => {
      const user = request.user
      if (!user) throw new UnauthorizedError()
      const { id } = idParamsSchema.parse(request.params)

      const found = await app.prisma.notification.findFirst({
        where: { id, userId: user.id },
        select: { id: true, readAt: true },
      })
      if (!found) throw new NotFoundError('Notification')

      if (!found.readAt) {
        await app.prisma.notification.update({
          where: { id },
          data: { readAt: new Date() },
        })
      }
      return { ok: true }
    },
  )

  // POST /me/notifications/read-all — marca todas como lidas. Útil pro
  // "Limpar tudo" no dropdown do sino.
  app.post(
    '/me/notifications/read-all',
    { preHandler: [app.requireAuth] },
    async (request) => {
      const user = request.user
      if (!user) throw new UnauthorizedError()

      const res = await app.prisma.notification.updateMany({
        where: { userId: user.id, readAt: null },
        data: { readAt: new Date() },
      })
      return { ok: true, marked: res.count }
    },
  )

  // DELETE /me/notifications/:id — hard delete (notif é volátil, sem audit).
  app.delete(
    '/me/notifications/:id',
    { preHandler: [app.requireAuth] },
    async (request) => {
      const user = request.user
      if (!user) throw new UnauthorizedError()
      const { id } = idParamsSchema.parse(request.params)

      const res = await app.prisma.notification.deleteMany({
        where: { id, userId: user.id },
      })
      if (res.count === 0) throw new NotFoundError('Notification')
      return { ok: true }
    },
  )

  // POST /dev/test-email — DEV ONLY. Enfileira um email piloto pro user
  // logado pra confirmar wiring Resend + template. Bloqueia em prod.
  app.post(
    '/dev/test-email',
    { preHandler: [app.requireAuth] },
    async (request) => {
      if (process.env.NODE_ENV === 'production') {
        return { ok: false, reason: 'dev only' }
      }
      const user = request.user
      if (!user) throw new UnauthorizedError()

      // Lazy import pra evitar carregar React/templates no startup só por causa
      // do dev endpoint.
      const { queueEmail, siteUrl } = await import('../emails/jobs.js')
      await queueEmail({
        kind: 'orderCreated',
        to: user.email,
        props: {
          siteUrl: siteUrl(),
          customerName: user.name,
          protocol: 'TEST-' + Date.now().toString().slice(-5),
          serviceName: 'Stage 1 Turbo (teste)',
          isCustomQuote: false,
          pointsReserved: 500,
          orderUrl: `${siteUrl()}/pedidos`,
        },
      })
      return { ok: true, sentTo: user.email }
    },
  )

  // POST /dev/test-marketing — DEV ONLY. Dispara o showcase de catálogo pro
  // user logado pra preview. Ignora Consent.marketingEmail (em prod, o
  // helper queueMarketingEmail respeita opt-in). Bloqueia em prod.
  app.post(
    '/dev/test-marketing',
    { preHandler: [app.requireAuth] },
    async (request) => {
      if (process.env.NODE_ENV === 'production') {
        return { ok: false, reason: 'dev only' }
      }
      const user = request.user
      if (!user) throw new UnauthorizedError()

      const { buildServicesShowcaseProps, queueEmail, siteUrl } = await import(
        '../emails/jobs.js'
      )

      const [presencial, arquivo] = await Promise.all([
        app.prisma.service.findMany({
          where: { active: true, popular: true },
          orderBy: [{ sortOrder: 'asc' }],
          take: 3,
          select: { id: true, name: true, description: true, pts: true, category: true },
        }),
        app.prisma.remapService.findMany({
          where: { active: true, isCustom: false },
          orderBy: [{ sortOrder: 'asc' }],
          take: 3,
          select: { id: true, name: true, description: true, pts: true, category: true },
        }),
      ])

      const props = buildServicesShowcaseProps(presencial, arquivo, {
        siteUrl: siteUrl(),
        customerName: user.name,
      })
      if (!props) {
        return { ok: false, reason: 'no services in catalog' }
      }
      await queueEmail({ kind: 'servicesShowcase', to: user.email, props })
      return {
        ok: true,
        sentTo: user.email,
        items: {
          presencial: props.presencial.length,
          arquivo: props.arquivo.length,
        },
      }
    },
  )
}
