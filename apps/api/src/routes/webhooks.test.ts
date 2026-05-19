import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// vi.hoisted lifts these initializations above the vi.mock calls (which are
// themselves hoisted). Without it, the factory below references uninitialized
// vars at module load time.
const { mockPrisma, mockGetMpPayment } = vi.hoisted(() => {
  type MockTx = {
    purchase: { updateMany: ReturnType<typeof vi.fn> }
    pointsBalance: { upsert: ReturnType<typeof vi.fn> }
    transaction: { create: ReturnType<typeof vi.fn> }
  }

  const tx: MockTx = {
    purchase: { updateMany: vi.fn() },
    pointsBalance: { upsert: vi.fn() },
    transaction: { create: vi.fn() },
  }

  const mockPrisma = {
    purchase: {
      findUnique: vi.fn(),
      updateMany: tx.purchase.updateMany,
      update: vi.fn(),
    },
    pointsBalance: {
      upsert: tx.pointsBalance.upsert,
    },
    transaction: {
      create: tx.transaction.create,
    },
    $transaction: vi.fn(async (fn: (tx: MockTx) => unknown) => fn(tx)),
    $connect: vi.fn(async () => undefined),
    $disconnect: vi.fn(async () => undefined),
    user: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  }

  const mockGetMpPayment = vi.fn()
  return { mockPrisma, mockGetMpPayment }
})

vi.mock('@tpc/db', () => ({
  prisma: mockPrisma,
  Role: { CUSTOMER: 'CUSTOMER', STAFF: 'STAFF', ADMIN: 'ADMIN' },
}))

vi.mock('../lib/mercadopago.js', async () => {
  const actual = await vi.importActual<typeof import('../lib/mercadopago.js')>(
    '../lib/mercadopago.js',
  )
  return { ...actual, getMpPayment: mockGetMpPayment }
})

import { buildServer } from '../server.js'

const validPayload = {
  id: 12345,
  type: 'payment',
  action: 'payment.updated',
  data: { id: 'mp-payment-1' },
}

const purchaseFixture = {
  id: '11111111-1111-1111-1111-111111111111',
  userId: 'user-1',
  packageId: 'pkg-1',
  mpTransactionId: 'mp-payment-1',
  mpPaymentMethod: 'PIX',
  amountCents: 45000,
  installments: 1,
  pointsCredited: 550,
  status: 'PENDING',
  cpfCnpj: null,
  paidAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('POST /webhooks/mercadopago', () => {
  let app: Awaited<ReturnType<typeof buildServer>>

  beforeEach(async () => {
    vi.clearAllMocks()
    app = await buildServer()
  })

  afterEach(async () => {
    await app.close()
  })

  it('responds 200 and credits points when payment is approved', async () => {
    mockPrisma.purchase.findUnique.mockResolvedValueOnce(purchaseFixture)
    mockGetMpPayment.mockResolvedValueOnce({
      id: 'mp-payment-1',
      status: 'approved',
      externalReference: purchaseFixture.id,
      amountCents: 45000,
      paymentMethod: 'pix',
      installments: 1,
    })
    mockPrisma.purchase.updateMany.mockResolvedValueOnce({ count: 1 })
    mockPrisma.pointsBalance.upsert.mockResolvedValueOnce({ available: 1800, reserved: 0 })
    mockPrisma.transaction.create.mockResolvedValueOnce({ id: 'tx-1' })

    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/mercadopago',
      payload: validPayload,
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ ok: true, credited: true })

    expect(mockPrisma.purchase.updateMany).toHaveBeenCalledWith({
      where: { id: purchaseFixture.id, status: 'PENDING' },
      data: expect.objectContaining({ status: 'APPROVED' }),
    })
    expect(mockPrisma.pointsBalance.upsert).toHaveBeenCalledWith({
      where: { userId: purchaseFixture.userId },
      create: expect.objectContaining({ available: purchaseFixture.pointsCredited }),
      update: expect.objectContaining({
        available: { increment: purchaseFixture.pointsCredited },
        version: { increment: 1 },
      }),
    })
    expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'CREDIT',
        amount: purchaseFixture.pointsCredited,
        balanceAfter: 1800,
        purchaseId: purchaseFixture.id,
      }),
    })
  })

  it('is idempotent: second webhook does not credit again', async () => {
    mockPrisma.purchase.findUnique.mockResolvedValueOnce({
      ...purchaseFixture,
      status: 'APPROVED',
    })
    mockGetMpPayment.mockResolvedValueOnce({
      id: 'mp-payment-1',
      status: 'approved',
      externalReference: purchaseFixture.id,
      amountCents: 45000,
      paymentMethod: 'pix',
      installments: 1,
    })
    // updateMany returns 0 because the status guard does not match.
    mockPrisma.purchase.updateMany.mockResolvedValueOnce({ count: 0 })

    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/mercadopago',
      payload: validPayload,
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({
      ok: true,
      credited: false,
      reason: 'already_processed',
    })

    expect(mockPrisma.pointsBalance.upsert).not.toHaveBeenCalled()
    expect(mockPrisma.transaction.create).not.toHaveBeenCalled()
  })

  it('marks purchase as rejected when payment is rejected', async () => {
    mockPrisma.purchase.findUnique.mockResolvedValueOnce(purchaseFixture)
    mockGetMpPayment.mockResolvedValueOnce({
      id: 'mp-payment-1',
      status: 'rejected',
      externalReference: purchaseFixture.id,
      amountCents: 45000,
      paymentMethod: 'pix',
      installments: 1,
    })
    mockPrisma.purchase.updateMany.mockResolvedValueOnce({ count: 1 })

    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/mercadopago',
      payload: validPayload,
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ ok: true, status: 'rejected' })
    expect(mockPrisma.purchase.updateMany).toHaveBeenCalledWith({
      where: { id: purchaseFixture.id, status: 'PENDING' },
      data: { status: 'REJECTED' },
    })
    expect(mockPrisma.pointsBalance.upsert).not.toHaveBeenCalled()
  })

  it('returns 200 when payment id is unknown (no purchase match)', async () => {
    mockPrisma.purchase.findUnique.mockResolvedValueOnce(null)

    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/mercadopago',
      payload: { ...validPayload, data: { id: 'unrelated-id' } },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ ok: true, unknownPurchase: true })
    expect(mockGetMpPayment).not.toHaveBeenCalled()
  })

  it('responds 200 without crediting when status is in_process', async () => {
    mockPrisma.purchase.findUnique.mockResolvedValueOnce(purchaseFixture)
    mockGetMpPayment.mockResolvedValueOnce({
      id: 'mp-payment-1',
      status: 'in_process',
      externalReference: purchaseFixture.id,
      amountCents: 45000,
      paymentMethod: 'pix',
      installments: 1,
    })

    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/mercadopago',
      payload: validPayload,
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ ok: true, status: 'in_process' })
    expect(mockPrisma.purchase.updateMany).not.toHaveBeenCalled()
    expect(mockPrisma.pointsBalance.upsert).not.toHaveBeenCalled()
  })

  it('ignores non-payment notification types', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/mercadopago',
      payload: { ...validPayload, type: 'merchant_order' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ ok: true, ignored: true })
    expect(mockPrisma.purchase.findUnique).not.toHaveBeenCalled()
  })
})
