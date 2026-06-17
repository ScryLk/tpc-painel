import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { Role } from '@tpc/db'
import {
  createPackageSchema,
  updatePackageSchema,
} from '@tpc/lib/validators'

import { BusinessError, ConflictError, NotFoundError } from '../../lib/errors.js'

const idParamsSchema = z.object({ id: z.string().uuid() })

export const adminPackagesRoutes: FastifyPluginAsync = async (app) => {
  // GET /admin/packages — todos (inativos incluídos pra admin gerenciar).
  app.get(
    '/admin/packages',
    { preHandler: [app.requireRole(Role.STAFF)] },
    async () => {
      const rows = await app.prisma.package.findMany({
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: { _count: { select: { purchases: true } } },
      })
      return {
        items: rows.map((p) => ({
          id: p.id,
          tier: p.tier,
          name: p.name,
          points: p.points,
          priceCents: p.priceCents,
          bonusPoints: p.bonusPoints,
          bonusPct: p.bonusPct,
          popular: p.popular,
          active: p.active,
          sortOrder: p.sortOrder,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
          purchasesCount: p._count.purchases,
        })),
      }
    },
  )

  // GET /admin/packages/:id
  app.get(
    '/admin/packages/:id',
    { preHandler: [app.requireRole(Role.STAFF)] },
    async (request) => {
      const { id } = idParamsSchema.parse(request.params)
      const p = await app.prisma.package.findUnique({ where: { id } })
      if (!p) throw new NotFoundError('Package')
      return {
        id: p.id,
        tier: p.tier,
        name: p.name,
        points: p.points,
        priceCents: p.priceCents,
        bonusPoints: p.bonusPoints,
        bonusPct: p.bonusPct,
        popular: p.popular,
        active: p.active,
        sortOrder: p.sortOrder,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      }
    },
  )

  // POST /admin/packages
  app.post(
    '/admin/packages',
    { preHandler: [app.requireRole(Role.STAFF)] },
    async (request, reply) => {
      const body = createPackageSchema.parse(request.body)

      const conflict = await app.prisma.package.findUnique({
        where: { tier: body.tier },
        select: { id: true },
      })
      if (conflict) {
        throw new ConflictError(
          'TIER_TAKEN',
          'Já existe um pacote com esse tier',
        )
      }

      const created = await app.prisma.package.create({
        data: {
          tier: body.tier,
          name: body.name,
          points: body.points,
          priceCents: body.priceCents,
          bonusPoints: body.bonusPoints,
          bonusPct: body.bonusPct,
          popular: body.popular,
          active: body.active,
          sortOrder: body.sortOrder,
        },
      })

      request.log.info(
        {
          audit: 'package-create',
          actorUserId: request.user?.id,
          packageId: created.id,
          tier: created.tier,
        },
        'admin created package',
      )

      void reply.status(201)
      return { id: created.id }
    },
  )

  // PATCH /admin/packages/:id
  app.patch(
    '/admin/packages/:id',
    { preHandler: [app.requireRole(Role.STAFF)] },
    async (request) => {
      const { id } = idParamsSchema.parse(request.params)
      const body = updatePackageSchema.parse(request.body)

      const existing = await app.prisma.package.findUnique({ where: { id } })
      if (!existing) throw new NotFoundError('Package')

      const updated = await app.prisma.package.update({
        where: { id },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.points !== undefined && { points: body.points }),
          ...(body.priceCents !== undefined && { priceCents: body.priceCents }),
          ...(body.bonusPoints !== undefined && { bonusPoints: body.bonusPoints }),
          ...(body.bonusPct !== undefined && { bonusPct: body.bonusPct }),
          ...(body.popular !== undefined && { popular: body.popular }),
          ...(body.active !== undefined && { active: body.active }),
          ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        },
      })

      request.log.info(
        {
          audit: 'package-update',
          actorUserId: request.user?.id,
          packageId: id,
          changed: Object.keys(body),
        },
        'admin updated package',
      )

      return {
        id: updated.id,
        tier: updated.tier,
        active: updated.active,
        points: updated.points,
        priceCents: updated.priceCents,
      }
    },
  )

  // DELETE /admin/packages/:id
  // Hard delete só permitido se NENHUMA Purchase referencia o pacote. Manter
  // a referência é crítico pro histórico do cliente e auditoria fiscal (Lei
  // 8.846/94 manda 5 anos). Pra pacote com compras, admin tem que usar
  // `active=false` (já existente) — não deletar.
  app.delete(
    '/admin/packages/:id',
    { preHandler: [app.requireRole(Role.STAFF)] },
    async (request) => {
      const { id } = idParamsSchema.parse(request.params)

      const existing = await app.prisma.package.findUnique({
        where: { id },
        include: { _count: { select: { purchases: true } } },
      })
      if (!existing) throw new NotFoundError('Package')

      if (existing._count.purchases > 0) {
        throw new BusinessError(
          'PACKAGE_HAS_PURCHASES',
          `Pacote tem ${existing._count.purchases} compra(s) associada(s). Desative em vez de excluir (active=false)`,
        )
      }

      await app.prisma.package.delete({ where: { id } })

      request.log.warn(
        {
          audit: 'package-delete',
          actorUserId: request.user?.id,
          packageId: id,
          tier: existing.tier,
        },
        'admin deleted package',
      )

      return { ok: true }
    },
  )
}
