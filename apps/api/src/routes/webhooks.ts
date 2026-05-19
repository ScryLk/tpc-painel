import type { FastifyPluginAsync } from 'fastify'

import { mpWebhookPayloadSchema } from '@tpc/lib/validators'

import { env } from '../lib/env.js'
import { UnauthorizedError } from '../lib/errors.js'
import { verifyMercadoPagoSignature } from '../lib/hmac.js'
import { getMpPayment } from '../lib/mercadopago.js'

const isCreditEvent = (status: string): boolean => status === 'approved'
const isRejectEvent = (status: string): boolean =>
  status === 'rejected' || status === 'cancelled'

export const webhookRoutes: FastifyPluginAsync = async (app) => {
  app.post('/webhooks/mercadopago', async (request, reply) => {
    const payload = mpWebhookPayloadSchema.parse(request.body)
    const dataId = String(payload.data.id)

    // HMAC validation. Required in production, optional in dev to allow curl
    // triggers. Quando MP_WEBHOOK_SECRET nao esta setado, pula a verificacao.
    if (env.MP_WEBHOOK_SECRET) {
      const signatureHeader = String(request.headers['x-signature'] ?? '')
      const requestId = String(request.headers['x-request-id'] ?? '')
      const valid = verifyMercadoPagoSignature({
        secret: env.MP_WEBHOOK_SECRET,
        signatureHeader,
        requestId,
        dataId,
      })
      if (!valid) {
        request.log.warn({ dataId, requestId }, 'mp webhook hmac mismatch')
        throw new UnauthorizedError('Invalid signature')
      }
    }

    // Filtra eventos que nao sao de payment.
    if (payload.type && payload.type !== 'payment') {
      request.log.debug({ type: payload.type }, 'ignoring non-payment webhook')
      return reply.status(200).send({ ok: true, ignored: true })
    }

    const purchase = await app.prisma.purchase.findUnique({
      where: { mpTransactionId: dataId },
    })
    if (!purchase) {
      // Pode ser evento de outro merchant ou webhook orphan. Responde 200 pra
      // MP nao retentar. Logamos pra auditoria.
      request.log.info({ dataId }, 'no purchase matches mp payment id')
      return reply.status(200).send({ ok: true, unknownPurchase: true })
    }

    const payment = await getMpPayment(dataId)

    if (isRejectEvent(payment.status)) {
      await app.prisma.purchase.updateMany({
        where: { id: purchase.id, status: 'PENDING' },
        data: { status: 'REJECTED' },
      })
      return reply.status(200).send({ ok: true, status: 'rejected' })
    }

    if (!isCreditEvent(payment.status)) {
      // status pending/in_process. MP vai retentar quando aprovar.
      return reply.status(200).send({ ok: true, status: payment.status })
    }

    // Approved. Credita pontos em transacao atomica. updateMany com
    // status: 'PENDING' garante idempotencia: re-execucao retorna count=0.
    const result = await app.prisma.$transaction(async (tx) => {
      const claim = await tx.purchase.updateMany({
        where: { id: purchase.id, status: 'PENDING' },
        data: { status: 'APPROVED', paidAt: new Date() },
      })
      if (claim.count === 0) {
        return { credited: false, reason: 'already_processed' as const }
      }

      const balance = await tx.pointsBalance.upsert({
        where: { userId: purchase.userId },
        create: {
          userId: purchase.userId,
          available: purchase.pointsCredited,
          reserved: 0,
        },
        update: {
          available: { increment: purchase.pointsCredited },
          version: { increment: 1 },
        },
      })

      await tx.transaction.create({
        data: {
          userId: purchase.userId,
          type: 'CREDIT',
          amount: purchase.pointsCredited,
          balanceAfter: balance.available,
          purchaseId: purchase.id,
        },
      })

      return { credited: true as const, newAvailable: balance.available }
    })

    // TODO: enqueue notify-whatsapp + notify-email jobs (próximo PR da Sprint 1).
    if (result.credited) {
      request.log.info(
        { purchaseId: purchase.id, userId: purchase.userId, amount: purchase.pointsCredited },
        'points credited',
      )
    }

    return reply.status(200).send({ ok: true, ...result })
  })
}
