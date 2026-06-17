import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { Role, ServiceCategory } from '@tpc/db'
import {
  createServiceSchema,
  updateServiceSchema,
} from '@tpc/lib/validators'

import { ConflictError, NotFoundError } from '../../lib/errors.js'

const idParamsSchema = z.object({ id: z.string().uuid() })

export const adminServicesRoutes: FastifyPluginAsync = async (app) => {
  // GET /admin/services
  // Sem paginação: catálogo é pequeno. Inclui inativos por padrão pra admin
  // ver tudo. _count.solicitacoes ajuda admin a decidir se pode desativar
  // sem quebrar pedidos em aberto.
  app.get(
    '/admin/services',
    { preHandler: [app.requireRole(Role.STAFF)] },
    async () => {
      const rows = await app.prisma.service.findMany({
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: { _count: { select: { solicitacoes: true } } },
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
          motorTypes: s.motorTypes,
          durationDays: s.durationDays,
          popular: s.popular,
          active: s.active,
          sortOrder: s.sortOrder,
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString(),
          solicitacoesCount: s._count.solicitacoes,
        })),
      }
    },
  )

  // GET /admin/services/:id
  app.get(
    '/admin/services/:id',
    { preHandler: [app.requireRole(Role.STAFF)] },
    async (request) => {
      const { id } = idParamsSchema.parse(request.params)
      const s = await app.prisma.service.findUnique({ where: { id } })
      if (!s) throw new NotFoundError('Service')
      return {
        id: s.id,
        slug: s.slug,
        name: s.name,
        description: s.description,
        category: s.category,
        pts: s.pts,
        priceAvulsoCents: s.priceAvulsoCents,
        motorTypes: s.motorTypes,
        durationDays: s.durationDays,
        popular: s.popular,
        active: s.active,
        sortOrder: s.sortOrder,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      }
    },
  )

  // POST /admin/services
  app.post(
    '/admin/services',
    { preHandler: [app.requireRole(Role.STAFF)] },
    async (request, reply) => {
      const body = createServiceSchema.parse(request.body)

      // Pre-valida slug uniqueness pra dar mensagem amigável.
      const conflict = await app.prisma.service.findUnique({
        where: { slug: body.slug },
        select: { id: true },
      })
      if (conflict) {
        throw new ConflictError(
          'SLUG_TAKEN',
          'Já existe um serviço com esse slug',
        )
      }

      const created = await app.prisma.service.create({
        data: {
          slug: body.slug,
          name: body.name,
          description: body.description,
          category: body.category as ServiceCategory,
          pts: body.pts,
          priceAvulsoCents: body.priceAvulsoCents,
          motorTypes: body.motorTypes,
          durationDays: body.durationDays,
          popular: body.popular,
          active: body.active,
          sortOrder: body.sortOrder,
        },
      })

      request.log.info(
        {
          audit: 'service-create',
          actorUserId: request.user?.id,
          serviceId: created.id,
          slug: created.slug,
        },
        'admin created service',
      )

      void reply.status(201)
      return { id: created.id }
    },
  )

  // PATCH /admin/services/:id
  app.patch(
    '/admin/services/:id',
    { preHandler: [app.requireRole(Role.STAFF)] },
    async (request) => {
      const { id } = idParamsSchema.parse(request.params)
      const body = updateServiceSchema.parse(request.body)

      const existing = await app.prisma.service.findUnique({ where: { id } })
      if (!existing) throw new NotFoundError('Service')

      const updated = await app.prisma.service.update({
        where: { id },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.description !== undefined && { description: body.description }),
          ...(body.category !== undefined && {
            category: body.category as ServiceCategory,
          }),
          ...(body.pts !== undefined && { pts: body.pts }),
          ...(body.priceAvulsoCents !== undefined && {
            priceAvulsoCents: body.priceAvulsoCents,
          }),
          ...(body.motorTypes !== undefined && { motorTypes: body.motorTypes }),
          ...(body.durationDays !== undefined && {
            durationDays: body.durationDays,
          }),
          ...(body.popular !== undefined && { popular: body.popular }),
          ...(body.active !== undefined && { active: body.active }),
          ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        },
      })

      request.log.info(
        {
          audit: 'service-update',
          actorUserId: request.user?.id,
          serviceId: id,
          changed: Object.keys(body),
        },
        'admin updated service',
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
