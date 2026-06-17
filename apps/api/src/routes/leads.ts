import type { FastifyPluginAsync } from 'fastify'

import { createLeadSchema } from '@tpc/lib/validators'

import { queueEmail, siteUrl } from '../emails/jobs.js'
import { env } from '../lib/env.js'
import { UnauthorizedError } from '../lib/errors.js'

const LEAD_TOKEN_HEADER = 'x-lead-token'
const IDEMPOTENCY_HEADER = 'idempotency-key'
const IDEMPOTENCY_WINDOW_HOURS = 24

export const leadsRoutes: FastifyPluginAsync = async (app) => {
  // POST /leads (público)
  // Endpoint da landing externa. Token compartilhado + Zod validam payload.
  app.post('/leads', async (request, reply) => {
    // Gate por token compartilhado. Em dev sem LEADS_INGEST_TOKEN configurado,
    // bloqueia tudo (fail-closed). Quem testa local seta o token no .env.
    const expected = env.LEADS_INGEST_TOKEN
    const received = request.headers[LEAD_TOKEN_HEADER]
    if (!expected || received !== expected) {
      throw new UnauthorizedError('Invalid lead token')
    }

    const body = createLeadSchema.parse(request.body)

    // Strings vazias normalizadas pra null antes de gravar (Zod só faz
    // .or(z.literal('')) pra aceitar strings vazias da landing).
    const phone = body.phone || null
    const vehicle = body.vehicle || null
    const year = body.year || null

    const idempotencyKey =
      typeof request.headers[IDEMPOTENCY_HEADER] === 'string'
        ? (request.headers[IDEMPOTENCY_HEADER] as string)
        : null

    // Idempotência: reenvio do mesmo form (network retry, double click)
    // retorna o lead anterior. Janela de 24h, depois trata como novo lead.
    if (idempotencyKey) {
      const existing = await app.prisma.lead.findUnique({
        where: { idempotencyKey },
      })
      if (existing) {
        const ageMs = Date.now() - existing.createdAt.getTime()
        if (ageMs < IDEMPOTENCY_WINDOW_HOURS * 60 * 60 * 1000) {
          reply.status(200)
          return { ok: true, leadId: existing.id, idempotent: true }
        }
      }
    }

    const ipAddress = request.ip ?? null
    const userAgent =
      typeof request.headers['user-agent'] === 'string'
        ? request.headers['user-agent']
        : null

    const lead = await app.prisma.lead.create({
      data: {
        name: body.name,
        email: body.email,
        phone,
        vehicle,
        year,
        message: body.message,
        ipAddress,
        userAgent,
        idempotencyKey,
      },
    })

    // Enfileira notificação pro admin. Best-effort: se enqueue falhar, lead
    // já está salvo, admin pode ver no painel mesmo sem o email.
    if (env.ADMIN_EMAIL) {
      try {
        await queueEmail({
          kind: 'leadAdminNotification',
          to: env.ADMIN_EMAIL,
          props: {
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            vehicle: lead.vehicle,
            year: lead.year,
            message: lead.message,
            adminUrl: `${siteUrl().replace(/\/$/, '')}/admin/leads/${lead.id}`,
          },
        })
      } catch (err) {
        request.log.error({ err, leadId: lead.id }, 'failed to enqueue admin notification')
      }
    } else {
      request.log.warn(
        { leadId: lead.id },
        'ADMIN_EMAIL not configured; skipping notification',
      )
    }

    reply.status(201)
    return { ok: true, leadId: lead.id }
  })
}
