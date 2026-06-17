import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { LeadStatus, Role } from '@tpc/db'
import { listLeadsQuerySchema, replyToLeadSchema } from '@tpc/lib/validators'

import { queueEmail } from '../../emails/jobs.js'
import {
  BusinessError,
  NotFoundError,
  UnauthorizedError,
} from '../../lib/errors.js'

const idParamsSchema = z.object({ id: z.string().uuid() })

const MESSAGE_PREVIEW_CHARS = 200

const truncate = (s: string, n: number): string =>
  s.length <= n ? s : `${s.slice(0, n).trimEnd()}…`

export const adminLeadsRoutes: FastifyPluginAsync = async (app) => {
  // GET /admin/leads
  app.get(
    '/admin/leads',
    { preHandler: [app.requireRole(Role.STAFF)] },
    async (request) => {
      const { status, limit, cursor } = listLeadsQuerySchema.parse(request.query)

      const where = status ? { status } : {}

      // Cursor pagination por id. `take: limit + 1` pra detectar se tem
      // próxima página sem segunda query.
      const rows = await app.prisma.lead.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      })

      const hasMore = rows.length > limit
      const items = (hasMore ? rows.slice(0, limit) : rows).map((l) => ({
        id: l.id,
        name: l.name,
        email: l.email,
        phone: l.phone,
        vehicle: l.vehicle,
        year: l.year,
        messagePreview: truncate(l.message, MESSAGE_PREVIEW_CHARS),
        status: l.status,
        createdAt: l.createdAt.toISOString(),
        repliedAt: l.repliedAt?.toISOString() ?? null,
      }))

      // Conta total por status pra renderizar tabs com badge. Apenas 3
      // counts, faz em paralelo.
      const [newCount, repliedCount, archivedCount] = await Promise.all([
        app.prisma.lead.count({ where: { status: LeadStatus.NEW } }),
        app.prisma.lead.count({ where: { status: LeadStatus.REPLIED } }),
        app.prisma.lead.count({ where: { status: LeadStatus.ARCHIVED } }),
      ])

      const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null

      return {
        items,
        nextCursor,
        counts: {
          NEW: newCount,
          REPLIED: repliedCount,
          ARCHIVED: archivedCount,
        },
      }
    },
  )

  // GET /admin/leads/:id
  app.get(
    '/admin/leads/:id',
    { preHandler: [app.requireRole(Role.STAFF)] },
    async (request) => {
      const { id } = idParamsSchema.parse(request.params)

      const lead = await app.prisma.lead.findUnique({
        where: { id },
        include: {
          repliedBy: { select: { id: true, name: true, email: true } },
        },
      })

      if (!lead) throw new NotFoundError('Lead')

      return {
        lead: {
          id: lead.id,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          vehicle: lead.vehicle,
          year: lead.year,
          message: lead.message,
          source: lead.source,
          status: lead.status,
          replyMessage: lead.replyMessage,
          repliedAt: lead.repliedAt?.toISOString() ?? null,
          repliedBy: lead.repliedBy
            ? { name: lead.repliedBy.name, email: lead.repliedBy.email }
            : null,
          createdAt: lead.createdAt.toISOString(),
        },
      }
    },
  )

  // POST /admin/leads/:id/reply
  app.post(
    '/admin/leads/:id/reply',
    { preHandler: [app.requireRole(Role.STAFF)] },
    async (request) => {
      const staff = request.user
      if (!staff) throw new UnauthorizedError()

      const { id } = idParamsSchema.parse(request.params)
      const { message } = replyToLeadSchema.parse(request.body)

      const lead = await app.prisma.lead.findUnique({ where: { id } })
      if (!lead) throw new NotFoundError('Lead')

      if (lead.status !== LeadStatus.NEW) {
        throw new BusinessError(
          'LEAD_ALREADY_REPLIED',
          'Esse lead já foi respondido ou arquivado.',
        )
      }

      const updated = await app.prisma.lead.update({
        where: { id },
        data: {
          status: LeadStatus.REPLIED,
          replyMessage: message,
          repliedAt: new Date(),
          repliedByUserId: staff.id,
        },
      })

      // Best-effort: lead já está REPLIED no DB, se enqueue falhar admin
      // pode reenviar manualmente (V2). Log fica como audit.
      try {
        await queueEmail({
          kind: 'leadResponse',
          to: updated.email,
          props: {
            recipientName: updated.name,
            message,
          },
        })
      } catch (err) {
        request.log.error({ err, leadId: updated.id }, 'failed to enqueue lead response')
      }

      return {
        lead: {
          id: updated.id,
          status: updated.status,
          replyMessage: updated.replyMessage,
          repliedAt: updated.repliedAt?.toISOString() ?? null,
        },
      }
    },
  )

  // POST /admin/leads/:id/archive
  app.post(
    '/admin/leads/:id/archive',
    { preHandler: [app.requireRole(Role.STAFF)] },
    async (request) => {
      const { id } = idParamsSchema.parse(request.params)

      const lead = await app.prisma.lead.findUnique({ where: { id } })
      if (!lead) throw new NotFoundError('Lead')

      if (lead.status !== LeadStatus.NEW) {
        throw new BusinessError(
          'INVALID_TRANSITION',
          'Só leads novos podem ser arquivados.',
        )
      }

      const updated = await app.prisma.lead.update({
        where: { id },
        data: { status: LeadStatus.ARCHIVED },
      })

      return {
        lead: { id: updated.id, status: updated.status },
      }
    },
  )
}
