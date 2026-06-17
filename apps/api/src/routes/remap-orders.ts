import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { fitsBalance, formatProtocol } from '@tpc/lib/business'
import {
  acceptQuoteSchema,
  cancelRemapOrderSchema,
  createRemapOrderSchema,
  remapStatusSchema,
} from '@tpc/lib/validators'

import { queueEmailIfConsented, siteUrl } from '../emails/jobs.js'
import {
  BusinessError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../lib/errors.js'


const idParamsSchema = z.object({ id: z.string().uuid() })

// TTL da Reservation pra fluxo padrão: 24h. Spec diz "fica reservado até
// cliente aprovar o arquivo", mas usamos 24h aqui como teto pra
// expire-reservation funcionar — TPC entrega o arquivo, cliente aprova, vira
// DEBIT antes. Se TPC sumir 24h sem mexer, reserva expira (próximo PR de job
// expire-remap pode estender pra 48h ou outra regra).
const REMAP_RESERVATION_TTL_MS = 24 * 60 * 60 * 1000

export const remapOrdersRoutes: FastifyPluginAsync = async (app) => {
  // POST /remap-orders — cria pedido (custom ou padrão).
  app.post('/remap-orders', { preHandler: [app.requireAuth] }, async (request) => {
    const user = request.user
    if (!user) throw new UnauthorizedError()

    const body = createRemapOrderSchema.parse(request.body)

    // Valida ownership do carro. Zod já garantiu que carId existe.
    const car = await app.prisma.car.findFirst({
      where: { id: body.carId, userId: user.id, deletedAt: null },
    })
    if (!car) throw new NotFoundError('Car')

    // Fluxo custom: cria AWAITING_QUOTE sem reservar pts.
    if (body.isCustomQuote) {
      const now = new Date()
      const yearStart = new Date(now.getFullYear(), 0, 1)
      const yearEnd = new Date(now.getFullYear() + 1, 0, 1)
      const yearCount = await app.prisma.remapOrder.count({
        where: { createdAt: { gte: yearStart, lt: yearEnd } },
      })
      const protocol = formatProtocol(now.getFullYear(), yearCount + 1)

      const order = await app.prisma.remapOrder.create({
        data: {
          protocol,
          userId: user.id,
          carId: body.carId,
          remapServiceId: body.serviceId ?? null,
          status: 'AWAITING_QUOTE',
          isCustomQuote: true,
          ecuModel: body.technicalData.ecuModel ?? null,
          hardwareUsed: body.technicalData.hardwareUsed ?? null,
          readMode: body.technicalData.readMode ?? null,
          vehicleVin: body.technicalData.vehicleVin ?? null,
          mileage: body.technicalData.mileage ?? null,
          description: body.technicalData.description ?? null,
          pointsReserved: 0,
        },
      })

      await app.prisma.message.create({
        data: {
          remapOrderId: order.id,
          senderType: 'SYSTEM',
          body: `Pedido ${order.protocol} criado. TPC vai analisar e orçar em até 24h.`,
        },
      })

      await app.prisma.notification.create({
        data: {
          userId: user.id,
          kind: 'INFO',
          title: 'Pedido aberto',
          body: `Atendimento personalizado #${order.protocol} aberto. TPC vai orçar em até 24h.`,
          link: `/pedido/${order.id}`,
          source: 'remap-order',
        },
      })

      await queueEmailIfConsented(app.prisma, user.id, {
        kind: 'orderCreated',
        to: user.email,
        props: {
          siteUrl: siteUrl(),
          customerName: user.name,
          protocol: order.protocol,
          serviceName: 'Atendimento personalizado',
          isCustomQuote: true,
          pointsReserved: 0,
          orderUrl: `${siteUrl()}/pedido/${order.id}`,
        },
      })

      return { order: shapeOrder(order) }
    }

    // Fluxo padrão: serviceId obrigatório (Zod já validou).
    const service = await app.prisma.remapService.findFirst({
      where: { id: body.serviceId!, active: true },
    })
    if (!service) throw new NotFoundError('RemapService')

    if (service.isCustom) {
      // Cliente marcou padrão mas escolheu o card custom. Forçar custom.
      throw new BusinessError(
        'CUSTOM_REQUIRES_QUOTE',
        'Esse serviço é personalizado. Use isCustomQuote=true.',
      )
    }

    const balance = await app.prisma.pointsBalance.findUnique({
      where: { userId: user.id },
    })
    const available = balance?.available ?? 0
    if (!fitsBalance(service.pts, { available, reserved: balance?.reserved ?? 0 })) {
      throw new BusinessError(
        'INSUFFICIENT_BALANCE',
        `Saldo insuficiente: precisa de ${service.pts} pts, tem ${available}.`,
      )
    }

    const now = new Date()
    const expiresAt = new Date(now.getTime() + REMAP_RESERVATION_TTL_MS)

    const result = await app.prisma.$transaction(async (tx) => {
      const claim = await tx.pointsBalance.updateMany({
        where: { userId: user.id, available: { gte: service.pts } },
        data: {
          available: { decrement: service.pts },
          reserved: { increment: service.pts },
          version: { increment: 1 },
        },
      })
      if (claim.count === 0) {
        throw new BusinessError(
          'INSUFFICIENT_BALANCE',
          'Saldo insuficiente. Atualize a página e tente de novo.',
        )
      }

      const balanceAfter = await tx.pointsBalance.findUnique({
        where: { userId: user.id },
      })

      const yearStart = new Date(now.getFullYear(), 0, 1)
      const yearEnd = new Date(now.getFullYear() + 1, 0, 1)
      const yearCount = await tx.remapOrder.count({
        where: { createdAt: { gte: yearStart, lt: yearEnd } },
      })
      const protocol = formatProtocol(now.getFullYear(), yearCount + 1)

      const order = await tx.remapOrder.create({
        data: {
          protocol,
          userId: user.id,
          carId: body.carId,
          remapServiceId: service.id,
          status: 'ANALYZING',
          isCustomQuote: false,
          ecuModel: body.technicalData.ecuModel ?? null,
          hardwareUsed: body.technicalData.hardwareUsed ?? null,
          readMode: body.technicalData.readMode ?? null,
          vehicleVin: body.technicalData.vehicleVin ?? null,
          mileage: body.technicalData.mileage ?? null,
          description: body.technicalData.description ?? null,
          pointsReserved: service.pts,
        },
      })

      const reservation = await tx.reservation.create({
        data: {
          userId: user.id,
          amount: service.pts,
          remapOrderId: order.id,
          expiresAt,
        },
      })

      await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'RESERVE',
          amount: service.pts,
          balanceAfter: balanceAfter?.available ?? 0,
          remapOrderId: order.id,
          reservationId: reservation.id,
        },
      })

      await tx.message.create({
        data: {
          remapOrderId: order.id,
          senderType: 'SYSTEM',
          body: `Pedido ${order.protocol} criado. ${service.pts} pts reservados. Envia teu arquivo pra TPC analisar.`,
        },
      })

      await tx.notification.create({
        data: {
          userId: user.id,
          kind: 'INFO',
          title: 'Pedido aberto',
          body: `${service.name} · #${order.protocol}. ${service.pts} pts reservados.`,
          link: `/pedido/${order.id}`,
          source: 'remap-order',
        },
      })

      return { order, reservation, service }
    })

    await queueEmailIfConsented(app.prisma, user.id, {
      kind: 'orderCreated',
      to: user.email,
      props: {
        siteUrl: siteUrl(),
        customerName: user.name,
        protocol: result.order.protocol,
        serviceName: result.service.name,
        isCustomQuote: false,
        pointsReserved: result.order.pointsReserved,
        orderUrl: `${siteUrl()}/pedido/${result.order.id}`,
      },
    })

    return { order: shapeOrder(result.order) }
  })

  // GET /me/remap-orders
  app.get(
    '/me/remap-orders',
    { preHandler: [app.requireAuth] },
    async (request) => {
      const user = request.user
      if (!user) throw new UnauthorizedError()

      const querySchema = z.object({
        limit: z.coerce.number().int().min(1).max(50).default(20),
        status: remapStatusSchema.optional(),
      })
      const { limit, status } = querySchema.parse(request.query)

      const items = await app.prisma.remapOrder.findMany({
        where: { userId: user.id, ...(status ? { status } : {}) },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          remapService: { select: { name: true, category: true } },
          car: { select: { brand: true, model: true, plate: true } },
        },
      })

      return {
        items: items.map((o) => ({
          ...shapeOrder(o),
          remapService: o.remapService,
          car: o.car,
        })),
      }
    },
  )

  // GET /remap-orders/:id — ownership-scoped
  app.get(
    '/remap-orders/:id',
    { preHandler: [app.requireAuth] },
    async (request) => {
      const user = request.user
      if (!user) throw new UnauthorizedError()
      const { id } = idParamsSchema.parse(request.params)

      const order = await app.prisma.remapOrder.findFirst({
        where: { id, userId: user.id },
        include: {
          remapService: {
            select: { name: true, category: true, pts: true, supports: true },
          },
          car: {
            select: { brand: true, model: true, year: true, plate: true, motorType: true },
          },
          reservations: {
            where: { releasedAt: null },
            select: { expiresAt: true },
          },
        },
      })
      if (!order) throw new NotFoundError('RemapOrder')

      return {
        ...shapeOrder(order),
        remapService: order.remapService,
        car: order.car,
        reservationExpiresAt: order.reservations[0]?.expiresAt?.toISOString() ?? null,
      }
    },
  )

  // POST /remap-orders/:id/cancel — cancela conforme janela
  app.post(
    '/remap-orders/:id/cancel',
    { preHandler: [app.requireAuth] },
    async (request) => {
      const user = request.user
      if (!user) throw new UnauthorizedError()
      const { id } = idParamsSchema.parse(request.params)
      const body = cancelRemapOrderSchema.parse(request.body ?? {})

      const result = await app.prisma.$transaction(async (tx) => {
        const order = await tx.remapOrder.findFirst({
          where: { id, userId: user.id },
        })
        if (!order) throw new NotFoundError('RemapOrder')

        if (order.status === 'CANCELLED' || order.status === 'APPROVED') {
          throw new ConflictError(
            'REMAP_ORDER_NOT_CANCELABLE',
            `Pedido já está ${order.status.toLowerCase()}.`,
          )
        }

        // Cliente não pode cancelar quando TPC já está mexendo: MAPPING,
        // AWAITING_REVIEW, NEEDS_REVISION exigem decisão manual TPC pelo
        // WhatsApp (spec: "TPC pode cobrar tempo gasto").
        if (
          order.status === 'MAPPING' ||
          order.status === 'AWAITING_REVIEW' ||
          order.status === 'NEEDS_REVISION'
        ) {
          throw new BusinessError(
            'CANCEL_REQUIRES_TPC',
            'Pedido em andamento. Fala com a TPC pelo WhatsApp pra cancelar.',
          )
        }

        const now = new Date()
        const updateData: {
          status: 'CANCELLED'
          cancelledAt: Date
          quoteAccepted?: boolean
        } = {
          status: 'CANCELLED',
          cancelledAt: now,
        }
        if (order.status === 'QUOTE_SENT') {
          updateData.quoteAccepted = false
        }

        await tx.remapOrder.update({
          where: { id: order.id },
          data: updateData,
        })

        // Refund 100% se tinha pts reservados (estado ANALYZING).
        let refunded = 0
        if (order.pointsReserved > 0) {
          refunded = order.pointsReserved
          const balance = await tx.pointsBalance.update({
            where: { userId: user.id },
            data: {
              reserved: { decrement: refunded },
              available: { increment: refunded },
              version: { increment: 1 },
            },
          })
          await tx.reservation.updateMany({
            where: { remapOrderId: order.id, releasedAt: null },
            data: { releasedAt: now },
          })
          await tx.transaction.create({
            data: {
              userId: user.id,
              type: 'UNRESERVE',
              amount: refunded,
              balanceAfter: balance.available,
              remapOrderId: order.id,
              metadata: { reason: 'order_cancelled' },
            },
          })
        }

        return { order, refunded, reason: body.reason ?? null }
      })

      return {
        ok: true,
        order: { id: result.order.id, protocol: result.order.protocol, status: 'CANCELLED' },
        refunded: result.refunded,
      }
    },
  )

  // POST /remap-orders/:id/accept-quote — cliente aceita ou recusa orçamento
  // custom. Quando aceita, reserva pts e move pra ANALYZING.
  app.post(
    '/remap-orders/:id/accept-quote',
    { preHandler: [app.requireAuth] },
    async (request) => {
      const user = request.user
      if (!user) throw new UnauthorizedError()
      const { id } = idParamsSchema.parse(request.params)
      const body = acceptQuoteSchema.parse(request.body)

      const result = await app.prisma.$transaction(async (tx) => {
        const order = await tx.remapOrder.findFirst({
          where: { id, userId: user.id },
        })
        if (!order) throw new NotFoundError('RemapOrder')
        if (order.status !== 'QUOTE_SENT') {
          throw new ConflictError(
            'INVALID_QUOTE_STATE',
            `Pedido está ${order.status.toLowerCase()}, só QUOTE_SENT aceita resposta.`,
          )
        }
        if (!order.quotePoints || order.quotePoints <= 0) {
          throw new BusinessError(
            'QUOTE_MISSING',
            'Pedido não tem orçamento válido. TPC precisa propor de novo.',
          )
        }

        const now = new Date()

        if (!body.accept) {
          // Recusa: vira CANCELLED sem custo.
          const updated = await tx.remapOrder.update({
            where: { id },
            data: {
              status: 'CANCELLED',
              quoteAccepted: false,
              cancelledAt: now,
            },
          })
          return { order: updated, accepted: false, reserved: 0 }
        }

        // Aceita: valida saldo, reserva, move pra ANALYZING.
        const claim = await tx.pointsBalance.updateMany({
          where: { userId: user.id, available: { gte: order.quotePoints } },
          data: {
            available: { decrement: order.quotePoints },
            reserved: { increment: order.quotePoints },
            version: { increment: 1 },
          },
        })
        if (claim.count === 0) {
          throw new BusinessError(
            'INSUFFICIENT_BALANCE',
            `Saldo insuficiente: precisa de ${order.quotePoints} pts.`,
          )
        }

        const balanceAfter = await tx.pointsBalance.findUnique({
          where: { userId: user.id },
        })

        const expiresAt = new Date(now.getTime() + REMAP_RESERVATION_TTL_MS)
        const reservation = await tx.reservation.create({
          data: {
            userId: user.id,
            amount: order.quotePoints,
            remapOrderId: order.id,
            expiresAt,
          },
        })

        await tx.transaction.create({
          data: {
            userId: user.id,
            type: 'RESERVE',
            amount: order.quotePoints,
            balanceAfter: balanceAfter?.available ?? 0,
            remapOrderId: order.id,
            reservationId: reservation.id,
          },
        })

        const updated = await tx.remapOrder.update({
          where: { id },
          data: {
            status: 'ANALYZING',
            quoteAccepted: true,
            pointsReserved: order.quotePoints,
          },
        })

        return { order: updated, accepted: true, reserved: order.quotePoints }
      })

      return {
        ok: true,
        order: {
          id: result.order.id,
          protocol: result.order.protocol,
          status: result.order.status,
        },
        accepted: result.accepted,
        reserved: result.reserved,
      }
    },
  )

  // GET /remap-orders/:id/messages — timeline do chat
  app.get(
    '/remap-orders/:id/messages',
    { preHandler: [app.requireAuth] },
    async (request) => {
      const user = request.user
      if (!user) throw new UnauthorizedError()
      const { id } = idParamsSchema.parse(request.params)

      const order = await app.prisma.remapOrder.findFirst({
        where: { id, userId: user.id },
        select: { id: true },
      })
      if (!order) throw new NotFoundError('RemapOrder')

      const messages = await app.prisma.message.findMany({
        where: { remapOrderId: id },
        orderBy: { createdAt: 'asc' },
        include: {
          file: {
            select: {
              id: true,
              fileName: true,
              fileSize: true,
              kind: true,
            },
          },
        },
      })

      return {
        messages: messages.map((m) => ({
          id: m.id,
          senderType: m.senderType,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
          file: m.file
            ? {
                id: m.file.id,
                fileName: m.file.fileName,
                fileSize: m.file.fileSize,
                kind: m.file.kind,
              }
            : null,
        })),
      }
    },
  )

  // POST /remap-orders/:id/messages — cliente posta mensagem no chat
  app.post(
    '/remap-orders/:id/messages',
    { preHandler: [app.requireAuth] },
    async (request) => {
      const user = request.user
      if (!user) throw new UnauthorizedError()
      const { id } = idParamsSchema.parse(request.params)

      const body = z
        .object({
          body: z.string().min(1).max(2000),
        })
        .parse(request.body)

      const order = await app.prisma.remapOrder.findFirst({
        where: { id, userId: user.id },
        select: { id: true, status: true },
      })
      if (!order) throw new NotFoundError('RemapOrder')
      if (order.status === 'CANCELLED') {
        throw new ConflictError(
          'ORDER_CANCELLED',
          'Pedido cancelado. Não dá pra mandar mensagem.',
        )
      }

      const msg = await app.prisma.message.create({
        data: {
          remapOrderId: id,
          senderUserId: user.id,
          senderType: 'CUSTOMER',
          body: body.body,
        },
      })

      return {
        message: {
          id: msg.id,
          senderType: msg.senderType,
          body: msg.body,
          createdAt: msg.createdAt.toISOString(),
          file: null,
        },
      }
    },
  )

  // POST /remap-orders/:id/approve — cliente aprova arquivo modificado
  // Debita reservation (reserved -> debited), libera download permanente.
  app.post(
    '/remap-orders/:id/approve',
    { preHandler: [app.requireAuth] },
    async (request) => {
      const user = request.user
      if (!user) throw new UnauthorizedError()
      const { id } = idParamsSchema.parse(request.params)

      const result = await app.prisma.$transaction(async (tx) => {
        const order = await tx.remapOrder.findFirst({
          where: { id, userId: user.id },
        })
        if (!order) throw new NotFoundError('RemapOrder')
        if (order.status !== 'AWAITING_REVIEW') {
          throw new ConflictError(
            'INVALID_APPROVE_STATE',
            `Pedido está ${order.status.toLowerCase()}, só AWAITING_REVIEW aceita aprovação.`,
          )
        }
        if (order.pointsReserved <= 0) {
          throw new BusinessError(
            'NOTHING_TO_DEBIT',
            'Pedido não tem pontos reservados pra debitar.',
          )
        }

        const now = new Date()
        const amount = order.pointsReserved

        // Move de reserved pra fora (debited). Saldo total do usuário diminui.
        const balanceAfter = await tx.pointsBalance.update({
          where: { userId: user.id },
          data: {
            reserved: { decrement: amount },
            version: { increment: 1 },
          },
        })

        await tx.reservation.updateMany({
          where: { remapOrderId: order.id, releasedAt: null },
          data: { releasedAt: now },
        })

        await tx.transaction.create({
          data: {
            userId: user.id,
            type: 'DEBIT',
            amount,
            balanceAfter: balanceAfter.available,
            remapOrderId: order.id,
            metadata: { reason: 'remap_approved' },
          },
        })

        const updated = await tx.remapOrder.update({
          where: { id: order.id },
          data: {
            status: 'APPROVED',
            approvedAt: now,
            pointsDebited: amount,
          },
        })

        await tx.message.create({
          data: {
            remapOrderId: order.id,
            senderType: 'SYSTEM',
            body: `Pedido aprovado. ${amount} pts debitados. Arquivo modificado liberado pra download permanente.`,
          },
        })

        await tx.notification.create({
          data: {
            userId: user.id,
            kind: 'SUCCESS',
            title: 'Pedido aprovado',
            body: `Pedido #${order.protocol} aprovado. ${amount} pts debitados. Arquivo liberado pra baixar.`,
            link: `/pedido/${order.id}`,
            source: 'remap-order',
          },
        })

        return { order: updated, debited: amount }
      })

      return {
        ok: true,
        order: { id: result.order.id, status: 'APPROVED' },
        debited: result.debited,
      }
    },
  )

  // POST /remap-orders/:id/dev/simulate-tpc-reply — DEV ONLY (com nota: nenhum
  // email enviado em /approve pq o cliente já tá no app vendo o resultado.
  // Push notification + a mensagem de sistema no chat são suficientes — não
  // queimar inbox com algo que ele acabou de fazer.)
  // Simula TPC enviando arquivo modificado pra agilizar teste local sem
  // precisar de painel admin completo. Em prod, esse endpoint não existe
  // (guard por NODE_ENV). [TPC-DECISION] remover quando painel admin tiver
  // upload real de arquivos.
  app.post(
    '/remap-orders/:id/dev/simulate-tpc-reply',
    { preHandler: [app.requireAuth] },
    async (request) => {
      if (process.env.NODE_ENV === 'production') {
        throw new BusinessError(
          'DEV_ONLY',
          'Endpoint apenas pra desenvolvimento local.',
        )
      }
      const user = request.user
      if (!user) throw new UnauthorizedError()
      const { id } = idParamsSchema.parse(request.params)

      const result = await app.prisma.$transaction(async (tx) => {
        const order = await tx.remapOrder.findFirst({
          where: { id, userId: user.id },
          include: { remapService: { select: { pts: true, name: true } } },
        })
        if (!order) throw new NotFoundError('RemapOrder')

        // Se for custom AWAITING_QUOTE, envia orçamento ao invés de arquivo
        if (order.status === 'AWAITING_QUOTE') {
          const quotePoints = 600 // mock
          const updated = await tx.remapOrder.update({
            where: { id },
            data: {
              status: 'QUOTE_SENT',
              quotePoints,
              quotedAt: new Date(),
            },
          })
          await tx.message.create({
            data: {
              remapOrderId: id,
              senderType: 'TPC_STAFF',
              body: `Analisamos teu arquivo. Pra esse serviço fica em ${quotePoints} pts. Aceita?`,
            },
          })
          await tx.notification.create({
            data: {
              userId: user.id,
              kind: 'WARNING',
              title: 'Orçamento recebido',
              body: `TPC orçou #${order.protocol} em ${quotePoints} pts. Confira e aceite.`,
              link: `/pedido/${id}`,
              source: 'remap-order',
            },
          })
          return { order: updated, kind: 'quote' as const, quotePoints }
        }

        // Se está ANALYZING ou MAPPING, simula entrega do arquivo modificado
        if (order.status !== 'ANALYZING' && order.status !== 'MAPPING') {
          throw new ConflictError(
            'INVALID_SIMULATE_STATE',
            `Pedido está ${order.status.toLowerCase()}, simulação só roda em ANALYZING/MAPPING/AWAITING_QUOTE.`,
          )
        }

        // Cria um RemapFile mock (sem R2 real)
        const file = await tx.remapFile.create({
          data: {
            remapOrderId: id,
            uploadedById: user.id, // mock: usa o próprio user, em real seria staff
            kind: 'MODIFIED',
            r2Key: `mock/users/${user.id}/orders/${id}/modified.bin`,
            sha256: 'mock-sha256-' + Math.random().toString(36).slice(2, 10),
            fileName: `${(order.remapService?.name ?? 'remap').toLowerCase().replace(/\s+/g, '-')}_v1.bin`,
            fileSize: 6_400_000, // 6.4 MB mock
            mimeType: 'application/octet-stream',
          },
        })

        await tx.message.create({
          data: {
            remapOrderId: id,
            senderType: 'TPC_STAFF',
            body: 'Arquivo modificado entregue. Confere e aprova pra liberar download permanente.',
            fileId: file.id,
          },
        })

        await tx.notification.create({
          data: {
            userId: user.id,
            kind: 'EVENT',
            title: 'Arquivo entregue',
            body: `TPC entregou o arquivo modificado de #${order.protocol}. Confere e aprova.`,
            link: `/pedido/${id}`,
            source: 'remap-order',
          },
        })

        const updated = await tx.remapOrder.update({
          where: { id },
          data: {
            status: 'AWAITING_REVIEW',
            deliveredAt: new Date(),
          },
        })

        return {
          order: updated,
          kind: 'file' as const,
          fileId: file.id,
          serviceName: order.remapService?.name ?? 'Pedido personalizado',
          pointsToDebit: order.pointsReserved,
        }
      })

      if (result.kind === 'file') {
        await queueEmailIfConsented(app.prisma, user.id, {
          kind: 'fileDelivered',
          to: user.email,
          props: {
            siteUrl: siteUrl(),
            customerName: user.name,
            protocol: result.order.protocol,
            serviceName: result.serviceName,
            pointsToDebit: result.pointsToDebit,
            orderUrl: `${siteUrl()}/pedido/${result.order.id}`,
          },
        })
      }

      return { ok: true, ...result, order: { id: result.order.id, status: result.order.status } }
    },
  )
}

// DTO comum pra evitar vazar campos internos do Prisma.
const shapeOrder = (o: {
  id: string
  protocol: string
  status: string
  isCustomQuote: boolean
  remapServiceId: string | null
  carId: string | null
  ecuModel: string | null
  hardwareUsed: string | null
  readMode: string | null
  vehicleVin: string | null
  mileage: number | null
  description: string | null
  quotePoints: number | null
  quoteAccepted: boolean | null
  pointsReserved: number
  pointsDebited: number
  quotedAt: Date | null
  mappingStartedAt: Date | null
  deliveredAt: Date | null
  approvedAt: Date | null
  cancelledAt: Date | null
  createdAt: Date
}) => ({
  id: o.id,
  protocol: o.protocol,
  status: o.status,
  isCustomQuote: o.isCustomQuote,
  serviceId: o.remapServiceId,
  carId: o.carId,
  ecuModel: o.ecuModel,
  hardwareUsed: o.hardwareUsed,
  readMode: o.readMode,
  vehicleVin: o.vehicleVin,
  mileage: o.mileage,
  description: o.description,
  quotePoints: o.quotePoints,
  quoteAccepted: o.quoteAccepted,
  pointsReserved: o.pointsReserved,
  pointsDebited: o.pointsDebited,
  quotedAt: o.quotedAt?.toISOString() ?? null,
  mappingStartedAt: o.mappingStartedAt?.toISOString() ?? null,
  deliveredAt: o.deliveredAt?.toISOString() ?? null,
  approvedAt: o.approvedAt?.toISOString() ?? null,
  cancelledAt: o.cancelledAt?.toISOString() ?? null,
  createdAt: o.createdAt.toISOString(),
})
