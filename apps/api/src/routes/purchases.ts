import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { NotFoundError, UnauthorizedError } from '../lib/errors.js'

export const purchaseRoutes: FastifyPluginAsync = async (app) => {
  const paramsSchema = z.object({ id: z.string().uuid() })

  app.get(
    '/purchases/:id',
    { preHandler: [app.requireAuth] },
    async (request) => {
      const user = request.user
      if (!user) throw new UnauthorizedError()

      const { id } = paramsSchema.parse(request.params)
      const purchase = await app.prisma.purchase.findFirst({
        where: { id, userId: user.id },
        include: {
          package: {
            select: { tier: true, name: true, points: true, bonusPoints: true },
          },
        },
      })
      if (!purchase) throw new NotFoundError('Purchase')

      return {
        id: purchase.id,
        status: purchase.status,
        method: purchase.mpPaymentMethod,
        amountCents: purchase.amountCents,
        installments: purchase.installments,
        pointsCredited: purchase.pointsCredited,
        cpfCnpj: purchase.cpfCnpj,
        qrCode: purchase.qrCode,
        qrCodeBase64: purchase.qrCodeBase64,
        checkoutUrl: purchase.checkoutUrl,
        mpExpiresAt: purchase.mpExpiresAt,
        paidAt: purchase.paidAt,
        createdAt: purchase.createdAt,
        package: purchase.package,
      }
    },
  )
}
