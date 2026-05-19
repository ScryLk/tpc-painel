import type { FastifyPluginAsync } from 'fastify'

export const pacotesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/pacotes', async () => {
    const pacotes = await app.prisma.package.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        tier: true,
        name: true,
        points: true,
        priceCents: true,
        bonusPoints: true,
        bonusPct: true,
        popular: true,
        sortOrder: true,
      },
    })
    return { pacotes }
  })
}
