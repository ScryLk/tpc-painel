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

  const atividadeQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })

  // Timeline da home: últimas transactions com descrição amigável pra render.
  // Junta Purchase (CREDIT vindo de compra de pacote) e futuras Solicitacao /
  // RemapOrder (DEBIT/UNRESERVE) via includes nulláveis.
  app.get('/me/atividade', { preHandler: [app.requireAuth] }, async (request) => {
    const user = request.user
    if (!user) throw new UnauthorizedError()
    const { limit } = atividadeQuerySchema.parse(request.query)

    const transactions = await app.prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        purchase: {
          select: {
            mpPaymentMethod: true,
            package: { select: { name: true, bonusPoints: true } },
          },
        },
        solicitacao: {
          select: {
            service: { select: { name: true } },
            car: { select: { brand: true, model: true } },
          },
        },
        remapOrder: {
          select: {
            remapService: { select: { name: true } },
          },
        },
      },
    })

    const items = transactions.map((tx) => {
      let title = ''
      let subtitle = ''

      if (tx.purchase && tx.type === 'CREDIT') {
        const bonus = tx.purchase.package.bonusPoints
        const method = tx.purchase.mpPaymentMethod === 'PIX' ? 'Pix' : 'Cartão'
        title = `Pacote ${tx.purchase.package.name} creditado`
        subtitle = bonus > 0 ? `${tx.amount - bonus} + ${bonus} bônus · ${method}` : method
      } else if (tx.solicitacao) {
        const svc = tx.solicitacao.service.name
        const car = tx.solicitacao.car
          ? `${tx.solicitacao.car.brand} ${tx.solicitacao.car.model}`
          : null
        title = `${svc}${tx.type === 'DEBIT' ? ' concluído' : ''}`
        subtitle = car ?? tx.type
      } else if (tx.remapOrder) {
        title = `${tx.remapOrder.remapService?.name ?? 'Pedido por arquivo'}`
        subtitle = tx.type
      } else {
        title = tx.type === 'CREDIT' ? 'Crédito' : 'Movimento de pontos'
        subtitle = ''
      }

      return {
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        balanceAfter: tx.balanceAfter,
        title,
        subtitle,
        createdAt: tx.createdAt.toISOString(),
      }
    })

    return { items }
  })
}
