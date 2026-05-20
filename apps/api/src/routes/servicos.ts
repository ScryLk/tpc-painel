import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { NotFoundError } from '../lib/errors.js'

const idParamsSchema = z.object({ id: z.string().uuid() })

export const servicosRoutes: FastifyPluginAsync = async (app) => {
  // GET /servicos — catálogo presencial completo. Pública (não exige auth)
  // pra cliente browsear antes do signup.
  app.get('/servicos', async () => {
    const servicos = await app.prisma.service.findMany({
      where: { active: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        category: true,
        pts: true,
        priceAvulsoCents: true,
        motorTypes: true,
        durationDays: true,
        popular: true,
      },
    })
    return { servicos }
  })

  // GET /servicos/:id — detalhe do serviço.
  app.get('/servicos/:id', async (request) => {
    const { id } = idParamsSchema.parse(request.params)
    const servico = await app.prisma.service.findFirst({
      where: { id, active: true },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        category: true,
        pts: true,
        priceAvulsoCents: true,
        motorTypes: true,
        durationDays: true,
        popular: true,
      },
    })
    if (!servico) throw new NotFoundError('Service')
    return { servico }
  })
}
