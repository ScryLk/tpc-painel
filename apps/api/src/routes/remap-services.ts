import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { NotFoundError } from '../lib/errors.js'

const idParamsSchema = z.object({ id: z.string().uuid() })

export const remapServicesRoutes: FastifyPluginAsync = async (app) => {
  // GET /remap-services — catálogo file service. Custom (isCustom=true) vem
  // primeiro pra destacar no topo conforme o wireframe.
  app.get('/remap-services', async () => {
    const services = await app.prisma.remapService.findMany({
      where: { active: true },
      orderBy: [{ isCustom: 'desc' }, { category: 'asc' }, { sortOrder: 'asc' }],
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        category: true,
        pts: true,
        priceAvulsoCents: true,
        supports: true,
        isCustom: true,
        sortOrder: true,
      },
    })
    return { services }
  })

  // GET /remap-services/:id
  app.get('/remap-services/:id', async (request) => {
    const { id } = idParamsSchema.parse(request.params)
    const service = await app.prisma.remapService.findFirst({
      where: { id, active: true },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        category: true,
        pts: true,
        priceAvulsoCents: true,
        supports: true,
        isCustom: true,
      },
    })
    if (!service) throw new NotFoundError('RemapService')
    return { service }
  })
}
