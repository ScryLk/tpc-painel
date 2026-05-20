import type { Job } from 'bullmq'

import { prisma } from '@tpc/db'

import {
  NOTIFY_EMAIL_JOB,
  type NotifyEmailData,
} from './notify-email.js'
import { defineJob, enqueue } from '../lib/queue.js'

export const EXPIRE_RESERVATION_JOB = 'expire-reservation'

interface ProcessResult {
  scanned: number
  expired: number
}

// Roda periodicamente (a cada hora). Procura Reservations com expiresAt no
// passado, releasedAt null, e Solicitacao em PENDENTE. Pra cada uma:
// - UNRESERVE atomico
// - Solicitacao vira CANCELADA com cancelReason='reserva_expirada'
// - Reservation marcada released
// - Enfileira notify-email pra cliente
//
// Idempotente: updateMany com guard `status: PENDENTE` rejeita se outro
// processo (cancel manual, segunda execução) já tratou.
//
// Exportado pra que testes possam invocar direto sem precisar de BullMQ.
export const expireReservationProcessor = async (
  job: Pick<Job, 'log'>,
): Promise<ProcessResult> => {
  const now = new Date()

  const expired = await prisma.reservation.findMany({
    where: {
      releasedAt: null,
      expiresAt: { lt: now },
      solicitacaoId: { not: null },
      solicitacao: { status: 'PENDENTE' },
    },
    include: {
      solicitacao: {
        select: {
          id: true,
          protocol: true,
          pointsReserved: true,
          userId: true,
          user: { select: { email: true } },
          service: { select: { name: true } },
        },
      },
    },
    take: 100,
  })

  job.log(`[expire-reservation] scanning ${expired.length} candidates at ${now.toISOString()}`)

  let processed = 0
  for (const res of expired) {
    if (!res.solicitacao || !res.solicitacaoId) continue
    const sol = res.solicitacao
    const amount = res.amount

    const ok = await prisma.$transaction(async (tx) => {
      // Guard: solicitação ainda em PENDENTE
      const claim = await tx.solicitacao.updateMany({
        where: { id: sol.id, status: 'PENDENTE' },
        data: {
          status: 'CANCELADA',
          cancelReason: 'reserva_expirada',
          refundPct: 100,
          cancelledAt: now,
        },
      })
      if (claim.count === 0) return false

      // Reservation released
      await tx.reservation.update({
        where: { id: res.id },
        data: { releasedAt: now },
      })

      // Saldo: move reserved → available (refund 100%)
      const balance = await tx.pointsBalance.update({
        where: { userId: sol.userId },
        data: {
          reserved: { decrement: amount },
          available: { increment: amount },
          version: { increment: 1 },
        },
      })

      await tx.transaction.create({
        data: {
          userId: sol.userId,
          type: 'UNRESERVE',
          amount,
          balanceAfter: balance.available,
          solicitacaoId: sol.id,
          reservationId: res.id,
          metadata: { reason: 'reservation_expired' },
        },
      })

      return true
    })

    if (ok) {
      processed += 1
      // Notifica cliente fora da $transaction. Falha no enqueue não inverte o
      // refund (saldo é mais importante que email).
      const payload: NotifyEmailData = {
        userId: sol.userId,
        purchaseId: sol.id,
        email: sol.user.email,
        amountCents: 0,
        pointsCredited: amount,
        packageName: sol.service.name,
        cpfCnpj: null,
      }
      try {
        await enqueue(NOTIFY_EMAIL_JOB, { ...payload, kind: 'reservation_expired' })
      } catch (err) {
        job.log(`[expire-reservation] failed to enqueue notify-email: ${String(err)}`)
      }
    }
  }

  return { scanned: expired.length, expired: processed }
}

defineJob({ name: EXPIRE_RESERVATION_JOB, processor: expireReservationProcessor })
