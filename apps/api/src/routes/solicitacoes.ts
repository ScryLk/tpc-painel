import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import {
  computeEndDate,
  computeRefundPct,
  fitsBalance,
  formatProtocol,
  isBusinessDay,
  isPastDate,
  isServiceCompatibleWithCar,
} from '@tpc/lib/business'
import {
  solicitacaoCancelSchema,
  solicitacaoCreateSchema,
  slotToEnum,
} from '@tpc/lib/validators'

import {
  BusinessError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../lib/errors.js'

const idParamsSchema = z.object({ id: z.string().uuid() })

// Janela de 24h pra reserva expirar. Caller pode passar Date custom em testes.
const RESERVATION_TTL_MS = 24 * 60 * 60 * 1000

export const solicitacoesRoutes: FastifyPluginAsync = async (app) => {
  // POST /solicitacoes — cria agendamento presencial.
  app.post(
    '/solicitacoes',
    { preHandler: [app.requireAuth] },
    async (request) => {
      const user = request.user
      if (!user) throw new UnauthorizedError()

      const body = solicitacaoCreateSchema.parse(request.body)

      // Parse date local (sem timezone shift). YYYY-MM-DD → meia-noite local.
      const [yStr, mStr, dStr] = body.date.split('-')
      const year = Number(yStr)
      const month = Number(mStr) - 1
      const day = Number(dStr)
      const scheduledDate = new Date(year, month, day)

      if (isPastDate(scheduledDate)) {
        throw new BusinessError(
          'DATE_IN_PAST',
          'A data escolhida já passou.',
        )
      }
      if (!isBusinessDay(scheduledDate)) {
        throw new BusinessError(
          'DATE_NOT_BUSINESS_DAY',
          'TPC não trabalha em domingo nem feriado. Escolha outro dia.',
        )
      }

      const [service, car] = await Promise.all([
        app.prisma.service.findFirst({ where: { id: body.serviceId, active: true } }),
        app.prisma.car.findFirst({
          where: { id: body.carId, userId: user.id, deletedAt: null },
        }),
      ])
      if (!service) throw new NotFoundError('Service')
      if (!car) throw new NotFoundError('Car')

      if (!isServiceCompatibleWithCar(service.motorTypes, car.motorType)) {
        throw new BusinessError(
          'SERVICE_NOT_COMPATIBLE',
          `Esse serviço não é compatível com motor ${car.motorType}.`,
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

      const endDate = computeEndDate(scheduledDate, service.durationDays)
      const expiresAt = new Date(Date.now() + RESERVATION_TTL_MS)

      // Transação atômica: move available → reserved, cria Solicitacao,
      // Reservation e Transaction RESERVE.
      const result = await app.prisma.$transaction(async (tx) => {
        // updateMany com condição garante constraint available >= service.pts
        // mesmo em race (rejeita se outro request consumiu o saldo).
        const claim = await tx.pointsBalance.updateMany({
          where: { userId: user.id, available: { gte: service.pts } },
          data: {
            available: { decrement: service.pts },
            reserved: { increment: service.pts },
            version: { increment: 1 },
          },
        })
        if (claim.count === 0) {
          // Race: balance caiu abaixo do necessário entre o check e o update.
          throw new BusinessError(
            'INSUFFICIENT_BALANCE',
            'Saldo insuficiente. Atualize a página e tente de novo.',
          )
        }

        const balanceAfter = await tx.pointsBalance.findUnique({
          where: { userId: user.id },
        })

        // Protocol seq: count de solicitacoes do ano + 1, com retry no caller.
        const yearStart = new Date(year, 0, 1)
        const yearEnd = new Date(year + 1, 0, 1)
        const yearCount = await tx.solicitacao.count({
          where: { createdAt: { gte: yearStart, lt: yearEnd } },
        })
        const protocol = formatProtocol(year, yearCount + 1)

        const solicitacao = await tx.solicitacao.create({
          data: {
            protocol,
            userId: user.id,
            carId: body.carId,
            serviceId: body.serviceId,
            status: 'PENDENTE',
            scheduledDate,
            endDate: service.durationDays > 1 ? endDate : null,
            slot: slotToEnum(body.arrivalSlot),
            observations: body.observations ?? null,
            pointsReserved: service.pts,
          },
        })

        const reservation = await tx.reservation.create({
          data: {
            userId: user.id,
            amount: service.pts,
            solicitacaoId: solicitacao.id,
            expiresAt,
          },
        })

        await tx.transaction.create({
          data: {
            userId: user.id,
            type: 'RESERVE',
            amount: service.pts,
            balanceAfter: balanceAfter?.available ?? 0,
            solicitacaoId: solicitacao.id,
            reservationId: reservation.id,
          },
        })

        return { solicitacao, reservation }
      })

      // TODO: enfileirar notify-tpc-whatsapp pra avisar TPC do novo pedido
      // (próximo PR de admin tools).

      return {
        solicitacao: {
          id: result.solicitacao.id,
          protocol: result.solicitacao.protocol,
          status: result.solicitacao.status,
          scheduledDate: result.solicitacao.scheduledDate.toISOString(),
          endDate: result.solicitacao.endDate?.toISOString() ?? null,
          slot: result.solicitacao.slot,
          pointsReserved: result.solicitacao.pointsReserved,
          observations: result.solicitacao.observations,
          createdAt: result.solicitacao.createdAt.toISOString(),
          expiresAt: result.reservation.expiresAt?.toISOString() ?? null,
        },
      }
    },
  )

  // GET /me/solicitacoes — lista do user (paginada por createdAt desc).
  app.get(
    '/me/solicitacoes',
    { preHandler: [app.requireAuth] },
    async (request) => {
      const user = request.user
      if (!user) throw new UnauthorizedError()

      const querySchema = z.object({
        limit: z.coerce.number().int().min(1).max(50).default(20),
        status: z
          .enum(['PENDENTE', 'CONFIRMADA', 'EM_EXEC', 'CONCLUIDA', 'CANCELADA'])
          .optional(),
      })
      const { limit, status } = querySchema.parse(request.query)

      const items = await app.prisma.solicitacao.findMany({
        where: { userId: user.id, ...(status ? { status } : {}) },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          service: { select: { name: true, category: true } },
          car: { select: { brand: true, model: true, plate: true } },
        },
      })

      return {
        items: items.map((s) => ({
          id: s.id,
          protocol: s.protocol,
          status: s.status,
          scheduledDate: s.scheduledDate.toISOString(),
          endDate: s.endDate?.toISOString() ?? null,
          slot: s.slot,
          pointsReserved: s.pointsReserved,
          pointsDebited: s.pointsDebited,
          service: s.service,
          car: s.car,
          createdAt: s.createdAt.toISOString(),
        })),
      }
    },
  )

  // GET /solicitacoes/:id — detalhe (ownership-scoped).
  app.get(
    '/solicitacoes/:id',
    { preHandler: [app.requireAuth] },
    async (request) => {
      const user = request.user
      if (!user) throw new UnauthorizedError()
      const { id } = idParamsSchema.parse(request.params)

      const s = await app.prisma.solicitacao.findFirst({
        where: { id, userId: user.id },
        include: {
          service: {
            select: {
              name: true,
              category: true,
              pts: true,
              durationDays: true,
            },
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
      if (!s) throw new NotFoundError('Solicitacao')

      return {
        id: s.id,
        protocol: s.protocol,
        status: s.status,
        scheduledDate: s.scheduledDate.toISOString(),
        endDate: s.endDate?.toISOString() ?? null,
        slot: s.slot,
        observations: s.observations,
        pointsReserved: s.pointsReserved,
        pointsDebited: s.pointsDebited,
        cancelReason: s.cancelReason,
        refundPct: s.refundPct,
        confirmedAt: s.confirmedAt?.toISOString() ?? null,
        startedAt: s.startedAt?.toISOString() ?? null,
        completedAt: s.completedAt?.toISOString() ?? null,
        cancelledAt: s.cancelledAt?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
        reservationExpiresAt: s.reservations[0]?.expiresAt?.toISOString() ?? null,
        service: s.service,
        car: s.car,
      }
    },
  )

  // POST /solicitacoes/:id/cancel — cancelar com política de 3 janelas.
  app.post(
    '/solicitacoes/:id/cancel',
    { preHandler: [app.requireAuth] },
    async (request) => {
      const user = request.user
      if (!user) throw new UnauthorizedError()
      const { id } = idParamsSchema.parse(request.params)
      const body = solicitacaoCancelSchema.parse(request.body ?? {})

      const result = await app.prisma.$transaction(async (tx) => {
        const s = await tx.solicitacao.findFirst({
          where: { id, userId: user.id },
        })
        if (!s) throw new NotFoundError('Solicitacao')
        if (s.userId !== user.id) throw new ForbiddenError()
        if (s.status === 'CANCELADA' || s.status === 'CONCLUIDA') {
          throw new ConflictError(
            'SOLICITACAO_NOT_CANCELABLE',
            `Solicitação já está ${s.status.toLowerCase()}.`,
          )
        }
        if (s.status === 'EM_EXEC') {
          throw new ConflictError(
            'SOLICITACAO_IN_EXECUTION',
            'Serviço já em execução. Fala com a TPC pelo WhatsApp.',
          )
        }

        const arrivalSlot = s.slot === 'MANHA' ? 'manha' : 'tarde'
        const refundPct = computeRefundPct(s.scheduledDate, arrivalSlot)
        if (refundPct === null) {
          throw new BusinessError(
            'CANCEL_WINDOW_CLOSED',
            'Faltam menos de 2 horas. Fala com a TPC pelo WhatsApp pra cancelar.',
          )
        }

        const refundAmount = Math.floor((s.pointsReserved * refundPct) / 100)
        const penaltyAmount = s.pointsReserved - refundAmount

        // Move refundAmount de reserved → available; penalty fica como DEBIT
        // (saiu de reserved e foi descontado de vez como multa).
        const balance = await tx.pointsBalance.update({
          where: { userId: user.id },
          data: {
            reserved: { decrement: s.pointsReserved },
            available: { increment: refundAmount },
            version: { increment: 1 },
          },
        })

        // Solta a reservation.
        await tx.reservation.updateMany({
          where: { solicitacaoId: s.id, releasedAt: null },
          data: { releasedAt: new Date() },
        })

        // UNRESERVE de tudo que voltou.
        if (refundAmount > 0) {
          await tx.transaction.create({
            data: {
              userId: user.id,
              type: 'UNRESERVE',
              amount: refundAmount,
              balanceAfter: balance.available,
              solicitacaoId: s.id,
            },
          })
        }

        // DEBIT da multa (se houver).
        if (penaltyAmount > 0) {
          await tx.transaction.create({
            data: {
              userId: user.id,
              type: 'DEBIT',
              amount: penaltyAmount,
              balanceAfter: balance.available,
              solicitacaoId: s.id,
              metadata: { reason: 'cancellation_penalty', refundPct },
            },
          })
        }

        const updated = await tx.solicitacao.update({
          where: { id: s.id },
          data: {
            status: 'CANCELADA',
            cancelReason: body.reason ?? null,
            refundPct,
            cancelledAt: new Date(),
            pointsDebited: penaltyAmount,
          },
        })

        return { solicitacao: updated, refundAmount, penaltyAmount, refundPct }
      })

      return {
        ok: true,
        solicitacao: {
          id: result.solicitacao.id,
          protocol: result.solicitacao.protocol,
          status: result.solicitacao.status,
          refundPct: result.refundPct,
        },
        refunded: result.refundAmount,
        penalty: result.penaltyAmount,
      }
    },
  )
}
