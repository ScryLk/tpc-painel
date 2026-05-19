import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockPrisma, fakeUser } = vi.hoisted(() => {
  type MockTx = {
    car: {
      count: ReturnType<typeof vi.fn>
      findFirst: ReturnType<typeof vi.fn>
      findMany: ReturnType<typeof vi.fn>
      create: ReturnType<typeof vi.fn>
      update: ReturnType<typeof vi.fn>
      updateMany: ReturnType<typeof vi.fn>
    }
    solicitacao: { count: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> }
    remapOrder: { count: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> }
  }

  const tx: MockTx = {
    car: {
      count: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    solicitacao: { count: vi.fn(), findMany: vi.fn() },
    remapOrder: { count: vi.fn(), findMany: vi.fn() },
  }

  const mockPrisma = {
    car: tx.car,
    solicitacao: tx.solicitacao,
    remapOrder: tx.remapOrder,
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

// Bypass do auth plugin: decora requireAuth pra apenas anexar fakeUser.
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

const carBase = {
  id: 'car-1',
  userId: fakeUser.id,
  brand: 'BMW',
  model: 'M340i',
  year: 2022,
  motorType: 'turbo',
  plate: 'BMW1M40',
  color: 'Cinza',
  isActive: true,
  mapState: 'STOCK',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  deletedAt: null,
}

describe('cars routes', () => {
  let app: Awaited<ReturnType<typeof buildServer>>

  beforeEach(async () => {
    vi.clearAllMocks()
    app = await buildServer()
  })

  afterEach(async () => {
    await app.close()
  })

  describe('GET /me/cars', () => {
    it('returns ordered list with empty activeOrder when no pending orders', async () => {
      mockPrisma.car.findMany.mockResolvedValueOnce([carBase])
      mockPrisma.solicitacao.findMany.mockResolvedValueOnce([])
      mockPrisma.remapOrder.findMany.mockResolvedValueOnce([])

      const res = await app.inject({
        method: 'GET',
        url: '/me/cars',
        headers: { authorization: 'Bearer t' },
      })

      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.meta).toEqual({ count: 1, limit: 3 })
      expect(body.cars[0]).toMatchObject({
        id: 'car-1',
        isActive: true,
        activeOrder: null,
        extraOrders: 0,
        warranty: null,
      })
    })

    it('enriches with activeOrder when Solicitacao is pending', async () => {
      mockPrisma.car.findMany.mockResolvedValueOnce([carBase])
      mockPrisma.solicitacao.findMany.mockResolvedValueOnce([
        {
          id: 'sol-1',
          carId: 'car-1',
          status: 'CONFIRMADA',
          service: { name: 'Stage 1' },
        },
      ])
      mockPrisma.remapOrder.findMany.mockResolvedValueOnce([])

      const res = await app.inject({
        method: 'GET',
        url: '/me/cars',
        headers: { authorization: 'Bearer t' },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().cars[0].activeOrder).toEqual({
        type: 'presencial',
        id: 'sol-1',
        label: 'Stage 1 · agendado',
      })
    })
  })

  describe('POST /me/cars', () => {
    const body = {
      brand: 'BMW',
      model: 'M340i',
      year: 2022,
      motorType: 'turbo',
      plate: 'BMW1M40',
      color: 'Cinza',
    }

    it('creates first car with isActive=true', async () => {
      mockPrisma.car.count.mockResolvedValueOnce(0)
      mockPrisma.car.findFirst.mockResolvedValueOnce(null)
      mockPrisma.car.create.mockResolvedValueOnce({ ...carBase, isActive: true })

      const res = await app.inject({
        method: 'POST',
        url: '/me/cars',
        headers: { authorization: 'Bearer t' },
        payload: body,
      })

      expect(res.statusCode).toBe(200)
      expect(mockPrisma.car.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ isActive: true, plate: 'BMW1M40' }),
      })
    })

    it('creates second car with isActive=false', async () => {
      mockPrisma.car.count.mockResolvedValueOnce(1)
      mockPrisma.car.findFirst.mockResolvedValueOnce(null)
      mockPrisma.car.create.mockResolvedValueOnce({
        ...carBase,
        id: 'car-2',
        plate: 'XYZ9A88',
        isActive: false,
      })

      const res = await app.inject({
        method: 'POST',
        url: '/me/cars',
        headers: { authorization: 'Bearer t' },
        payload: { ...body, plate: 'XYZ9A88' },
      })

      expect(res.statusCode).toBe(200)
      expect(mockPrisma.car.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ isActive: false }),
      })
    })

    it('rejects when garage limit reached', async () => {
      mockPrisma.car.count.mockResolvedValueOnce(3)

      const res = await app.inject({
        method: 'POST',
        url: '/me/cars',
        headers: { authorization: 'Bearer t' },
        payload: body,
      })

      expect(res.statusCode).toBe(422)
      expect(res.json()).toMatchObject({
        error: { code: 'GARAGE_LIMIT_REACHED' },
      })
      expect(mockPrisma.car.create).not.toHaveBeenCalled()
    })

    it('rejects duplicate plate (even if soft-deleted)', async () => {
      mockPrisma.car.count.mockResolvedValueOnce(1)
      mockPrisma.car.findFirst.mockResolvedValueOnce({ ...carBase, deletedAt: new Date() })

      const res = await app.inject({
        method: 'POST',
        url: '/me/cars',
        headers: { authorization: 'Bearer t' },
        payload: body,
      })

      expect(res.statusCode).toBe(409)
      expect(res.json()).toMatchObject({
        error: { code: 'PLATE_ALREADY_REGISTERED' },
      })
    })

    it('rejects invalid plate via Zod', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/me/cars',
        headers: { authorization: 'Bearer t' },
        payload: { ...body, plate: 'invalida' },
      })
      expect(res.statusCode).toBe(400)
    })
  })

  describe('POST /me/cars/:id/activate', () => {
    const targetId = '11111111-2222-3333-4444-555555555555'
    it('flips active flag in a transaction', async () => {
      mockPrisma.car.findFirst.mockResolvedValueOnce({ ...carBase, id: targetId, isActive: false })
      mockPrisma.car.updateMany.mockResolvedValueOnce({ count: 1 })
      mockPrisma.car.update.mockResolvedValueOnce({ ...carBase, id: targetId, isActive: true })

      const res = await app.inject({
        method: 'POST',
        url: `/me/cars/${targetId}/activate`,
        headers: { authorization: 'Bearer t' },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({ ok: true, activeCarId: targetId })
      expect(mockPrisma.car.updateMany).toHaveBeenCalledWith({
        where: { userId: fakeUser.id, isActive: true },
        data: { isActive: false },
      })
    })

    it('is a no-op when car is already active', async () => {
      mockPrisma.car.findFirst.mockResolvedValueOnce({ ...carBase, id: targetId, isActive: true })

      const res = await app.inject({
        method: 'POST',
        url: `/me/cars/${targetId}/activate`,
        headers: { authorization: 'Bearer t' },
      })

      expect(res.statusCode).toBe(200)
      expect(mockPrisma.car.updateMany).not.toHaveBeenCalled()
    })
  })

  describe('DELETE /me/cars/:id', () => {
    const targetId = '11111111-2222-3333-4444-555555555555'

    it('soft-deletes the car and re-elects active when needed', async () => {
      const car = { ...carBase, id: targetId, isActive: true }
      mockPrisma.car.findFirst
        .mockResolvedValueOnce(car) // existence + ownership
        .mockResolvedValueOnce({ ...carBase, id: 'car-2', isActive: false }) // next active candidate
      mockPrisma.solicitacao.count.mockResolvedValueOnce(0)
      mockPrisma.remapOrder.count.mockResolvedValueOnce(0)
      mockPrisma.car.update.mockResolvedValue({} as never)

      const res = await app.inject({
        method: 'DELETE',
        url: `/me/cars/${targetId}`,
        headers: { authorization: 'Bearer t' },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({
        ok: true,
        deletedCarId: targetId,
        newActiveCarId: 'car-2',
      })
    })

    it('rejects deletion when car has pending presencial order', async () => {
      mockPrisma.car.findFirst.mockResolvedValueOnce({ ...carBase, id: targetId })
      mockPrisma.solicitacao.count.mockResolvedValueOnce(1)
      mockPrisma.remapOrder.count.mockResolvedValueOnce(0)

      const res = await app.inject({
        method: 'DELETE',
        url: `/me/cars/${targetId}`,
        headers: { authorization: 'Bearer t' },
      })

      expect(res.statusCode).toBe(422)
      expect(res.json()).toMatchObject({
        error: { code: 'CAR_HAS_PENDING_ORDERS' },
      })
    })

    it('does not re-elect when deleted car was not active', async () => {
      const car = { ...carBase, id: targetId, isActive: false }
      mockPrisma.car.findFirst.mockResolvedValueOnce(car)
      mockPrisma.solicitacao.count.mockResolvedValueOnce(0)
      mockPrisma.remapOrder.count.mockResolvedValueOnce(0)
      mockPrisma.car.update.mockResolvedValue({} as never)

      const res = await app.inject({
        method: 'DELETE',
        url: `/me/cars/${targetId}`,
        headers: { authorization: 'Bearer t' },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({
        deletedCarId: targetId,
        newActiveCarId: null,
      })
      // findFirst chamado uma vez (verificação de ownership), não duas
      expect(mockPrisma.car.findFirst).toHaveBeenCalledTimes(1)
    })
  })
})
