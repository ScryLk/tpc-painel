import type { FastifyPluginAsync } from 'fastify'

import { UnauthorizedError } from '../lib/errors.js'

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
}
