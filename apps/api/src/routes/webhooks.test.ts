import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// vi.hoisted lifts these initializations above the vi.mock calls (which are
// themselves hoisted). Without it, the factory below references uninitialized
// vars at module load time.
const { mockPrisma, mockGetMpPayment, mockEnqueue } = vi.hoisted(() => {
  type MockTx = {
    purchase: { updateMany: ReturnType<typeof vi.fn> }
    pointsBalance: { upsert: ReturnType<typeof vi.fn> }
    transaction: { create: ReturnType<typeof vi.fn> }
    savedCard: { create: ReturnType<typeof vi.fn> }
  }

  const tx: MockTx = {
    purchase: { updateMany: vi.fn() },
    pointsBalance: { upsert: vi.fn() },
    transaction: { create: vi.fn() },
    savedCard: { create: vi.fn() },
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
    savedCard: {
      create: tx.savedCard.create,
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
  const mockEnqueue = vi.fn(async () => undefined)
  return { mockPrisma, mockGetMpPayment, mockEnqueue }
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

vi.mock('../lib/queue.js', () => ({
  enqueue: mockEnqueue,
  defineJob: vi.fn(),
  startNotificationsWorker: vi.fn(),
  NOTIFICATIONS_QUEUE: 'notifications',
  closeQueue: vi.fn(),
}))

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
  qrCode: null,
  qrCodeBase64: null,
  checkoutUrl: null,
  mpExpiresAt: null,
  saveCardSnapshot: null,
  paidAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  user: { email: 'cliente@dev.com', phone: '+5555550100' },
  package: { name: 'Stage 1' },
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

  it('enqueues notify-whatsapp and notify-email on approved credit', async () => {
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

    await app.inject({
      method: 'POST',
      url: '/webhooks/mercadopago',
      payload: validPayload,
    })

    expect(mockEnqueue).toHaveBeenCalledWith(
      'notify-whatsapp',
      expect.objectContaining({
        userId: purchaseFixture.userId,
        purchaseId: purchaseFixture.id,
        phone: purchaseFixture.user.phone,
        amountCents: purchaseFixture.amountCents,
        pointsCredited: purchaseFixture.pointsCredited,
        packageName: purchaseFixture.package.name,
      }),
    )
    expect(mockEnqueue).toHaveBeenCalledWith(
      'notify-email',
      expect.objectContaining({
        userId: purchaseFixture.userId,
        purchaseId: purchaseFixture.id,
        email: purchaseFixture.user.email,
        cpfCnpj: null,
      }),
    )
    expect(mockEnqueue).toHaveBeenCalledTimes(2)
  })

  it('creates SavedCard when purchase carries saveCardSnapshot', async () => {
    const snapshot = {
      brand: 'visa',
      lastFour: '4242',
      holderName: 'Rafael Mendes',
      expMonth: 8,
      expYear: new Date().getFullYear() + 2,
      mpCardToken: 'mock-perm-tok-xyz',
    }
    mockPrisma.purchase.findUnique.mockResolvedValueOnce({
      ...purchaseFixture,
      mpPaymentMethod: 'CREDIT_CARD',
      saveCardSnapshot: snapshot,
    })
    mockGetMpPayment.mockResolvedValueOnce({
      id: 'mp-payment-1',
      status: 'approved',
      externalReference: purchaseFixture.id,
      amountCents: 45000,
      paymentMethod: 'credit_card',
      installments: 3,
    })
    mockPrisma.purchase.updateMany.mockResolvedValueOnce({ count: 1 })
    mockPrisma.pointsBalance.upsert.mockResolvedValueOnce({ available: 1800, reserved: 0 })
    mockPrisma.transaction.create.mockResolvedValueOnce({ id: 'tx-1' })
    mockPrisma.savedCard.create.mockResolvedValueOnce({ id: 'card-1' })

    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/mercadopago',
      payload: validPayload,
    })

    expect(res.statusCode).toBe(200)
    expect(mockPrisma.savedCard.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: purchaseFixture.userId,
        mpCardToken: 'mock-perm-tok-xyz',
        brand: 'visa',
        lastFour: '4242',
        holderName: 'Rafael Mendes',
        expMonth: 8,
        expYear: snapshot.expYear,
        isDefault: false,
      }),
    })
  })

  it('skips SavedCard creation when no snapshot is stored', async () => {
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

    await app.inject({
      method: 'POST',
      url: '/webhooks/mercadopago',
      payload: validPayload,
    })

    expect(mockPrisma.savedCard.create).not.toHaveBeenCalled()
  })

  it('is idempotent: second webhook does not credit, enqueue or save card', async () => {
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
    expect(mockPrisma.savedCard.create).not.toHaveBeenCalled()
    expect(mockEnqueue).not.toHaveBeenCalled()
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
    expect(mockEnqueue).not.toHaveBeenCalled()
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
    expect(mockEnqueue).not.toHaveBeenCalled()
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
