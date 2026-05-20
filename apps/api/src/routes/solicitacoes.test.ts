import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockPrisma, fakeUser } = vi.hoisted(() => {
  type MockTx = {
    solicitacao: {
      findFirst: ReturnType<typeof vi.fn>
      update: ReturnType<typeof vi.fn>
    }
    pointsBalance: { update: ReturnType<typeof vi.fn> }
    reservation: { updateMany: ReturnType<typeof vi.fn> }
    transaction: { create: ReturnType<typeof vi.fn> }
  }

  const tx: MockTx = {
    solicitacao: { findFirst: vi.fn(), update: vi.fn() },
    pointsBalance: { update: vi.fn() },
    reservation: { updateMany: vi.fn() },
    transaction: { create: vi.fn() },
  }

  const mockPrisma = {
    solicitacao: tx.solicitacao,
    pointsBalance: tx.pointsBalance,
    reservation: tx.reservation,
    transaction: tx.transaction,
    $transaction: vi.fn(async (fn: (innerTx: MockTx) => unknown) => fn(tx)),
    $connect: vi.fn(async () => undefined),
    $disconnect: vi.fn(async () => undefined),
  }

  const fakeUser: {
    id: string
    clerkId: string
    email: string
    name: string
    phone: string | null
    role: string
    pendingDeletion: boolean
    deletedAt: Date | null
  } = {
    id: 'user-1',
    clerkId: 'clerk_1',
    email: 'cliente@dev.com',
    name: 'Cliente Dev',
    phone: null,
    role: 'CUSTOMER',
    pendingDeletion: false,
    deletedAt: null,
  }

  return { mockPrisma, fakeUser }
})

vi.mock('@tpc/db', () => ({
  prisma: mockPrisma,
  Role: { CUSTOMER: 'CUSTOMER', STAFF: 'STAFF', ADMIN: 'ADMIN' },
}))

vi.mock('../plugins/auth.js', async () => {
  const { default: fp } = await import('fastify-plugin')
  return {
    default: fp(
      async (app) => {
        app.decorate('requireAuth', async (request: { user?: typeof fakeUser }) => {
          request.user = fakeUser
        })
        app.decorate(
          'requireRole',
          () =>
            async (request: { user?: typeof fakeUser }) => {
              request.user = fakeUser
            },
        )
      },
      { name: 'auth' },
    ),
  }
})

vi.mock('../lib/queue.js', () => ({
  enqueue: vi.fn(async () => undefined),
  defineJob: vi.fn(),
  startNotificationsWorker: vi.fn(),
  NOTIFICATIONS_QUEUE: 'notifications',
  closeQueue: vi.fn(),
}))

import { buildServer } from '../server.js'

const id = '11111111-2222-3333-4444-555555555555'

const baseSolicitacao = {
  id,
  protocol: 'TPC-2026-00001',
  userId: fakeUser.id,
  carId: 'car-1',
  serviceId: 'svc-1',
  status: 'PENDENTE' as const,
  scheduledDate: new Date(),
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
}

describe('POST /solicitacoes/:id/cancel', () => {
  let app: Awaited<ReturnType<typeof buildServer>>

  beforeEach(async () => {
    vi.clearAllMocks()
    app = await buildServer()
    // Faking time AFTER buildServer: Fastify plugin loading usa timers reais.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2026, 4, 14, 14, 0))
  })

  afterEach(async () => {
    vi.useRealTimers()
    await app.close()
  })

  it('cancela com 100% de refund quando agendamento é >24h no futuro', async () => {
    const scheduledDate = new Date(2026, 4, 16) // 42h depois (manha=08h)
    mockPrisma.solicitacao.findFirst.mockResolvedValueOnce({
      ...baseSolicitacao,
      scheduledDate,
    })
    mockPrisma.pointsBalance.update.mockResolvedValueOnce({ available: 1750, reserved: 0 })
    mockPrisma.reservation.updateMany.mockResolvedValueOnce({ count: 1 })
    mockPrisma.transaction.create.mockResolvedValue({} as never)
    mockPrisma.solicitacao.update.mockResolvedValueOnce({
      ...baseSolicitacao,
      status: 'CANCELADA',
      refundPct: 100,
    })

    const res = await app.inject({
      method: 'POST',
      url: `/solicitacoes/${id}/cancel`,
      headers: { authorization: 'Bearer t' },
      payload: {},
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toMatchObject({ ok: true, refunded: 500, penalty: 0 })
    expect(body.solicitacao.refundPct).toBe(100)

    // Saldo: move 500 de reserved pra available (refund 100%)
    expect(mockPrisma.pointsBalance.update).toHaveBeenCalledWith({
      where: { userId: fakeUser.id },
      data: expect.objectContaining({
        reserved: { decrement: 500 },
        available: { increment: 500 },
        version: { increment: 1 },
      }),
    })

    // UNRESERVE de 500. NÃO cria DEBIT (sem multa).
    expect(mockPrisma.transaction.create).toHaveBeenCalledTimes(1)
    expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'UNRESERVE', amount: 500 }),
    })
  })

  it('cancela com 80% de refund quando agendamento é entre 2h e 24h', async () => {
    // Agendamento dia 15 manhã (08h) = 18h depois
    const scheduledDate = new Date(2026, 4, 15)
    mockPrisma.solicitacao.findFirst.mockResolvedValueOnce({
      ...baseSolicitacao,
      scheduledDate,
    })
    mockPrisma.pointsBalance.update.mockResolvedValueOnce({ available: 1650, reserved: 0 })
    mockPrisma.reservation.updateMany.mockResolvedValueOnce({ count: 1 })
    mockPrisma.transaction.create.mockResolvedValue({} as never)
    mockPrisma.solicitacao.update.mockResolvedValueOnce({
      ...baseSolicitacao,
      status: 'CANCELADA',
      refundPct: 80,
    })

    const res = await app.inject({
      method: 'POST',
      url: `/solicitacoes/${id}/cancel`,
      headers: { authorization: 'Bearer t' },
      payload: {},
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ ok: true, refunded: 400, penalty: 100 })

    // Saldo: -500 reserved, +400 available (80%)
    expect(mockPrisma.pointsBalance.update).toHaveBeenCalledWith({
      where: { userId: fakeUser.id },
      data: expect.objectContaining({
        reserved: { decrement: 500 },
        available: { increment: 400 },
      }),
    })

    // 2 transactions: UNRESERVE de 400 + DEBIT de 100 (multa)
    expect(mockPrisma.transaction.create).toHaveBeenCalledTimes(2)
    expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'UNRESERVE', amount: 400 }),
    })
    expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'DEBIT',
        amount: 100,
        metadata: expect.objectContaining({ reason: 'cancellation_penalty' }),
      }),
    })
  })

  it('rejeita cancelamento <2h antes', async () => {
    // Agendamento dia 14 tarde (13h) = -1h (já passou). computeRefundPct retorna null.
    const scheduledDate = new Date(2026, 4, 14)
    mockPrisma.solicitacao.findFirst.mockResolvedValueOnce({
      ...baseSolicitacao,
      slot: 'TARDE',
      scheduledDate,
    })

    const res = await app.inject({
      method: 'POST',
      url: `/solicitacoes/${id}/cancel`,
      headers: { authorization: 'Bearer t' },
      payload: {},
    })

    expect(res.statusCode).toBe(422)
    expect(res.json()).toMatchObject({
      error: { code: 'CANCEL_WINDOW_CLOSED' },
    })
    expect(mockPrisma.pointsBalance.update).not.toHaveBeenCalled()
  })

  it('rejeita cancelamento de solicitacao já em EM_EXEC', async () => {
    mockPrisma.solicitacao.findFirst.mockResolvedValueOnce({
      ...baseSolicitacao,
      status: 'EM_EXEC',
    })

    const res = await app.inject({
      method: 'POST',
      url: `/solicitacoes/${id}/cancel`,
      headers: { authorization: 'Bearer t' },
      payload: {},
    })

    expect(res.statusCode).toBe(409)
    expect(res.json()).toMatchObject({
      error: { code: 'SOLICITACAO_IN_EXECUTION' },
    })
  })

  it('rejeita cancelamento de solicitacao já CANCELADA', async () => {
    mockPrisma.solicitacao.findFirst.mockResolvedValueOnce({
      ...baseSolicitacao,
      status: 'CANCELADA',
    })

    const res = await app.inject({
      method: 'POST',
      url: `/solicitacoes/${id}/cancel`,
      headers: { authorization: 'Bearer t' },
      payload: {},
    })

    expect(res.statusCode).toBe(409)
    expect(res.json()).toMatchObject({
      error: { code: 'SOLICITACAO_NOT_CANCELABLE' },
    })
  })
})
