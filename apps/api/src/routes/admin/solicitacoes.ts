import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { Role } from '@tpc/db'

import {
  BusinessError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../../lib/errors.js'

const idParamsSchema = z.object({ id: z.string().uuid() })

// Mapeia slug do Service Stage X pro enum MapState do Car. Outros serviços
// (Pop & Bang, DPF, etc) não alteram mapState.
const STAGE_TO_MAP_STATE: Record<string, 'STAGE1' | 'STAGE2' | 'STAGE3'> = {
  stage1: 'STAGE1',
  stage2: 'STAGE2',
  stage3: 'STAGE3',
}

export const adminSolicitacoesRoutes: FastifyPluginAsync = async (app) => {
  // POST /admin/solicitacoes/:id/confirm
  // PENDENTE → CONFIRMADA. Idempotente: já confirmada retorna 200 sem mudar.
  app.post(
    '/admin/solicitacoes/:id/confirm',
    { preHandler: [app.requireRole(Role.STAFF)] },
    async (request) => {
      const staff = request.user
      if (!staff) throw new UnauthorizedError()
      const { id } = idParamsSchema.parse(request.params)

      const s = await app.prisma.solicitacao.findUnique({ where: { id } })
      if (!s) throw new NotFoundError('Solicitacao')

      if (s.status === 'CONFIRMADA') {
        return { ok: true, status: 'CONFIRMADA', already: true }
      }
      if (s.status !== 'PENDENTE') {
        throw new ConflictError(
          'INVALID_TRANSITION',
          `Solicitação está ${s.status.toLowerCase()}, só PENDENTE pode ser confirmada.`,
        )
      }

      const updated = await app.prisma.solicitacao.update({
        where: { id },
        data: { status: 'CONFIRMADA', confirmedAt: new Date() },
      })

      // TODO: enqueue push pro cliente "TPC confirmou o agendamento" (próximo PR).

      return { ok: true, status: updated.status, protocol: updated.protocol }
    },
  )

  // POST /admin/solicitacoes/:id/start
  // CONFIRMADA → EM_EXEC. Carro chegou na oficina.
  app.post(
    '/admin/solicitacoes/:id/start',
    { preHandler: [app.requireRole(Role.STAFF)] },
    async (request) => {
      const staff = request.user
      if (!staff) throw new UnauthorizedError()
      const { id } = idParamsSchema.parse(request.params)

      const s = await app.prisma.solicitacao.findUnique({ where: { id } })
      if (!s) throw new NotFoundError('Solicitacao')

      if (s.status === 'EM_EXEC') {
        return { ok: true, status: 'EM_EXEC', already: true }
      }
      if (s.status !== 'CONFIRMADA') {
        throw new ConflictError(
          'INVALID_TRANSITION',
          `Solicitação está ${s.status.toLowerCase()}, só CONFIRMADA pode entrar em execução.`,
        )
      }

      const updated = await app.prisma.solicitacao.update({
        where: { id },
        data: { status: 'EM_EXEC', startedAt: new Date() },
      })

      return { ok: true, status: updated.status, protocol: updated.protocol }
    },
  )

  // POST /admin/solicitacoes/:id/complete
  // EM_EXEC (ou CONFIRMADA pra pular start) → CONCLUIDA.
  // Esse é o handler crítico de saldo: faz o DEBIT final dos pontos
  // reservados, solta a Reservation, atualiza mapState do Car se Stage.
  app.post(
    '/admin/solicitacoes/:id/complete',
    { preHandler: [app.requireRole(Role.STAFF)] },
    async (request) => {
      const staff = request.user
      if (!staff) throw new UnauthorizedError()
      const { id } = idParamsSchema.parse(request.params)

      const result = await app.prisma.$transaction(async (tx) => {
        const s = await tx.solicitacao.findUnique({
          where: { id },
          include: {
            service: { select: { slug: true, durationDays: true } },
          },
        })
        if (!s) throw new NotFoundError('Solicitacao')

        if (s.status === 'CONCLUIDA') {
          return { already: true as const, status: 'CONCLUIDA', protocol: s.protocol }
        }
        if (s.status !== 'CONFIRMADA' && s.status !== 'EM_EXEC') {
          throw new ConflictError(
            'INVALID_TRANSITION',
            `Solicitação está ${s.status.toLowerCase()}, só CONFIRMADA ou EM_EXEC pode ser concluída.`,
          )
        }
        if (s.pointsReserved <= 0) {
          throw new BusinessError(
            'NOTHING_TO_DEBIT',
            'Solicitação não tem pontos reservados.',
          )
        }

        const now = new Date()

        // Guard transição via updateMany pra evitar race com outro complete.
        const claim = await tx.solicitacao.updateMany({
          where: {
            id,
            status: { in: ['CONFIRMADA', 'EM_EXEC'] },
          },
          data: {
            status: 'CONCLUIDA',
            completedAt: now,
            startedAt: s.startedAt ?? now,
            pointsDebited: s.pointsReserved,
          },
        })
        if (claim.count === 0) {
          // Race: outro processo já alterou. Aborta sem mexer em saldo.
          throw new ConflictError(
            'ALREADY_PROCESSED',
            'Solicitação foi alterada por outro processo.',
          )
        }

        // Solta reservation
        await tx.reservation.updateMany({
          where: { solicitacaoId: s.id, releasedAt: null },
          data: { releasedAt: now },
        })

        // DEBIT do reserved (não vai pra available; sai de vez)
        const balance = await tx.pointsBalance.update({
          where: { userId: s.userId },
          data: {
            reserved: { decrement: s.pointsReserved },
            version: { increment: 1 },
          },
        })

        await tx.transaction.create({
          data: {
            userId: s.userId,
            type: 'DEBIT',
            amount: s.pointsReserved,
            balanceAfter: balance.available,
            solicitacaoId: s.id,
            metadata: { reason: 'service_completed' },
          },
        })

        // Atualiza mapState do Car se for serviço Stage X.
        const newMapState = STAGE_TO_MAP_STATE[s.service.slug]
        if (newMapState) {
          await tx.car.update({
            where: { id: s.carId },
            data: { mapState: newMapState },
          })
        }

        return {
          already: false as const,
          status: 'CONCLUIDA',
          protocol: s.protocol,
          pointsDebited: s.pointsReserved,
          mapStateUpdated: newMapState ?? null,
        }
      })

      // TODO: enqueue notify-email com NF + push pro cliente (próximo PR).

      return { ok: true, ...result }
    },
  )
}
