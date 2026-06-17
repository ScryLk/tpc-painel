import type { FastifyPluginAsync } from 'fastify'

import { mpWebhookPayloadSchema, type CardSnapshot } from '@tpc/lib/validators'

import {
  NOTIFY_EMAIL_JOB,
  NOTIFY_WHATSAPP_JOB,
  type NotifyEmailData,
  type NotifyWhatsappData,
} from '../jobs/index.js'
import { env } from '../lib/env.js'
import { UnauthorizedError } from '../lib/errors.js'
import { verifyMercadoPagoSignature } from '../lib/hmac.js'
import { getMpPayment } from '../lib/mercadopago.js'
import { enqueue } from '../lib/queue.js'

const isCreditEvent = (status: string): boolean => status === 'approved'
const isRejectEvent = (status: string): boolean =>
  status === 'rejected' || status === 'cancelled'

type SavedCardSnapshot = CardSnapshot & { mpCardToken?: string | null }

const isCardSnapshot = (value: unknown): value is SavedCardSnapshot => {
  if (!value || typeof value !== 'object') return false
  const s = value as Record<string, unknown>
  return (
    typeof s.brand === 'string' &&
    typeof s.lastFour === 'string' &&
    typeof s.holderName === 'string' &&
    typeof s.expMonth === 'number' &&
    typeof s.expYear === 'number'
  )
}

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
      include: {
        user: { select: { email: true, name: true, phone: true } },
        package: { select: { name: true, bonusPoints: true } },
      },
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

      // Persiste SavedCard se o cliente marcou "salvar" no checkout. Snapshot
      // já passou Zod no /checkout, mas valida shape de novo já que o campo
      // Json é livre no DB.
      if (isCardSnapshot(purchase.saveCardSnapshot)) {
        const s = purchase.saveCardSnapshot
        await tx.savedCard.create({
          data: {
            userId: purchase.userId,
            mpCardToken: s.mpCardToken ?? `mock-saved-${purchase.id}`,
            brand: s.brand,
            lastFour: s.lastFour,
            holderName: s.holderName,
            expMonth: s.expMonth,
            expYear: s.expYear,
            isDefault: false,
          },
        })
      }

      return { credited: true as const, newAvailable: balance.available }
    })

    // Dispara notificações fora da transação. Enfileira sempre que o crédito
    // foi efetivado nesta execução (não em replays).
    if (result.credited) {
      const whatsappPayload: NotifyWhatsappData = {
        userId: purchase.userId,
        purchaseId: purchase.id,
        phone: purchase.user.phone,
        amountCents: purchase.amountCents,
        pointsCredited: purchase.pointsCredited,
        packageName: purchase.package.name,
      }
      const emailPayload: NotifyEmailData = {
        userId: purchase.userId,
        purchaseId: purchase.id,
        email: purchase.user.email,
        customerName: purchase.user.name,
        amountCents: purchase.amountCents,
        pointsCredited: purchase.pointsCredited,
        bonusPoints: purchase.package.bonusPoints,
        newBalance: result.newAvailable,
        packageName: purchase.package.name,
        method: purchase.mpPaymentMethod,
        cpfCnpj: purchase.cpfCnpj,
      }

      // Erros de enqueue não devem reverter o crédito de pontos. Se Redis
      // estiver down, loga e segue: cliente tem o saldo e a tela mostra,
      // notificação fica em débito técnico até retry manual.
      try {
        await Promise.all([
          enqueue(NOTIFY_WHATSAPP_JOB, whatsappPayload),
          enqueue(NOTIFY_EMAIL_JOB, emailPayload),
        ])
      } catch (err) {
        request.log.error({ err, purchaseId: purchase.id }, 'failed to enqueue notifications')
      }

      request.log.info(
        { purchaseId: purchase.id, userId: purchase.userId, amount: purchase.pointsCredited },
        'points credited',
      )
    }

    return reply.status(200).send({ ok: true, ...result })
  })
}
