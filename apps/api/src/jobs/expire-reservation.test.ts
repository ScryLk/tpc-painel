import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockPrisma, mockEnqueue } = vi.hoisted(() => {
  type MockTx = {
    solicitacao: { updateMany: ReturnType<typeof vi.fn> }
    reservation: { update: ReturnType<typeof vi.fn> }
    pointsBalance: { update: ReturnType<typeof vi.fn> }
    transaction: { create: ReturnType<typeof vi.fn> }
  }
  const tx: MockTx = {
    solicitacao: { updateMany: vi.fn() },
    reservation: { update: vi.fn() },
    pointsBalance: { update: vi.fn() },
    transaction: { create: vi.fn() },
  }
  const mockPrisma = {
    reservation: { findMany: vi.fn(), update: tx.reservation.update },
    solicitacao: { updateMany: tx.solicitacao.updateMany },
    pointsBalance: { update: tx.pointsBalance.update },
    transaction: { create: tx.transaction.create },
    $transaction: vi.fn(async (fn: (innerTx: MockTx) => unknown) => fn(tx)),
    $connect: vi.fn(async () => undefined),
    $disconnect: vi.fn(async () => undefined),
  }
  const mockEnqueue = vi.fn(async () => undefined)
  return { mockPrisma, mockEnqueue }
})

vi.mock('@tpc/db', () => ({
  prisma: mockPrisma,
  Role: { CUSTOMER: 'CUSTOMER', STAFF: 'STAFF', ADMIN: 'ADMIN' },
}))

vi.mock('../lib/queue.js', () => ({
  enqueue: mockEnqueue,
  defineJob: vi.fn(),
  startNotificationsWorker: vi.fn(),
  scheduleRepeatable: vi.fn(),
  NOTIFICATIONS_QUEUE: 'notifications',
  closeQueue: vi.fn(),
}))

import { expireReservationProcessor } from './expire-reservation.js'

const fakeJob = { log: vi.fn() } as unknown as Parameters<typeof expireReservationProcessor>[0]

const reservationFixture = {
  id: 'res-1',
  userId: 'user-1',
  amount: 500,
  solicitacaoId: 'sol-1',
  remapOrderId: null,
  expiresAt: new Date('2026-05-13T00:00:00Z'),
  releasedAt: null,
  createdAt: new Date('2026-05-12T00:00:00Z'),
  solicitacao: {
    id: 'sol-1',
    protocol: 'TPC-2026-00001',
    pointsReserved: 500,
    userId: 'user-1',
    user: { email: 'cliente@dev.com' },
    service: { name: 'Stage 1' },
  },
}

describe('expireReservationProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('expires a pending reservation atomically and enqueues email', async () => {
    mockPrisma.reservation.findMany.mockResolvedValueOnce([reservationFixture])
    mockPrisma.solicitacao.updateMany.mockResolvedValueOnce({ count: 1 })
    mockPrisma.pointsBalance.update.mockResolvedValueOnce({ available: 1750, reserved: 0 })
    mockPrisma.reservation.update.mockResolvedValueOnce({} as never)
    mockPrisma.transaction.create.mockResolvedValueOnce({} as never)

    const result = await expireReservationProcessor(fakeJob)

    expect(result).toEqual({ scanned: 1, expired: 1 })

    // Solicitação vira CANCELADA com cancelReason
    expect(mockPrisma.solicitacao.updateMany).toHaveBeenCalledWith({
      where: { id: 'sol-1', status: 'PENDENTE' },
      data: expect.objectContaining({
        status: 'CANCELADA',
        cancelReason: 'reserva_expirada',
        refundPct: 100,
      }),
    })

    // Saldo: move 500 reserved -> available
    expect(mockPrisma.pointsBalance.update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: expect.objectContaining({
        reserved: { decrement: 500 },
        available: { increment: 500 },
        version: { increment: 1 },
      }),
    })

    // Transaction UNRESERVE com metadata
    expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'UNRESERVE',
        amount: 500,
        balanceAfter: 1750,
        solicitacaoId: 'sol-1',
        reservationId: 'res-1',
        metadata: { reason: 'reservation_expired' },
      }),
    })

    // Reservation marcada released
    expect(mockPrisma.reservation.update).toHaveBeenCalledWith({
      where: { id: 'res-1' },
      data: { releasedAt: expect.any(Date) },
    })

    // Notifica cliente
    expect(mockEnqueue).toHaveBeenCalledWith(
      'notify-email',
      expect.objectContaining({
        userId: 'user-1',
        email: 'cliente@dev.com',
        pointsCredited: 500,
        kind: 'reservation_expired',
      }),
    )
  })

  it('skips when concurrent cancellation already processed (count=0)', async () => {
    mockPrisma.reservation.findMany.mockResolvedValueOnce([reservationFixture])
    // updateMany retorna count=0 (race: Solicitacao já não é mais PENDENTE)
    mockPrisma.solicitacao.updateMany.mockResolvedValueOnce({ count: 0 })

    const result = await expireReservationProcessor(fakeJob)

    expect(result).toEqual({ scanned: 1, expired: 0 })
    expect(mockPrisma.pointsBalance.update).not.toHaveBeenCalled()
    expect(mockPrisma.transaction.create).not.toHaveBeenCalled()
    expect(mockPrisma.reservation.update).not.toHaveBeenCalled()
    expect(mockEnqueue).not.toHaveBeenCalled()
  })

  it('processes multiple reservations independently', async () => {
    const second = {
      ...reservationFixture,
      id: 'res-2',
      userId: 'user-2',
      amount: 300,
      solicitacaoId: 'sol-2',
      solicitacao: {
        ...reservationFixture.solicitacao,
        id: 'sol-2',
        protocol: 'TPC-2026-00002',
        pointsReserved: 300,
        userId: 'user-2',
        user: { email: 'cliente2@dev.com' },
      },
    }
    mockPrisma.reservation.findMany.mockResolvedValueOnce([reservationFixture, second])
    mockPrisma.solicitacao.updateMany.mockResolvedValue({ count: 1 })
    mockPrisma.pointsBalance.update.mockResolvedValue({ available: 1000, reserved: 0 })
    mockPrisma.reservation.update.mockResolvedValue({} as never)
    mockPrisma.transaction.create.mockResolvedValue({} as never)

    const result = await expireReservationProcessor(fakeJob)

    expect(result).toEqual({ scanned: 2, expired: 2 })
    expect(mockPrisma.solicitacao.updateMany).toHaveBeenCalledTimes(2)
    expect(mockEnqueue).toHaveBeenCalledTimes(2)
  })

  it('returns scanned=0 when no expired reservations', async () => {
    mockPrisma.reservation.findMany.mockResolvedValueOnce([])

    const result = await expireReservationProcessor(fakeJob)

    expect(result).toEqual({ scanned: 0, expired: 0 })
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('continues processing other reservations when enqueue fails', async () => {
    mockPrisma.reservation.findMany.mockResolvedValueOnce([reservationFixture])
    mockPrisma.solicitacao.updateMany.mockResolvedValueOnce({ count: 1 })
    mockPrisma.pointsBalance.update.mockResolvedValueOnce({ available: 1750, reserved: 0 })
    mockPrisma.reservation.update.mockResolvedValueOnce({} as never)
    mockPrisma.transaction.create.mockResolvedValueOnce({} as never)
    mockEnqueue.mockRejectedValueOnce(new Error('redis down'))

    const result = await expireReservationProcessor(fakeJob)

    // Refund foi feito mesmo com enqueue falhando
    expect(result).toEqual({ scanned: 1, expired: 1 })
    expect(mockPrisma.pointsBalance.update).toHaveBeenCalled()
  })
})
