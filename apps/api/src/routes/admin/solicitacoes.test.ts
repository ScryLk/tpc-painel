import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockPrisma, fakeStaff } = vi.hoisted(() => {
  type MockTx = {
    solicitacao: {
      findUnique: ReturnType<typeof vi.fn>
      updateMany: ReturnType<typeof vi.fn>
    }
    reservation: { updateMany: ReturnType<typeof vi.fn> }
    pointsBalance: { update: ReturnType<typeof vi.fn> }
    transaction: { create: ReturnType<typeof vi.fn> }
    car: { update: ReturnType<typeof vi.fn> }
  }

  const tx: MockTx = {
    solicitacao: { findUnique: vi.fn(), updateMany: vi.fn() },
    reservation: { updateMany: vi.fn() },
    pointsBalance: { update: vi.fn() },
    transaction: { create: vi.fn() },
    car: { update: vi.fn() },
  }

  const mockPrisma = {
    solicitacao: { findUnique: tx.solicitacao.findUnique, update: vi.fn(), updateMany: tx.solicitacao.updateMany },
    reservation: tx.reservation,
    pointsBalance: tx.pointsBalance,
    transaction: tx.transaction,
    car: tx.car,
    $transaction: vi.fn(async (fn: (innerTx: MockTx) => unknown) => fn(tx)),
    $connect: vi.fn(async () => undefined),
    $disconnect: vi.fn(async () => undefined),
  }

  const fakeStaff: {
    id: string
    clerkId: string
    email: string
    name: string
    phone: string | null
    role: string
    pendingDeletion: boolean
    deletedAt: Date | null
  } = {
    id: 'staff-1',
    clerkId: 'clerk_staff',
    email: 'staff@tpc.dev',
    name: 'Staff TPC',
    phone: null,
    role: 'STAFF',
    pendingDeletion: false,
    deletedAt: null,
  }

  return { mockPrisma, fakeStaff }
})

vi.mock('@tpc/db', () => ({
  prisma: mockPrisma,
  Role: { CUSTOMER: 'CUSTOMER', STAFF: 'STAFF', ADMIN: 'ADMIN' },
}))

// Bypass auth plugin: requireAuth e requireRole(STAFF) viram no-ops injetando fakeStaff.
vi.mock('../../plugins/auth.js', async () => {
  const { default: fp } = await import('fastify-plugin')
  return {
    default: fp(
      async (app) => {
        app.decorate('requireAuth', async (request: { user?: typeof fakeStaff }) => {
          request.user = fakeStaff
        })
        app.decorate(
          'requireRole',
          () =>
            async (request: { user?: typeof fakeStaff }) => {
              request.user = fakeStaff
            },
        )
      },
      { name: 'auth' },
    ),
  }
})

vi.mock('../../lib/queue.js', () => ({
  enqueue: vi.fn(async () => undefined),
  defineJob: vi.fn(),
  startNotificationsWorker: vi.fn(),
  scheduleRepeatable: vi.fn(),
  NOTIFICATIONS_QUEUE: 'notifications',
  closeQueue: vi.fn(),
}))

import { buildServer } from '../../server.js'

const solId = '11111111-2222-3333-4444-555555555555'

const baseSolicitacao = {
  id: solId,
  protocol: 'TPC-2026-00001',
  userId: 'user-1',
  carId: 'car-1',
  serviceId: 'svc-1',
  status: 'PENDENTE' as const,
  scheduledDate: new Date('2026-05-20'),
  endDate: null,
  slot: 'MANHA' as const,
  observations: null,
  pointsReserved: 500,
  pointsDebited: 0,
  cancelReason: null,
  refundPct: null,
  confirmedAt: null,
  startedAt: null,
  cancelledAt: null,
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  service: { slug: 'stage1', durationDays: 1 },
}

describe('admin solicitacoes routes', () => {
  let app: Awaited<ReturnType<typeof buildServer>>

  beforeEach(async () => {
    vi.clearAllMocks()
    app = await buildServer()
  })

  afterEach(async () => {
    await app.close()
  })

  describe('POST /admin/solicitacoes/:id/confirm', () => {
    it('confirma uma Solicitacao PENDENTE', async () => {
      mockPrisma.solicitacao.findUnique.mockResolvedValueOnce(baseSolicitacao)
      mockPrisma.solicitacao.update.mockResolvedValueOnce({
        ...baseSolicitacao,
        status: 'CONFIRMADA',
        confirmedAt: new Date(),
      })

      const res = await app.inject({
        method: 'POST',
        url: `/admin/solicitacoes/${solId}/confirm`,
        headers: { authorization: 'Bearer t' },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({
        ok: true,
        status: 'CONFIRMADA',
        protocol: 'TPC-2026-00001',
      })
      expect(mockPrisma.solicitacao.update).toHaveBeenCalledWith({
        where: { id: solId },
        data: { status: 'CONFIRMADA', confirmedAt: expect.any(Date) },
      })
    })

    it('é idempotente: já CONFIRMADA retorna 200 sem mudar', async () => {
      mockPrisma.solicitacao.findUnique.mockResolvedValueOnce({
        ...baseSolicitacao,
        status: 'CONFIRMADA',
      })

      const res = await app.inject({
        method: 'POST',
        url: `/admin/solicitacoes/${solId}/confirm`,
        headers: { authorization: 'Bearer t' },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({ already: true })
      expect(mockPrisma.solicitacao.update).not.toHaveBeenCalled()
    })

    it('rejeita transição inválida (EM_EXEC → confirm)', async () => {
      mockPrisma.solicitacao.findUnique.mockResolvedValueOnce({
        ...baseSolicitacao,
        status: 'EM_EXEC',
      })

      const res = await app.inject({
        method: 'POST',
        url: `/admin/solicitacoes/${solId}/confirm`,
        headers: { authorization: 'Bearer t' },
      })

      expect(res.statusCode).toBe(409)
      expect(res.json()).toMatchObject({ error: { code: 'INVALID_TRANSITION' } })
    })
  })

  describe('POST /admin/solicitacoes/:id/start', () => {
    it('move CONFIRMADA → EM_EXEC', async () => {
      mockPrisma.solicitacao.findUnique.mockResolvedValueOnce({
        ...baseSolicitacao,
        status: 'CONFIRMADA',
      })
      mockPrisma.solicitacao.update.mockResolvedValueOnce({
        ...baseSolicitacao,
        status: 'EM_EXEC',
        startedAt: new Date(),
      })

      const res = await app.inject({
        method: 'POST',
        url: `/admin/solicitacoes/${solId}/start`,
        headers: { authorization: 'Bearer t' },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({ status: 'EM_EXEC' })
    })

    it('rejeita start em PENDENTE (precisa confirmar primeiro)', async () => {
      mockPrisma.solicitacao.findUnique.mockResolvedValueOnce(baseSolicitacao)

      const res = await app.inject({
        method: 'POST',
        url: `/admin/solicitacoes/${solId}/start`,
        headers: { authorization: 'Bearer t' },
      })

      expect(res.statusCode).toBe(409)
      expect(res.json()).toMatchObject({ error: { code: 'INVALID_TRANSITION' } })
    })
  })

  describe('POST /admin/solicitacoes/:id/complete', () => {
    it('completa Stage 1: DEBIT + decrementa reserved + atualiza mapState', async () => {
      mockPrisma.solicitacao.findUnique.mockResolvedValueOnce({
        ...baseSolicitacao,
        status: 'EM_EXEC',
        startedAt: new Date(),
      })
      mockPrisma.solicitacao.updateMany.mockResolvedValueOnce({ count: 1 })
      mockPrisma.reservation.updateMany.mockResolvedValueOnce({ count: 1 })
      mockPrisma.pointsBalance.update.mockResolvedValueOnce({ available: 750, reserved: 0 })
      mockPrisma.transaction.create.mockResolvedValueOnce({} as never)
      mockPrisma.car.update.mockResolvedValueOnce({} as never)

      const res = await app.inject({
        method: 'POST',
        url: `/admin/solicitacoes/${solId}/complete`,
        headers: { authorization: 'Bearer t' },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({
        ok: true,
        status: 'CONCLUIDA',
        pointsDebited: 500,
        mapStateUpdated: 'STAGE1',
      })

      // Status transicionou com guard
      expect(mockPrisma.solicitacao.updateMany).toHaveBeenCalledWith({
        where: { id: solId, status: { in: ['CONFIRMADA', 'EM_EXEC'] } },
        data: expect.objectContaining({
          status: 'CONCLUIDA',
          pointsDebited: 500,
        }),
      })

      // DEBIT do reserved (não vai pra available)
      expect(mockPrisma.pointsBalance.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { reserved: { decrement: 500 }, version: { increment: 1 } },
      })

      // Transaction DEBIT
      expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'DEBIT',
          amount: 500,
          solicitacaoId: solId,
          metadata: { reason: 'service_completed' },
        }),
      })

      // Car.mapState = STAGE1
      expect(mockPrisma.car.update).toHaveBeenCalledWith({
        where: { id: 'car-1' },
        data: { mapState: 'STAGE1' },
      })
    })

    it('completa serviço NON-Stage sem alterar mapState (Pop & Bang)', async () => {
      mockPrisma.solicitacao.findUnique.mockResolvedValueOnce({
        ...baseSolicitacao,
        status: 'EM_EXEC',
        service: { slug: 'pop-bang', durationDays: 1 },
      })
      mockPrisma.solicitacao.updateMany.mockResolvedValueOnce({ count: 1 })
      mockPrisma.reservation.updateMany.mockResolvedValueOnce({ count: 1 })
      mockPrisma.pointsBalance.update.mockResolvedValueOnce({ available: 750, reserved: 0 })
      mockPrisma.transaction.create.mockResolvedValueOnce({} as never)

      const res = await app.inject({
        method: 'POST',
        url: `/admin/solicitacoes/${solId}/complete`,
        headers: { authorization: 'Bearer t' },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({ mapStateUpdated: null })
      expect(mockPrisma.car.update).not.toHaveBeenCalled()
    })

    it('completa direto de CONFIRMADA (pula start)', async () => {
      mockPrisma.solicitacao.findUnique.mockResolvedValueOnce({
        ...baseSolicitacao,
        status: 'CONFIRMADA',
      })
      mockPrisma.solicitacao.updateMany.mockResolvedValueOnce({ count: 1 })
      mockPrisma.reservation.updateMany.mockResolvedValueOnce({ count: 1 })
      mockPrisma.pointsBalance.update.mockResolvedValueOnce({ available: 750, reserved: 0 })
      mockPrisma.transaction.create.mockResolvedValueOnce({} as never)
      mockPrisma.car.update.mockResolvedValueOnce({} as never)

      const res = await app.inject({
        method: 'POST',
        url: `/admin/solicitacoes/${solId}/complete`,
        headers: { authorization: 'Bearer t' },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({ status: 'CONCLUIDA' })
    })

    it('rejeita complete em PENDENTE (precisa confirmar primeiro)', async () => {
      mockPrisma.solicitacao.findUnique.mockResolvedValueOnce(baseSolicitacao)

      const res = await app.inject({
        method: 'POST',
        url: `/admin/solicitacoes/${solId}/complete`,
        headers: { authorization: 'Bearer t' },
      })

      expect(res.statusCode).toBe(409)
      expect(res.json()).toMatchObject({ error: { code: 'INVALID_TRANSITION' } })
    })

    it('é idempotente: já CONCLUIDA retorna sem mexer em saldo', async () => {
      mockPrisma.solicitacao.findUnique.mockResolvedValueOnce({
        ...baseSolicitacao,
        status: 'CONCLUIDA',
      })

      const res = await app.inject({
        method: 'POST',
        url: `/admin/solicitacoes/${solId}/complete`,
        headers: { authorization: 'Bearer t' },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({ already: true })
      expect(mockPrisma.pointsBalance.update).not.toHaveBeenCalled()
      expect(mockPrisma.car.update).not.toHaveBeenCalled()
    })
  })
})
