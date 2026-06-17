import type { FastifyPluginAsync } from 'fastify'

import { checkoutBodySchema } from '@tpc/lib/validators'
import { canInstall, totalCreditedPoints } from '@tpc/lib/business'

import { queueEmailIfConsented, siteUrl } from '../emails/jobs.js'
import {
  BusinessError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../lib/errors.js'
import { createCardPreference, createPixPayment } from '../lib/mercadopago.js'

const formatBRL = (cents: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    cents / 100,
  )

const formatExpiration = (iso: string): string => {
  const date = new Date(iso)
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export const checkoutRoutes: FastifyPluginAsync = async (app) => {
  app.post('/checkout', { preHandler: [app.requireAuth] }, async (request) => {
    const user = request.user
    if (!user) throw new UnauthorizedError()

    const body = checkoutBodySchema.parse(request.body)

    const pkg = await app.prisma.package.findUnique({ where: { id: body.packageId } })
    if (!pkg || !pkg.active) {
      throw new NotFoundError('Package')
    }

    let cardToken = body.cardToken
    if (body.method === 'card') {
      const installments = body.installments ?? 1
      if (!canInstall(pkg, installments)) {
        throw new BusinessError(
          'INSTALLMENTS_NOT_ALLOWED',
          'Parcelamento não permitido para este pacote ou número de parcelas.',
        )
      }

      // 1-click flow: resolve cardToken a partir de SavedCard.
      if (body.savedCardId) {
        const saved = await app.prisma.savedCard.findFirst({
          where: { id: body.savedCardId, deletedAt: null },
        })
        if (!saved) throw new NotFoundError('SavedCard')
        if (saved.userId !== user.id) throw new ForbiddenError('Cartão não pertence ao usuário')
        cardToken = saved.mpCardToken
      }
    }

    const pointsCredited = totalCreditedPoints(pkg)

    // Cria Purchase ANTES de chamar MP pra ter um ID estável de external_reference.
    const purchase = await app.prisma.purchase.create({
      data: {
        userId: user.id,
        packageId: pkg.id,
        mpTransactionId: `pending-${request.id}-${Date.now()}`,
        mpPaymentMethod: body.method === 'pix' ? 'PIX' : 'CREDIT_CARD',
        amountCents: pkg.priceCents,
        installments: body.method === 'card' ? body.installments ?? 1 : 1,
        pointsCredited,
        status: 'PENDING',
        cpfCnpj: body.cpfCnpj ?? null,
        // Snapshot só é persistido se cliente pediu pra salvar E é cartão novo
        // (1-click não precisa salvar de novo).
        saveCardSnapshot:
          body.method === 'card' && body.saveCard && body.card && !body.savedCardId
            ? { ...body.card, mpCardToken: body.cardToken }
            : undefined,
      },
    })

    try {
      if (body.method === 'pix') {
        const result = await createPixPayment({
          amountCents: pkg.priceCents,
          description: `Pacote ${pkg.name} (${pkg.points} pts)`,
          externalReference: purchase.id,
          payerEmail: user.email,
          cpfCnpj: body.cpfCnpj ?? null,
        })

        await app.prisma.purchase.update({
          where: { id: purchase.id },
          data: {
            mpTransactionId: result.mpPaymentId,
            qrCode: result.qrCode,
            qrCodeBase64: result.qrCodeBase64,
            mpExpiresAt: new Date(result.expiresAt),
          },
        })

        // Email best-effort com link pra reabrir o QR. Util pra quem fecha a
        // aba antes de pagar (Pix MP expira em ~30min).
        await queueEmailIfConsented(app.prisma, user.id, {
          kind: 'pixQrCreated',
          to: user.email,
          props: {
            siteUrl: siteUrl(),
            customerName: user.name,
            packageName: pkg.name,
            pointsTotal: pointsCredited,
            amountBRL: formatBRL(pkg.priceCents),
            expiresAt: formatExpiration(result.expiresAt),
            reopenUrl: `${siteUrl()}/pontos/checkout/${purchase.id}`,
          },
        })

        return {
          purchaseId: purchase.id,
          method: 'pix' as const,
          mpPaymentId: result.mpPaymentId,
          qrCode: result.qrCode,
          qrCodeBase64: result.qrCodeBase64,
          expiresAt: result.expiresAt,
          amountCents: result.amountCents,
        }
      }

      const result = await createCardPreference({
        amountCents: pkg.priceCents,
        description: `Pacote ${pkg.name} (${pkg.points} pts)`,
        externalReference: purchase.id,
        payerEmail: user.email,
        installments: body.installments ?? 1,
        cardToken,
        cpfCnpj: body.cpfCnpj ?? null,
      })

      await app.prisma.purchase.update({
        where: { id: purchase.id },
        data: {
          mpTransactionId: result.mpPaymentId,
          checkoutUrl: result.checkoutUrl,
          mpExpiresAt: new Date(result.expiresAt),
        },
      })

      return {
        purchaseId: purchase.id,
        method: 'card' as const,
        mpPaymentId: result.mpPaymentId,
        checkoutUrl: result.checkoutUrl,
        expiresAt: result.expiresAt,
        amountCents: result.amountCents,
        savedCardUsed: Boolean(body.savedCardId),
      }
    } catch (err) {
      // Se MP falhou, marca Purchase como rejected pra não ficar zumbi.
      await app.prisma.purchase.update({
        where: { id: purchase.id },
        data: { status: 'REJECTED' },
      })
      throw err
    }
  })
}
