import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import type { Prisma } from '@tpc/db'
import { createCarSchema, updateCarSchema } from '@tpc/lib/validators'

import {
  BusinessError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../lib/errors.js'

const MAX_CARS_PER_USER = 3

const idParamsSchema = z.object({ id: z.string().uuid() })

interface ActiveOrderRef {
  type: 'remap' | 'presencial'
  id: string
  label: string
}

const PRESENCIAL_ACTIVE_STATUSES = ['PENDENTE', 'CONFIRMADA', 'EM_EXEC'] as const
const REMAP_ACTIVE_STATUSES = [
  'AWAITING_QUOTE',
  'QUOTE_SENT',
  'ANALYZING',
  'MAPPING',
  'AWAITING_REVIEW',
] as const

const statusLabels: Record<string, string> = {
  PENDENTE: 'aguardando confirmação',
  CONFIRMADA: 'agendado',
  EM_EXEC: 'em serviço',
  AWAITING_QUOTE: 'aguardando orçamento',
  QUOTE_SENT: 'orçamento recebido',
  ANALYZING: 'em análise',
  MAPPING: 'em mapeamento',
  AWAITING_REVIEW: 'aguardando aprovação',
}

export const carRoutes: FastifyPluginAsync = async (app) => {
  // GET /me/cars
  app.get('/me/cars', { preHandler: [app.requireAuth] }, async (request) => {
    const user = request.user
    if (!user) throw new UnauthorizedError()

    const cars = await app.prisma.car.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
    })
    const carIds = cars.map((c) => c.id)

    // Busca pedidos ativos em paralelo, agrupados por carId. Evita N+1.
    const [solicitacoes, remapOrders] = await Promise.all([
      app.prisma.solicitacao.findMany({
        where: {
          carId: { in: carIds },
          status: { in: [...PRESENCIAL_ACTIVE_STATUSES] },
        },
        select: {
          id: true,
          carId: true,
          status: true,
          service: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      app.prisma.remapOrder.findMany({
        where: {
          carId: { in: carIds },
          status: { in: [...REMAP_ACTIVE_STATUSES] },
        },
        select: {
          id: true,
          carId: true,
          status: true,
          remapService: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const byCar = new Map<string, { active: ActiveOrderRef | null; extras: number }>()
    for (const id of carIds) byCar.set(id, { active: null, extras: 0 })

    for (const s of solicitacoes) {
      const bucket = byCar.get(s.carId)
      if (!bucket) continue
      const label = `${s.service.name} · ${statusLabels[s.status] ?? s.status.toLowerCase()}`
      if (!bucket.active) {
        bucket.active = { type: 'presencial', id: s.id, label }
      } else {
        bucket.extras += 1
      }
    }

    for (const r of remapOrders) {
      if (!r.carId) continue
      const bucket = byCar.get(r.carId)
      if (!bucket) continue
      const label = `${r.remapService?.name ?? 'Pedido por arquivo'} · ${statusLabels[r.status] ?? r.status.toLowerCase()}`
      if (!bucket.active) {
        bucket.active = { type: 'remap', id: r.id, label }
      } else {
        bucket.extras += 1
      }
    }

    const items = cars.map((c) => {
      const orders = byCar.get(c.id) ?? { active: null, extras: 0 }
      return {
        id: c.id,
        brand: c.brand,
        model: c.model,
        year: c.year,
        motorType: c.motorType,
        plate: c.plate,
        color: c.color,
        isActive: c.isActive,
        mapState: c.mapState,
        createdAt: c.createdAt.toISOString(),
        activeOrder: orders.active,
        extraOrders: orders.extras,
        warranty: null, // TODO: derivar de Transaction DEBIT do último Stage (Sprint 2 Solicitar)
      }
    })

    return {
      cars: items,
      meta: { count: items.length, limit: MAX_CARS_PER_USER },
    }
  })

  // POST /me/cars
  app.post('/me/cars', { preHandler: [app.requireAuth] }, async (request) => {
    const user = request.user
    if (!user) throw new UnauthorizedError()

    const body = createCarSchema.parse(request.body)

    const created = await app.prisma.$transaction(async (tx) => {
      const activeCount = await tx.car.count({
        where: { userId: user.id, deletedAt: null },
      })
      if (activeCount >= MAX_CARS_PER_USER) {
        throw new BusinessError(
          'GARAGE_LIMIT_REACHED',
          `Máximo de ${MAX_CARS_PER_USER} carros por conta. Remove um pra adicionar outro.`,
        )
      }

      // Placa única no escopo do user, incluindo soft-deleted. Constraint do
      // banco (@@unique [userId, plate]) bloqueia, mas chamamos findFirst antes
      // pra dar erro de domínio em vez de P2002 cru.
      const existing = await tx.car.findFirst({
        where: { userId: user.id, plate: body.plate },
      })
      if (existing) {
        throw new ConflictError(
          'PLATE_ALREADY_REGISTERED',
          'Placa já cadastrada nesta conta.',
        )
      }

      return tx.car.create({
        data: {
          userId: user.id,
          brand: body.brand,
          model: body.model,
          year: body.year,
          motorType: body.motorType,
          plate: body.plate,
          color: body.color ?? null,
          isActive: activeCount === 0, // primeiro carro vira ativo automaticamente
        },
      })
    })

    return { car: created }
  })

  // PATCH /me/cars/:id
  app.patch(
    '/me/cars/:id',
    { preHandler: [app.requireAuth] },
    async (request) => {
      const user = request.user
      if (!user) throw new UnauthorizedError()
      const { id } = idParamsSchema.parse(request.params)
      const body = updateCarSchema.parse(request.body)

      const updated = await app.prisma.$transaction(async (tx) => {
        const car = await tx.car.findFirst({
          where: { id, userId: user.id, deletedAt: null },
        })
        if (!car) throw new NotFoundError('Car')

        if (body.plate && body.plate !== car.plate) {
          const hasPendingOrders = await carHasPendingOrders(tx, id)
          if (hasPendingOrders) {
            throw new BusinessError(
              'CAR_HAS_PENDING_ORDERS',
              'Não dá pra trocar a placa de um carro com pedido em andamento.',
            )
          }
          const collision = await tx.car.findFirst({
            where: { userId: user.id, plate: body.plate, id: { not: id } },
          })
          if (collision) {
            throw new ConflictError(
              'PLATE_ALREADY_REGISTERED',
              'Placa já cadastrada nesta conta.',
            )
          }
        }

        return tx.car.update({
          where: { id },
          data: {
            color: body.color ?? car.color,
            plate: body.plate ?? car.plate,
          },
        })
      })

      return { car: updated }
    },
  )

  // POST /me/cars/:id/activate
  app.post(
    '/me/cars/:id/activate',
    { preHandler: [app.requireAuth] },
    async (request) => {
      const user = request.user
      if (!user) throw new UnauthorizedError()
      const { id } = idParamsSchema.parse(request.params)

      const result = await app.prisma.$transaction(async (tx) => {
        const car = await tx.car.findFirst({
          where: { id, userId: user.id, deletedAt: null },
        })
        if (!car) throw new NotFoundError('Car')
        if (car.isActive) return { activeCarId: car.id }

        await tx.car.updateMany({
          where: { userId: user.id, isActive: true },
          data: { isActive: false },
        })
        await tx.car.update({
          where: { id },
          data: { isActive: true },
        })

        return { activeCarId: id }
      })

      return { ok: true, ...result }
    },
  )

  // DELETE /me/cars/:id
  app.delete(
    '/me/cars/:id',
    { preHandler: [app.requireAuth] },
    async (request) => {
      const user = request.user
      if (!user) throw new UnauthorizedError()
      const { id } = idParamsSchema.parse(request.params)

      const result = await app.prisma.$transaction(async (tx) => {
        const car = await tx.car.findFirst({
          where: { id, userId: user.id, deletedAt: null },
        })
        if (!car) throw new NotFoundError('Car')

        if (await carHasPendingOrders(tx, id)) {
          throw new BusinessError(
            'CAR_HAS_PENDING_ORDERS',
            'Não dá pra remover um carro com pedido em andamento.',
          )
        }

        await tx.car.update({
          where: { id },
          data: { deletedAt: new Date(), isActive: false },
        })

        let newActiveCarId: string | null = null
        if (car.isActive) {
          const next = await tx.car.findFirst({
            where: { userId: user.id, deletedAt: null },
            orderBy: { createdAt: 'asc' },
          })
          if (next) {
            await tx.car.update({ where: { id: next.id }, data: { isActive: true } })
            newActiveCarId = next.id
          }
        }

        return { deletedCarId: id, newActiveCarId }
      })

      return { ok: true, ...result }
    },
  )
}

// Verifica se o carro tem qualquer pedido em andamento (presencial ou remap).
const carHasPendingOrders = async (
  tx: Prisma.TransactionClient,
  carId: string,
): Promise<boolean> => {
  const [presencial, remap] = await Promise.all([
    tx.solicitacao.count({
      where: { carId, status: { in: [...PRESENCIAL_ACTIVE_STATUSES] } },
    }),
    tx.remapOrder.count({
      where: { carId, status: { in: [...REMAP_ACTIVE_STATUSES] } },
    }),
  ])
  return presencial + remap > 0
}
