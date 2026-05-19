import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'

import { prisma, type PrismaClient } from '@tpc/db'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

const prismaPlugin: FastifyPluginAsync = async (app) => {
  await prisma.$connect()
  app.decorate('prisma', prisma)
  app.addHook('onClose', async () => {
    await prisma.$disconnect()
  })
}

export default fp(prismaPlugin, { name: 'prisma' })
