import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { Role } from '@tpc/db'
import {
  createMarketingCampaignSchema,
  updateMarketingCampaignSchema,
} from '@tpc/lib/validators'

import { queueEmail, siteUrl } from '../../emails/jobs.js'
import { SEND_MARKETING_CAMPAIGN_JOB } from '../../jobs/index.js'
import { enqueue } from '../../lib/queue.js'
import {
  BusinessError,
  NotFoundError,
  UnauthorizedError,
} from '../../lib/errors.js'

const idParamsSchema = z.object({ id: z.string().uuid() })

export const adminMarketingCampaignsRoutes: FastifyPluginAsync = async (
  app,
) => {
  // GET /admin/marketing-campaigns — lista (sem paginação no MVP, ordena
  // por createdAt desc). Inclui counts de delivery por status pra dashboard.
  app.get(
    '/admin/marketing-campaigns',
    { preHandler: [app.requireRole(Role.STAFF)] },
    async () => {
      const rows = await app.prisma.marketingCampaign.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { deliveries: true } },
          createdBy: { select: { name: true, email: true } },
        },
      })
      return {
        items: rows.map((c) => ({
          id: c.id,
          subject: c.subject,
          title: c.title,
          status: c.status,
          ctaText: c.ctaText,
          ctaUrl: c.ctaUrl,
          estimatedReach: c.estimatedReach,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
          sentAt: c.sentAt?.toISOString() ?? null,
          createdBy: { name: c.createdBy.name, email: c.createdBy.email },
          deliveriesCount: c._count.deliveries,
        })),
      }
    },
  )

  // GET /admin/marketing-campaigns/:id — detalhe + breakdown de status dos
  // deliveries. Útil pra ver quantos foram SENT vs FAILED após envio.
  app.get(
    '/admin/marketing-campaigns/:id',
    { preHandler: [app.requireRole(Role.STAFF)] },
    async (request) => {
      const { id } = idParamsSchema.parse(request.params)

      const campaign = await app.prisma.marketingCampaign.findUnique({
        where: { id },
        include: {
          createdBy: { select: { name: true, email: true } },
        },
      })
      if (!campaign) throw new NotFoundError('MarketingCampaign')

      // Agrupa deliveries por status pra dashboard.
      const byStatus = await app.prisma.marketingCampaignDelivery.groupBy({
        by: ['status'],
        where: { campaignId: id },
        _count: { _all: true },
      })
      const stats: Record<string, number> = {}
      for (const row of byStatus) {
        stats[row.status] = row._count._all
      }

      return {
        id: campaign.id,
        subject: campaign.subject,
        title: campaign.title,
        body: campaign.body,
        ctaText: campaign.ctaText,
        ctaUrl: campaign.ctaUrl,
        status: campaign.status,
        estimatedReach: campaign.estimatedReach,
        createdAt: campaign.createdAt.toISOString(),
        updatedAt: campaign.updatedAt.toISOString(),
        sentAt: campaign.sentAt?.toISOString() ?? null,
        createdBy: {
          name: campaign.createdBy.name,
          email: campaign.createdBy.email,
        },
        stats,
      }
    },
  )

  // POST /admin/marketing-campaigns — sempre cria como DRAFT.
  app.post(
    '/admin/marketing-campaigns',
    { preHandler: [app.requireRole(Role.STAFF)] },
    async (request, reply) => {
      const actor = request.user
      if (!actor) throw new UnauthorizedError()

      const body = createMarketingCampaignSchema.parse(request.body)

      const created = await app.prisma.marketingCampaign.create({
        data: {
          subject: body.subject,
          title: body.title,
          body: body.body,
          ctaText: body.ctaText ?? null,
          ctaUrl: body.ctaUrl ?? null,
          status: 'DRAFT',
          createdById: actor.id,
        },
      })

      request.log.info(
        {
          audit: 'marketing-campaign-create',
          actorUserId: actor.id,
          campaignId: created.id,
        },
        'admin created marketing campaign',
      )

      void reply.status(201)
      return { id: created.id }
    },
  )

  // PATCH /admin/marketing-campaigns/:id — só DRAFT. Bloqueia se SENDING/SENT.
  app.patch(
    '/admin/marketing-campaigns/:id',
    { preHandler: [app.requireRole(Role.STAFF)] },
    async (request) => {
      const { id } = idParamsSchema.parse(request.params)
      const body = updateMarketingCampaignSchema.parse(request.body)

      const existing = await app.prisma.marketingCampaign.findUnique({
        where: { id },
      })
      if (!existing) throw new NotFoundError('MarketingCampaign')
      if (existing.status !== 'DRAFT') {
        throw new BusinessError(
          'CAMPAIGN_NOT_EDITABLE',
          `Campanha em status ${existing.status} não pode ser editada`,
        )
      }

      const updated = await app.prisma.marketingCampaign.update({
        where: { id },
        data: {
          ...(body.subject !== undefined && { subject: body.subject }),
          ...(body.title !== undefined && { title: body.title }),
          ...(body.body !== undefined && { body: body.body }),
          ...(body.ctaText !== undefined && { ctaText: body.ctaText }),
          ...(body.ctaUrl !== undefined && { ctaUrl: body.ctaUrl }),
        },
      })

      request.log.info(
        {
          audit: 'marketing-campaign-update',
          actorUserId: request.user?.id,
          campaignId: id,
          changed: Object.keys(body),
        },
        'admin updated marketing campaign',
      )

      return { id: updated.id, status: updated.status }
    },
  )

  // DELETE /admin/marketing-campaigns/:id — só DRAFT. Manter campanhas
  // enviadas pra audit. Cascata apaga Delivery rows (Prisma onDelete: Cascade
  // no schema), o que pra DRAFT não tem nenhum.
  app.delete(
    '/admin/marketing-campaigns/:id',
    { preHandler: [app.requireRole(Role.STAFF)] },
    async (request) => {
      const { id } = idParamsSchema.parse(request.params)

      const existing = await app.prisma.marketingCampaign.findUnique({
        where: { id },
        select: { id: true, status: true },
      })
      if (!existing) throw new NotFoundError('MarketingCampaign')
      if (existing.status !== 'DRAFT') {
        throw new BusinessError(
          'CAMPAIGN_NOT_DELETABLE',
          `Campanha em status ${existing.status} não pode ser excluída — mantenha pra audit`,
        )
      }

      await app.prisma.marketingCampaign.delete({ where: { id } })

      request.log.warn(
        {
          audit: 'marketing-campaign-delete',
          actorUserId: request.user?.id,
          campaignId: id,
        },
        'admin deleted draft marketing campaign',
      )

      return { ok: true }
    },
  )

  // GET /admin/marketing-campaigns/:id/audience-count — estimativa de
  // destinatários elegíveis no momento. Útil pro UI mostrar "vai pra N
  // pessoas" antes do envio. NÃO usa filtros (MVP só "todos opt-in").
  app.get(
    '/admin/marketing-campaigns/:id/audience-count',
    { preHandler: [app.requireRole(Role.STAFF)] },
    async (request) => {
      const { id } = idParamsSchema.parse(request.params)

      const exists = await app.prisma.marketingCampaign.findUnique({
        where: { id },
        select: { id: true },
      })
      if (!exists) throw new NotFoundError('MarketingCampaign')

      const count = await app.prisma.user.count({
        where: {
          deletedAt: null,
          pendingDeletion: false,
          consent: { marketingEmail: true },
        },
      })

      return { count }
    },
  )

  // POST /admin/marketing-campaigns/:id/test-send — envia preview pro admin
  // logado. Bypassa consent check (é só pra revisão interna). Não cria
  // Delivery row — é só pra preview na inbox.
  app.post(
    '/admin/marketing-campaigns/:id/test-send',
    { preHandler: [app.requireRole(Role.STAFF)] },
    async (request) => {
      const actor = request.user
      if (!actor) throw new UnauthorizedError()
      const { id } = idParamsSchema.parse(request.params)

      const campaign = await app.prisma.marketingCampaign.findUnique({
        where: { id },
      })
      if (!campaign) throw new NotFoundError('MarketingCampaign')

      await queueEmail({
        kind: 'marketingCustom',
        to: actor.email,
        subject: campaign.subject,
        props: {
          siteUrl: siteUrl(),
          customerName: actor.name,
          title: campaign.title,
          body: campaign.body,
          ctaText: campaign.ctaText,
          ctaUrl: campaign.ctaUrl,
          isTest: true,
        },
        campaignId: id,
        tags: [
          { name: 'campaignId', value: id },
          { name: 'mode', value: 'test' },
        ],
      })

      request.log.info(
        {
          audit: 'marketing-campaign-test-send',
          actorUserId: actor.id,
          campaignId: id,
        },
        'admin test-sent marketing campaign',
      )

      return { ok: true, sentTo: actor.email }
    },
  )

  // POST /admin/marketing-campaigns/:id/send — fan-out real. Enfileira o job
  // SEND_MARKETING_CAMPAIGN, que faz audience-fetch + delivery rows +
  // batched email enqueue. Retorna 202 imediato; status muda pra SENDING.
  app.post(
    '/admin/marketing-campaigns/:id/send',
    { preHandler: [app.requireRole(Role.STAFF)] },
    async (request, reply) => {
      const actor = request.user
      if (!actor) throw new UnauthorizedError()
      const { id } = idParamsSchema.parse(request.params)

      const campaign = await app.prisma.marketingCampaign.findUnique({
        where: { id },
      })
      if (!campaign) throw new NotFoundError('MarketingCampaign')
      if (campaign.status !== 'DRAFT') {
        throw new BusinessError(
          'CAMPAIGN_NOT_SENDABLE',
          `Campanha em status ${campaign.status} não pode ser enviada novamente`,
        )
      }

      // Enfileira o job; ele que muda status pra SENDING e depois SENT.
      // Retornamos 202 (Accepted) pra deixar claro que é assíncrono.
      await enqueue(SEND_MARKETING_CAMPAIGN_JOB, { campaignId: id })

      request.log.warn(
        {
          audit: 'marketing-campaign-send',
          actorUserId: actor.id,
          campaignId: id,
        },
        'admin queued marketing campaign send',
      )

      void reply.status(202)
      return { ok: true, queued: true }
    },
  )
}
