import { randomUUID } from 'node:crypto'

import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { env } from '../lib/env.js'
import { BusinessError, NotFoundError, UnauthorizedError } from '../lib/errors.js'

const idParamsSchema = z.object({ id: z.string().uuid() })

// Payload do "adicionar cartão". `cardToken` é o token retornado pelo MP JS
// SDK (PCI-safe — gerado client-side, opaco). Em mock mode aceita qualquer
// string ou undefined (fallback gera fake). Em prod real, exigir presente.
const createCardSchema = z.object({
  cardToken: z.string().optional(),
  brand: z.string().min(1).max(32),
  lastFour: z.string().regex(/^\d{4}$/, 'lastFour deve ter 4 dígitos'),
  holderName: z.string().min(1).max(120),
  expMonth: z.number().int().min(1).max(12),
  expYear: z.number().int().min(2024).max(2099),
  setAsDefault: z.boolean().optional(),
})

interface SavedCardShape {
  id: string
  brand: string
  lastFour: string
  holderName: string
  expMonth: number
  expYear: number
  isDefault: boolean
  createdAt: Date
}

const shapeCard = (c: SavedCardShape) => ({
  id: c.id,
  brand: c.brand,
  lastFour: c.lastFour,
  holderName: c.holderName,
  expMonth: c.expMonth,
  expYear: c.expYear,
  exp: `${String(c.expMonth).padStart(2, '0')}/${String(c.expYear).slice(-2)}`,
  isDefault: c.isDefault,
  createdAt: c.createdAt.toISOString(),
})

export const savedCardsRoutes: FastifyPluginAsync = async (app) => {
  // GET /me/saved-cards — lista do user logado (não deletados).
  // Default vem primeiro, depois mais recentes.
  app.get(
    '/me/saved-cards',
    { preHandler: [app.requireAuth] },
    async (request) => {
      const user = request.user
      if (!user) throw new UnauthorizedError()

      const cards = await app.prisma.savedCard.findMany({
        where: { userId: user.id, deletedAt: null },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      })

      return { items: cards.map(shapeCard) }
    },
  )

  // POST /me/saved-cards — adiciona cartão à carteira do user (sem cobrar).
  //
  // Fluxo PCI-DSS:
  //   1. Frontend coleta dados do cartão e gera token via MP JS SDK
  //      (mp.createCardToken({...}) — dados nunca chegam aqui em plaintext)
  //   2. Frontend POSTa { cardToken, brand, lastFour, ... } pra essa rota
  //   3. Backend (em prod) chama MP customer-cards API com o token, recebe
  //      cardId opaco, persiste em SavedCard.mpCardToken
  //
  // Em mock mode (MP_MOCK=true), pula a chamada MP e gera um token fake
  // determinístico. Permite o UX funcionar end-to-end enquanto MP real
  // não tá wirado.
  app.post(
    '/me/saved-cards',
    { preHandler: [app.requireAuth] },
    async (request) => {
      const user = request.user
      if (!user) throw new UnauthorizedError()
      const body = createCardSchema.parse(request.body)

      // Valida expiração futura (ano atual ou meses ainda válidos no ano).
      const now = new Date()
      const expDate = new Date(body.expYear, body.expMonth, 1)
      if (expDate <= now) {
        throw new BusinessError(
          'CARD_EXPIRED',
          'Cartão expirado. Confere a data e tenta de novo.',
        )
      }

      // Em prod com MP real: chamar attachCardToCustomer(user, body.cardToken).
      // Retornaria cardId do MP. Por enquanto, mock token determinístico.
      // TODO: wire MP customer-cards API quando MP_MOCK virar false.
      let mpCardToken: string
      if (env.MP_MOCK || !env.MP_ACCESS_TOKEN) {
        mpCardToken = body.cardToken ?? `mock-card-${randomUUID()}`
      } else {
        // Real MP integration goes here.
        throw new BusinessError(
          'MP_NOT_IMPLEMENTED',
          'Integração real com Mercado Pago ainda não implementada. Set MP_MOCK=true.',
        )
      }

      // Evita duplicata óbvia: mesmo lastFour + brand + exp ativo.
      const existing = await app.prisma.savedCard.findFirst({
        where: {
          userId: user.id,
          brand: body.brand,
          lastFour: body.lastFour,
          expMonth: body.expMonth,
          expYear: body.expYear,
          deletedAt: null,
        },
        select: { id: true },
      })
      if (existing) {
        throw new BusinessError(
          'CARD_ALREADY_SAVED',
          'Esse cartão já tá salvo na tua carteira.',
        )
      }

      // Se for o primeiro cartão do user, marca default automaticamente.
      // Se setAsDefault explícito, limpa default dos outros em transação.
      const count = await app.prisma.savedCard.count({
        where: { userId: user.id, deletedAt: null },
      })
      const shouldBeDefault = body.setAsDefault === true || count === 0

      const card = shouldBeDefault
        ? await app.prisma.$transaction(async (tx) => {
            await tx.savedCard.updateMany({
              where: { userId: user.id, isDefault: true },
              data: { isDefault: false },
            })
            return tx.savedCard.create({
              data: {
                userId: user.id,
                mpCardToken,
                brand: body.brand,
                lastFour: body.lastFour,
                holderName: body.holderName,
                expMonth: body.expMonth,
                expYear: body.expYear,
                isDefault: true,
              },
            })
          })
        : await app.prisma.savedCard.create({
            data: {
              userId: user.id,
              mpCardToken,
              brand: body.brand,
              lastFour: body.lastFour,
              holderName: body.holderName,
              expMonth: body.expMonth,
              expYear: body.expYear,
              isDefault: false,
            },
          })

      return { card: shapeCard(card) }
    },
  )

  // DELETE /me/saved-cards/:id — soft delete. Mantém histórico pra auditoria.
  // Cartão removido nao volta como opcao de 1-click no checkout.
  app.delete(
    '/me/saved-cards/:id',
    { preHandler: [app.requireAuth] },
    async (request) => {
      const user = request.user
      if (!user) throw new UnauthorizedError()
      const { id } = idParamsSchema.parse(request.params)

      const res = await app.prisma.savedCard.updateMany({
        where: { id, userId: user.id, deletedAt: null },
        data: { deletedAt: new Date(), isDefault: false },
      })
      if (res.count === 0) throw new NotFoundError('SavedCard')
      return { ok: true }
    },
  )

  // POST /me/saved-cards/:id/default — promove cartao a padrao.
  // Limpa default dos outros em transação atomica pra garantir só 1 default.
  app.post(
    '/me/saved-cards/:id/default',
    { preHandler: [app.requireAuth] },
    async (request) => {
      const user = request.user
      if (!user) throw new UnauthorizedError()
      const { id } = idParamsSchema.parse(request.params)

      const target = await app.prisma.savedCard.findFirst({
        where: { id, userId: user.id, deletedAt: null },
        select: { id: true },
      })
      if (!target) throw new NotFoundError('SavedCard')

      await app.prisma.$transaction([
        app.prisma.savedCard.updateMany({
          where: { userId: user.id, isDefault: true },
          data: { isDefault: false },
        }),
        app.prisma.savedCard.update({
          where: { id: target.id },
          data: { isDefault: true },
        }),
      ])

      return { ok: true }
    },
  )
}
