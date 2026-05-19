import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { NotFoundError, UnauthorizedError } from '../lib/errors.js'

export const meRoutes: FastifyPluginAsync = async (app) => {
  app.get('/me', { preHandler: [app.requireAuth] }, async (request) => {
    const user = request.user
    if (!user) throw new UnauthorizedError()

    const balance = await app.prisma.pointsBalance.findUnique({
      where: { userId: user.id },
    })

    return {
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      balance: {
        available: balance?.available ?? 0,
        reserved: balance?.reserved ?? 0,
      },
    }
  })

  app.get('/me/saldo', { preHandler: [app.requireAuth] }, async (request) => {
    const user = request.user
    if (!user) throw new UnauthorizedError()

    const balance = await app.prisma.pointsBalance.findUnique({
      where: { userId: user.id },
    })
    const available = balance?.available ?? 0
    const reserved = balance?.reserved ?? 0

    return { available, reserved, total: available + reserved }
  })

  app.get('/me/cartoes-salvos', { preHandler: [app.requireAuth] }, async (request) => {
    const user = request.user
    if (!user) throw new UnauthorizedError()

    const cards = await app.prisma.savedCard.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        brand: true,
        lastFour: true,
        holderName: true,
        expMonth: true,
        expYear: true,
        isDefault: true,
      },
    })
    return { cards }
  })

  const cardIdSchema = z.object({ id: z.string().uuid() })

  app.delete(
    '/me/cartoes-salvos/:id',
    { preHandler: [app.requireAuth] },
    async (request) => {
      const user = request.user
      if (!user) throw new UnauthorizedError()
      const { id } = cardIdSchema.parse(request.params)

      const card = await app.prisma.savedCard.findFirst({
        where: { id, userId: user.id, deletedAt: null },
      })
      if (!card) throw new NotFoundError('SavedCard')

      await app.prisma.savedCard.update({
        where: { id },
        data: { deletedAt: new Date() },
      })
      return { ok: true }
    },
  )
}
