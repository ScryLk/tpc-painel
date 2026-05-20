import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockPrisma, fakeUser } = vi.hoisted(() => {
  type MockTx = {
    car: { findFirst: ReturnType<typeof vi.fn> }
    remapService: { findFirst: ReturnType<typeof vi.fn> }
    remapOrder: {
      findFirst: ReturnType<typeof vi.fn>
      findUnique: ReturnType<typeof vi.fn>
      create: ReturnType<typeof vi.fn>
      update: ReturnType<typeof vi.fn>
      count: ReturnType<typeof vi.fn>
    }
    pointsBalance: {
      findUnique: ReturnType<typeof vi.fn>
      updateMany: ReturnType<typeof vi.fn>
      update: ReturnType<typeof vi.fn>
    }
    reservation: {
      create: ReturnType<typeof vi.fn>
      updateMany: ReturnType<typeof vi.fn>
    }
    transaction: { create: ReturnType<typeof vi.fn> }
  }

  const tx: MockTx = {
    car: { findFirst: vi.fn() },
    remapService: { findFirst: vi.fn() },
    remapOrder: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    pointsBalance: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
    reservation: {
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    transaction: { create: vi.fn() },
  }

  const mockPrisma = {
    car: tx.car,
    remapService: tx.remapService,
    remapOrder: tx.remapOrder,
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
  scheduleRepeatable: vi.fn(),
  NOTIFICATIONS_QUEUE: 'notifications',
  closeQueue: vi.fn(),
}))

import { buildServer } from '../server.js'

const orderId = '11111111-2222-3333-4444-555555555555'
const serviceId = '22222222-3333-4444-5555-666666666666'

const baseOrder = {
  id: orderId,
  protocol: 'TPC-2026-00001',
  userId: fakeUser.id,
  carId: null,
  remapServiceId: serviceId,
  status: 'AWAITING_QUOTE' as const,
  isCustomQuote: true,
  ecuModel: null,
  hardwareUsed: null,
  readMode: null,
  vehicleVin: null,
  mileage: null,
  description: null,
  quotePoints: null,
  quoteAccepted: null,
  quoteExpiresAt: null,
  pointsReserved: 0,
  pointsDebited: 0,
  quotedAt: null,
  mappingStartedAt: null,
  deliveredAt: null,
  approvedAt: null,
  cancelledAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const baseService = {
  id: serviceId,
  slug: 'remap-stage1',
  name: 'Stage 1 (arquivo)',
  description: 'Remap básico',
  category: 'Performance',
  pts: 500,
  priceAvulsoCents: 70000,
  supports: ['Bosch'],
  isCustom: false,
  active: true,
}

describe('POST /remap-orders', () => {
  let app: Awaited<ReturnType<typeof buildServer>>

  beforeEach(async () => {
    vi.clearAllMocks()
    app = await buildServer()
  })

  afterEach(async () => {
    await app.close()
  })

  it('cria pedido custom em AWAITING_QUOTE sem reservar pts', async () => {
    mockPrisma.remapOrder.count.mockResolvedValueOnce(0)
    mockPrisma.remapOrder.create.mockResolvedValueOnce({
      ...baseOrder,
      isCustomQuote: true,
      remapServiceId: null,
    })

    const res = await app.inject({
      method: 'POST',
      url: '/remap-orders',
      headers: { authorization: 'Bearer t' },
      payload: {
        isCustomQuote: true,
        technicalData: { description: 'Quero algo personalizado' },
      },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.order.status).toBe('AWAITING_QUOTE')
    expect(body.order.pointsReserved).toBe(0)
    expect(body.order.isCustomQuote).toBe(true)

    // NÃO mexe em saldo, transactions, reservations
    expect(mockPrisma.pointsBalance.updateMany).not.toHaveBeenCalled()
    expect(mockPrisma.reservation.create).not.toHaveBeenCalled()
    expect(mockPrisma.transaction.create).not.toHaveBeenCalled()
  })

  it('cria pedido padrão em ANALYZING com RESERVE atômico', async () => {
    mockPrisma.remapService.findFirst.mockResolvedValueOnce(baseService)
    mockPrisma.pointsBalance.findUnique.mockResolvedValueOnce({
      userId: fakeUser.id,
      available: 1250,
      reserved: 0,
    })
    mockPrisma.pointsBalance.updateMany.mockResolvedValueOnce({ count: 1 })
    mockPrisma.pointsBalance.findUnique.mockResolvedValueOnce({
      userId: fakeUser.id,
      available: 750,
      reserved: 500,
    })
    mockPrisma.remapOrder.count.mockResolvedValueOnce(0)
    mockPrisma.remapOrder.create.mockResolvedValueOnce({
      ...baseOrder,
      isCustomQuote: false,
      status: 'ANALYZING',
      pointsReserved: 500,
    })
    mockPrisma.reservation.create.mockResolvedValueOnce({ id: 'res-1' })
    mockPrisma.transaction.create.mockResolvedValueOnce({})

    const res = await app.inject({
      method: 'POST',
      url: '/remap-orders',
      headers: { authorization: 'Bearer t' },
      payload: {
        serviceId,
        isCustomQuote: false,
        technicalData: { ecuModel: 'Bosch MED17.1', readMode: 'Bench' },
      },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().order.status).toBe('ANALYZING')

    expect(mockPrisma.pointsBalance.updateMany).toHaveBeenCalledWith({
      where: { userId: fakeUser.id, available: { gte: 500 } },
      data: expect.objectContaining({
        available: { decrement: 500 },
        reserved: { increment: 500 },
        version: { increment: 1 },
      }),
    })
    expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'RESERVE',
        amount: 500,
        remapOrderId: orderId,
      }),
    })
  })

  it('rejeita quando saldo insuficiente', async () => {
    mockPrisma.remapService.findFirst.mockResolvedValueOnce(baseService)
    mockPrisma.pointsBalance.findUnique.mockResolvedValueOnce({
      userId: fakeUser.id,
      available: 100,
      reserved: 0,
    })

    const res = await app.inject({
      method: 'POST',
      url: '/remap-orders',
      headers: { authorization: 'Bearer t' },
      payload: {
        serviceId,
        isCustomQuote: false,
        technicalData: {},
      },
    })

    expect(res.statusCode).toBe(422)
    expect(res.json()).toMatchObject({ error: { code: 'INSUFFICIENT_BALANCE' } })
    expect(mockPrisma.remapOrder.create).not.toHaveBeenCalled()
  })

  it('rejeita race quando updateMany count=0', async () => {
    mockPrisma.remapService.findFirst.mockResolvedValueOnce(baseService)
    mockPrisma.pointsBalance.findUnique.mockResolvedValueOnce({
      userId: fakeUser.id,
      available: 500,
      reserved: 0,
    })
    mockPrisma.pointsBalance.updateMany.mockResolvedValueOnce({ count: 0 })

    const res = await app.inject({
      method: 'POST',
      url: '/remap-orders',
      headers: { authorization: 'Bearer t' },
      payload: { serviceId, isCustomQuote: false, technicalData: {} },
    })

    expect(res.statusCode).toBe(422)
    expect(res.json()).toMatchObject({ error: { code: 'INSUFFICIENT_BALANCE' } })
  })

  it('bloqueia tentar usar serviço custom no fluxo padrão', async () => {
    mockPrisma.remapService.findFirst.mockResolvedValueOnce({
      ...baseService,
      isCustom: true,
      pts: 0,
    })

    const res = await app.inject({
      method: 'POST',
      url: '/remap-orders',
      headers: { authorization: 'Bearer t' },
      payload: { serviceId, isCustomQuote: false, technicalData: {} },
    })

    expect(res.statusCode).toBe(422)
    expect(res.json()).toMatchObject({ error: { code: 'CUSTOM_REQUIRES_QUOTE' } })
  })
})

describe('POST /remap-orders/:id/accept-quote', () => {
  let app: Awaited<ReturnType<typeof buildServer>>

  beforeEach(async () => {
    vi.clearAllMocks()
    app = await buildServer()
  })

  afterEach(async () => {
    await app.close()
  })

  it('aceita quote: reserva pts e move pra ANALYZING', async () => {
    mockPrisma.remapOrder.findFirst.mockResolvedValueOnce({
      ...baseOrder,
      status: 'QUOTE_SENT',
      quotePoints: 350,
    })
    mockPrisma.pointsBalance.updateMany.mockResolvedValueOnce({ count: 1 })
    mockPrisma.pointsBalance.findUnique.mockResolvedValueOnce({ available: 900 })
    mockPrisma.reservation.create.mockResolvedValueOnce({ id: 'res-1' })
    mockPrisma.transaction.create.mockResolvedValueOnce({})
    mockPrisma.remapOrder.update.mockResolvedValueOnce({
      ...baseOrder,
      status: 'ANALYZING',
      quoteAccepted: true,
      pointsReserved: 350,
    })

    const res = await app.inject({
      method: 'POST',
      url: `/remap-orders/${orderId}/accept-quote`,
      headers: { authorization: 'Bearer t' },
      payload: { accept: true },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({
      accepted: true,
      reserved: 350,
      order: { status: 'ANALYZING' },
    })
    expect(mockPrisma.pointsBalance.updateMany).toHaveBeenCalledWith({
      where: { userId: fakeUser.id, available: { gte: 350 } },
      data: expect.objectContaining({
        reserved: { increment: 350 },
        available: { decrement: 350 },
      }),
    })
    expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'RESERVE', amount: 350 }),
    })
  })

  it('recusa quote: vai pra CANCELLED sem reservar', async () => {
    mockPrisma.remapOrder.findFirst.mockResolvedValueOnce({
      ...baseOrder,
      status: 'QUOTE_SENT',
      quotePoints: 350,
    })
    mockPrisma.remapOrder.update.mockResolvedValueOnce({
      ...baseOrder,
      status: 'CANCELLED',
      quoteAccepted: false,
    })

    const res = await app.inject({
      method: 'POST',
      url: `/remap-orders/${orderId}/accept-quote`,
      headers: { authorization: 'Bearer t' },
      payload: { accept: false },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({
      accepted: false,
      reserved: 0,
      order: { status: 'CANCELLED' },
    })
    expect(mockPrisma.pointsBalance.updateMany).not.toHaveBeenCalled()
    expect(mockPrisma.reservation.create).not.toHaveBeenCalled()
  })

  it('rejeita accept-quote em estado errado', async () => {
    mockPrisma.remapOrder.findFirst.mockResolvedValueOnce({
      ...baseOrder,
      status: 'ANALYZING',
    })

    const res = await app.inject({
      method: 'POST',
      url: `/remap-orders/${orderId}/accept-quote`,
      headers: { authorization: 'Bearer t' },
      payload: { accept: true },
    })

    expect(res.statusCode).toBe(409)
    expect(res.json()).toMatchObject({ error: { code: 'INVALID_QUOTE_STATE' } })
  })

  it('rejeita accept com quotePoints faltando', async () => {
    mockPrisma.remapOrder.findFirst.mockResolvedValueOnce({
      ...baseOrder,
      status: 'QUOTE_SENT',
      quotePoints: null,
    })

    const res = await app.inject({
      method: 'POST',
      url: `/remap-orders/${orderId}/accept-quote`,
      headers: { authorization: 'Bearer t' },
      payload: { accept: true },
    })

    expect(res.statusCode).toBe(422)
    expect(res.json()).toMatchObject({ error: { code: 'QUOTE_MISSING' } })
  })

  it('rejeita accept quando saldo insuficiente', async () => {
    mockPrisma.remapOrder.findFirst.mockResolvedValueOnce({
      ...baseOrder,
      status: 'QUOTE_SENT',
      quotePoints: 10000,
    })
    mockPrisma.pointsBalance.updateMany.mockResolvedValueOnce({ count: 0 })

    const res = await app.inject({
      method: 'POST',
      url: `/remap-orders/${orderId}/accept-quote`,
      headers: { authorization: 'Bearer t' },
      payload: { accept: true },
    })

    expect(res.statusCode).toBe(422)
    expect(res.json()).toMatchObject({ error: { code: 'INSUFFICIENT_BALANCE' } })
  })
})

describe('POST /remap-orders/:id/cancel', () => {
  let app: Awaited<ReturnType<typeof buildServer>>

  beforeEach(async () => {
    vi.clearAllMocks()
    app = await buildServer()
  })

  afterEach(async () => {
    await app.close()
  })

  it('cancela AWAITING_QUOTE sem refund (nada foi reservado)', async () => {
    mockPrisma.remapOrder.findFirst.mockResolvedValueOnce({
      ...baseOrder,
      status: 'AWAITING_QUOTE',
      pointsReserved: 0,
    })
    mockPrisma.remapOrder.update.mockResolvedValueOnce({
      ...baseOrder,
      status: 'CANCELLED',
    })

    const res = await app.inject({
      method: 'POST',
      url: `/remap-orders/${orderId}/cancel`,
      headers: { authorization: 'Bearer t' },
      payload: {},
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ ok: true, refunded: 0 })
    expect(mockPrisma.pointsBalance.update).not.toHaveBeenCalled()
    expect(mockPrisma.reservation.updateMany).not.toHaveBeenCalled()
  })

  it('cancela ANALYZING com refund 100%', async () => {
    mockPrisma.remapOrder.findFirst.mockResolvedValueOnce({
      ...baseOrder,
      status: 'ANALYZING',
      pointsReserved: 500,
    })
    mockPrisma.remapOrder.update.mockResolvedValueOnce({
      ...baseOrder,
      status: 'CANCELLED',
    })
    mockPrisma.pointsBalance.update.mockResolvedValueOnce({ available: 1750 })
    mockPrisma.reservation.updateMany.mockResolvedValueOnce({ count: 1 })
    mockPrisma.transaction.create.mockResolvedValueOnce({})

    const res = await app.inject({
      method: 'POST',
      url: `/remap-orders/${orderId}/cancel`,
      headers: { authorization: 'Bearer t' },
      payload: {},
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ ok: true, refunded: 500 })
    expect(mockPrisma.pointsBalance.update).toHaveBeenCalledWith({
      where: { userId: fakeUser.id },
      data: expect.objectContaining({
        reserved: { decrement: 500 },
        available: { increment: 500 },
      }),
    })
    expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'UNRESERVE',
        amount: 500,
        metadata: { reason: 'order_cancelled' },
      }),
    })
  })

  it('bloqueia cancel em MAPPING (TPC já trabalhando)', async () => {
    mockPrisma.remapOrder.findFirst.mockResolvedValueOnce({
      ...baseOrder,
      status: 'MAPPING',
      pointsReserved: 500,
    })

    const res = await app.inject({
      method: 'POST',
      url: `/remap-orders/${orderId}/cancel`,
      headers: { authorization: 'Bearer t' },
      payload: {},
    })

    expect(res.statusCode).toBe(422)
    expect(res.json()).toMatchObject({ error: { code: 'CANCEL_REQUIRES_TPC' } })
    expect(mockPrisma.pointsBalance.update).not.toHaveBeenCalled()
  })

  it('bloqueia cancel em APPROVED', async () => {
    mockPrisma.remapOrder.findFirst.mockResolvedValueOnce({
      ...baseOrder,
      status: 'APPROVED',
    })

    const res = await app.inject({
      method: 'POST',
      url: `/remap-orders/${orderId}/cancel`,
      headers: { authorization: 'Bearer t' },
      payload: {},
    })

    expect(res.statusCode).toBe(409)
    expect(res.json()).toMatchObject({ error: { code: 'REMAP_ORDER_NOT_CANCELABLE' } })
  })
})

describe('POST /admin/remap-orders/:id/quote', () => {
  let app: Awaited<ReturnType<typeof buildServer>>

  beforeEach(async () => {
    vi.clearAllMocks()
    app = await buildServer()
  })

  afterEach(async () => {
    await app.close()
  })

  it('envia quote em AWAITING_QUOTE → QUOTE_SENT', async () => {
    mockPrisma.remapOrder.findUnique.mockResolvedValueOnce({
      ...baseOrder,
      status: 'AWAITING_QUOTE',
    })
    mockPrisma.remapOrder.update.mockResolvedValueOnce({
      ...baseOrder,
      status: 'QUOTE_SENT',
      quotePoints: 450,
      quotedAt: new Date(),
    })

    const res = await app.inject({
      method: 'POST',
      url: `/admin/remap-orders/${orderId}/quote`,
      headers: { authorization: 'Bearer t' },
      payload: { pointsProposed: 450 },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({
      status: 'QUOTE_SENT',
      quotePoints: 450,
    })
  })

  it('permite reorçamento em QUOTE_SENT (TPC corrigindo)', async () => {
    mockPrisma.remapOrder.findUnique.mockResolvedValueOnce({
      ...baseOrder,
      status: 'QUOTE_SENT',
      quotePoints: 300,
    })
    mockPrisma.remapOrder.update.mockResolvedValueOnce({
      ...baseOrder,
      status: 'QUOTE_SENT',
      quotePoints: 450,
    })

    const res = await app.inject({
      method: 'POST',
      url: `/admin/remap-orders/${orderId}/quote`,
      headers: { authorization: 'Bearer t' },
      payload: { pointsProposed: 450 },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ requoted: true, quotePoints: 450 })
  })

  it('bloqueia quote em ANALYZING', async () => {
    mockPrisma.remapOrder.findUnique.mockResolvedValueOnce({
      ...baseOrder,
      status: 'ANALYZING',
    })

    const res = await app.inject({
      method: 'POST',
      url: `/admin/remap-orders/${orderId}/quote`,
      headers: { authorization: 'Bearer t' },
      payload: { pointsProposed: 450 },
    })

    expect(res.statusCode).toBe(409)
    expect(res.json()).toMatchObject({ error: { code: 'INVALID_QUOTE_STATE' } })
  })
})
