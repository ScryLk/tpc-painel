import type { FastifyPluginAsync } from 'fastify'

import { checkoutBodySchema } from '@tpc/lib/validators'
import { canInstall, totalCreditedPoints } from '@tpc/lib/business'

import { BusinessError, NotFoundError, UnauthorizedError } from '../lib/errors.js'
import { createCardPreference, createPixPayment } from '../lib/mercadopago.js'

export const checkoutRoutes: FastifyPluginAsync = async (app) => {
  app.post('/checkout', { preHandler: [app.requireAuth] }, async (request) => {
    const user = request.user
    if (!user) throw new UnauthorizedError()

    const body = checkoutBodySchema.parse(request.body)

    const pkg = await app.prisma.package.findUnique({ where: { id: body.packageId } })
    if (!pkg || !pkg.active) {
      throw new NotFoundError('Package')
    }

    if (body.method === 'card') {
      const installments = body.installments ?? 1
      if (!canInstall(pkg, installments)) {
        throw new BusinessError(
          'INSTALLMENTS_NOT_ALLOWED',
          'Parcelamento não permitido para este pacote ou número de parcelas.',
        )
      }
    }

    const pointsCredited = totalCreditedPoints(pkg)

    // Cria Purchase ANTES de chamar MP pra ter um ID estável de external_reference.
    // mpTransactionId vai ser preenchido logo depois. Inicialmente usamos o uuid
    // do Purchase como placeholder pro unique constraint.
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
        cardToken: body.cardToken,
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
