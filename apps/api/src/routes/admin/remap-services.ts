import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { Role } from '@tpc/db'
import {
  createRemapServiceSchema,
  updateRemapServiceSchema,
} from '@tpc/lib/validators'

import { ConflictError, NotFoundError } from '../../lib/errors.js'

const idParamsSchema = z.object({ id: z.string().uuid() })

export const adminRemapServicesRoutes: FastifyPluginAsync = async (app) => {
  // GET /admin/remap-services — espelha shape de /admin/services pro UI tab
  // tratar igual exceto pelos campos específicos.
  app.get(
    '/admin/remap-services',
    { preHandler: [app.requireRole(Role.STAFF)] },
    async () => {
      const rows = await app.prisma.remapService.findMany({
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: { _count: { select: { remapOrders: true } } },
      })
      return {
        items: rows.map((s) => ({
          id: s.id,
          slug: s.slug,
          name: s.name,
          description: s.description,
          category: s.category,
          pts: s.pts,
          priceAvulsoCents: s.priceAvulsoCents,
          supports: s.supports,
          isCustom: s.isCustom,
          active: s.active,
          sortOrder: s.sortOrder,
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString(),
          ordersCount: s._count.remapOrders,
        })),
      }
    },
  )

  // GET /admin/remap-services/:id
  app.get(
    '/admin/remap-services/:id',
    { preHandler: [app.requireRole(Role.STAFF)] },
    async (request) => {
      const { id } = idParamsSchema.parse(request.params)
      const s = await app.prisma.remapService.findUnique({ where: { id } })
      if (!s) throw new NotFoundError('RemapService')
      return {
        id: s.id,
        slug: s.slug,
        name: s.name,
        description: s.description,
        category: s.category,
        pts: s.pts,
        priceAvulsoCents: s.priceAvulsoCents,
        supports: s.supports,
        isCustom: s.isCustom,
        active: s.active,
        sortOrder: s.sortOrder,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      }
    },
  )

  // POST /admin/remap-services
  app.post(
    '/admin/remap-services',
    { preHandler: [app.requireRole(Role.STAFF)] },
    async (request, reply) => {
      const body = createRemapServiceSchema.parse(request.body)

      const conflict = await app.prisma.remapService.findUnique({
        where: { slug: body.slug },
        select: { id: true },
      })
      if (conflict) {
        throw new ConflictError(
          'SLUG_TAKEN',
          'Já existe um serviço de arquivo com esse slug',
        )
      }

      const created = await app.prisma.remapService.create({
        data: {
          slug: body.slug,
          name: body.name,
          description: body.description,
          category: body.category,
          pts: body.pts,
          priceAvulsoCents: body.priceAvulsoCents,
          supports: body.supports,
          isCustom: body.isCustom,
          active: body.active,
          sortOrder: body.sortOrder,
        },
      })

      request.log.info(
        {
          audit: 'remap-service-create',
          actorUserId: request.user?.id,
          serviceId: created.id,
          slug: created.slug,
        },
        'admin created remap service',
      )

      void reply.status(201)
      return { id: created.id }
    },
  )

  // PATCH /admin/remap-services/:id
  app.patch(
    '/admin/remap-services/:id',
    { preHandler: [app.requireRole(Role.STAFF)] },
    async (request) => {
      const { id } = idParamsSchema.parse(request.params)
      const body = updateRemapServiceSchema.parse(request.body)

      const existing = await app.prisma.remapService.findUnique({ where: { id } })
      if (!existing) throw new NotFoundError('RemapService')

      const updated = await app.prisma.remapService.update({
        where: { id },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.description !== undefined && { description: body.description }),
          ...(body.category !== undefined && { category: body.category }),
          ...(body.pts !== undefined && { pts: body.pts }),
          ...(body.priceAvulsoCents !== undefined && {
            priceAvulsoCents: body.priceAvulsoCents,
          }),
          ...(body.supports !== undefined && { supports: body.supports }),
          ...(body.isCustom !== undefined && { isCustom: body.isCustom }),
          ...(body.active !== undefined && { active: body.active }),
          ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        },
      })

      request.log.info(
        {
          audit: 'remap-service-update',
          actorUserId: request.user?.id,
          serviceId: id,
          changed: Object.keys(body),
        },
        'admin updated remap service',
      )

      return {
        id: updated.id,
        slug: updated.slug,
        active: updated.active,
        pts: updated.pts,
      }
    },
  )
}
