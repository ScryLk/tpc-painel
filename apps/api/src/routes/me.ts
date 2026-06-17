import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { updateProfileSchema } from '@tpc/lib/validators'

import { ConflictError, NotFoundError, UnauthorizedError } from '../lib/errors.js'

export const meRoutes: FastifyPluginAsync = async (app) => {
  app.get('/me', { preHandler: [app.requireAuth] }, async (request) => {
    const user = request.user
    if (!user) throw new UnauthorizedError()

    const [balance, full] = await Promise.all([
      app.prisma.pointsBalance.findUnique({ where: { userId: user.id } }),
      app.prisma.user.findUnique({
        where: { id: user.id },
        include: { address: true },
      }),
    ])

    return {
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      name: user.name,
      phone: user.phone,
      cpfCnpj: full?.cpfCnpj ?? null,
      avatarUrl: full?.avatarUrl ?? null,
      role: user.role,
      onboardingDismissedAt: full?.onboardingDismissedAt?.toISOString() ?? null,
      address: full?.address
        ? {
            cep: full.address.cep,
            street: full.address.street,
            number: full.address.number,
            complement: full.address.complement,
            neighborhood: full.address.neighborhood,
            city: full.address.city,
            state: full.address.state,
          }
        : null,
      balance: {
        available: balance?.available ?? 0,
        reserved: balance?.reserved ?? 0,
      },
    }
  })

  // PATCH /me/profile — atualiza dados pessoais editáveis pelo cliente.
  // Email não muda aqui (Clerk-managed, fluxo próprio de verificação).
  app.patch('/me/profile', { preHandler: [app.requireAuth] }, async (request) => {
    const user = request.user
    if (!user) throw new UnauthorizedError()

    const body = updateProfileSchema.parse(request.body)

    await app.prisma.$transaction(async (tx) => {
      // Update user fields se algum dos relevantes veio no body.
      const userUpdates: Record<string, string | null> = {}
      if (body.name !== undefined) userUpdates.name = body.name
      if (body.phone !== undefined) userUpdates.phone = body.phone || null
      if (body.cpfCnpj !== undefined) {
        const next = body.cpfCnpj || null
        // Check unique (pode falhar com P2002 do prisma, mas validamos aqui pra
        // dar mensagem amigável).
        if (next) {
          const conflict = await tx.user.findFirst({
            where: { cpfCnpj: next, NOT: { id: user.id } },
            select: { id: true },
          })
          if (conflict) {
            throw new ConflictError(
              'CPF_CNPJ_TAKEN',
              'Esse CPF/CNPJ já está cadastrado em outra conta.',
            )
          }
        }
        userUpdates.cpfCnpj = next
      }
      if (Object.keys(userUpdates).length > 0) {
        await tx.user.update({ where: { id: user.id }, data: userUpdates })
      }

      // Address: null limpa, object faz upsert.
      if (body.address !== undefined) {
        if (body.address === null) {
          await tx.address.deleteMany({ where: { userId: user.id } })
        } else {
          await tx.address.upsert({
            where: { userId: user.id },
            create: { userId: user.id, ...body.address },
            update: body.address,
          })
        }
      }
    })

    // Notif de sistema. Best-effort, não bloqueia o PATCH.
    try {
      await app.prisma.notification.create({
        data: {
          userId: user.id,
          kind: 'INFO',
          title: 'Perfil atualizado',
          body: 'Teus dados foram salvos com sucesso.',
          link: '/perfil',
          source: 'profile',
        },
      })
    } catch {
      /* swallow */
    }

    return { ok: true }
  })

  // PATCH /me/avatar — só salva a URL do avatar (a imagem é hospedada pelo
  // Clerk via setProfileImage do client SDK). Aqui só persistimos a URL final.
  const avatarBodySchema = z.object({
    avatarUrl: z.string().url().nullable(),
  })
  app.patch('/me/avatar', { preHandler: [app.requireAuth] }, async (request) => {
    const user = request.user
    if (!user) throw new UnauthorizedError()
    const { avatarUrl } = avatarBodySchema.parse(request.body)

    await app.prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl },
    })

    return { ok: true, avatarUrl }
  })

  // Marca o welcome modal do onboarding como dismissado. Idempotente: chamar
  // 2x não sobrescreve a primeira data (preserva o "primeiro dismiss" pra
  // auditoria, e evita corrida quando o user clica X enquanto a primeira
  // request ainda está em voo).
  app.post(
    '/me/onboarding/dismiss',
    { preHandler: [app.requireAuth] },
    async (request) => {
      const user = request.user
      if (!user) throw new UnauthorizedError()

      const current = await app.prisma.user.findUnique({
        where: { id: user.id },
        select: { onboardingDismissedAt: true },
      })

      if (current?.onboardingDismissedAt) {
        return {
          ok: true,
          dismissedAt: current.onboardingDismissedAt.toISOString(),
        }
      }

      const updated = await app.prisma.user.update({
        where: { id: user.id },
        data: { onboardingDismissedAt: new Date() },
        select: { onboardingDismissedAt: true },
      })

      return {
        ok: true,
        dismissedAt: updated.onboardingDismissedAt!.toISOString(),
      }
    },
  )

  app.get('/me/saldo', { preHandler: [app.requireAuth] }, async (request) => {
    const user = request.user
    if (!user) throw new UnauthorizedError()

    const balance = await app.prisma.pointsBalance.findUnique({
      where: { userId: user.id },
    })
    const available = balance?.available ?? 0
    const reserved = balance?.reserved ?? 0

    return { available, reserved, total: available + reserved }
  })

  app.get('/me/cartoes-salvos', { preHandler: [app.requireAuth] }, async (request) => {
    const user = request.user
    if (!user) throw new UnauthorizedError()

    const cards = await app.prisma.savedCard.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        brand: true,
        lastFour: true,
        holderName: true,
        expMonth: true,
        expYear: true,
        isDefault: true,
      },
    })
    return { cards }
  })

  const cardIdSchema = z.object({ id: z.string().uuid() })

  app.delete(
    '/me/cartoes-salvos/:id',
    { preHandler: [app.requireAuth] },
    async (request) => {
      const user = request.user
      if (!user) throw new UnauthorizedError()
      const { id } = cardIdSchema.parse(request.params)

      const card = await app.prisma.savedCard.findFirst({
        where: { id, userId: user.id, deletedAt: null },
      })
      if (!card) throw new NotFoundError('SavedCard')

      await app.prisma.savedCard.update({
        where: { id },
        data: { deletedAt: new Date() },
      })
      return { ok: true }
    },
  )

  const atividadeQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })

  // Timeline da home: últimas transactions com descrição amigável pra render.
  // Junta Purchase (CREDIT vindo de compra de pacote) e futuras Solicitacao /
  // RemapOrder (DEBIT/UNRESERVE) via includes nulláveis.
  app.get('/me/atividade', { preHandler: [app.requireAuth] }, async (request) => {
    const user = request.user
    if (!user) throw new UnauthorizedError()
    const { limit } = atividadeQuerySchema.parse(request.query)

    const transactions = await app.prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        purchase: {
          select: {
            mpPaymentMethod: true,
            package: { select: { name: true, bonusPoints: true } },
          },
        },
        solicitacao: {
          select: {
            service: { select: { name: true } },
            car: { select: { brand: true, model: true } },
          },
        },
        remapOrder: {
          select: {
            remapService: { select: { name: true } },
          },
        },
      },
    })

    const items = transactions.map((tx) => {
      let title = ''
      let subtitle = ''

      if (tx.purchase && tx.type === 'CREDIT') {
        const bonus = tx.purchase.package.bonusPoints
        const method = tx.purchase.mpPaymentMethod === 'PIX' ? 'Pix' : 'Cartão'
        title = `Pacote ${tx.purchase.package.name} creditado`
        subtitle = bonus > 0 ? `${tx.amount - bonus} + ${bonus} bônus · ${method}` : method
      } else if (tx.solicitacao) {
        const svc = tx.solicitacao.service.name
        const car = tx.solicitacao.car
          ? `${tx.solicitacao.car.brand} ${tx.solicitacao.car.model}`
          : null
        title = `${svc}${tx.type === 'DEBIT' ? ' concluído' : ''}`
        subtitle = car ?? tx.type
      } else if (tx.remapOrder) {
        title = `${tx.remapOrder.remapService?.name ?? 'Pedido por arquivo'}`
        subtitle = tx.type
      } else {
        title = tx.type === 'CREDIT' ? 'Crédito' : 'Movimento de pontos'
        subtitle = ''
      }

      return {
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        balanceAfter: tx.balanceAfter,
        title,
        subtitle,
        createdAt: tx.createdAt.toISOString(),
      }
    })

    return { items }
  })
}
