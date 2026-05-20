import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { Role } from '@tpc/db'
import { remapQuoteSchema } from '@tpc/lib/validators'

import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../../lib/errors.js'

const idParamsSchema = z.object({ id: z.string().uuid() })

export const adminRemapOrdersRoutes: FastifyPluginAsync = async (app) => {
  // POST /admin/remap-orders/:id/quote — TPC envia orçamento pra pedido custom.
  // Move AWAITING_QUOTE -> QUOTE_SENT com quotePoints proposto.
  // NÃO reserva pts: isso só acontece quando o cliente aceitar (endpoint
  // /remap-orders/:id/accept-quote).
  app.post(
    '/admin/remap-orders/:id/quote',
    { preHandler: [app.requireRole(Role.STAFF)] },
    async (request) => {
      const staff = request.user
      if (!staff) throw new UnauthorizedError()
      const { id } = idParamsSchema.parse(request.params)
      const body = remapQuoteSchema.parse(request.body)

      const order = await app.prisma.remapOrder.findUnique({ where: { id } })
      if (!order) throw new NotFoundError('RemapOrder')

      if (order.status === 'QUOTE_SENT') {
        // Permite reorçamento enquanto cliente não respondeu.
        const updated = await app.prisma.remapOrder.update({
          where: { id },
          data: {
            quotePoints: body.pointsProposed,
            quotedAt: new Date(),
          },
        })
        return {
          ok: true,
          status: updated.status,
          quotePoints: updated.quotePoints,
          requoted: true,
        }
      }

      if (order.status !== 'AWAITING_QUOTE') {
        throw new ConflictError(
          'INVALID_QUOTE_STATE',
          `Pedido está ${order.status.toLowerCase()}, só AWAITING_QUOTE aceita orçamento.`,
        )
      }

      const updated = await app.prisma.remapOrder.update({
        where: { id },
        data: {
          status: 'QUOTE_SENT',
          quotePoints: body.pointsProposed,
          quotedAt: new Date(),
        },
      })

      // TODO: enqueue notify-cliente (próximo PR de notifications).

      return {
        ok: true,
        status: updated.status,
        quotePoints: updated.quotePoints,
        protocol: updated.protocol,
      }
    },
  )
}
