import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { Role, type Prisma } from '@tpc/db'
import {
  listUsersQuerySchema,
  updateUserAdminSchema,
  updateUserRoleSchema,
} from '@tpc/lib/validators'

import { queueEmail, siteUrl } from '../../emails/jobs.js'
import { clerk } from '../../lib/clerk.js'
import {
  BusinessError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../lib/errors.js'

const PASSWORD_RESET_EXPIRES_SECONDS = 3600 // 1h

const idParamsSchema = z.object({ id: z.string().uuid() })
const sessionParamsSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().min(1),
})

// PII masking pra logs. Mantém só sufixos pra audit sem expor o valor pleno.
const maskPii = (v: string | null | undefined): string | null => {
  if (!v) return null
  if (v.length <= 4) return '***'
  return `***${v.slice(-4)}`
}

export const adminUsersRoutes: FastifyPluginAsync = async (app) => {
  // GET /admin/users
  // Lista paginada com busca livre por nome/email/cpfCnpj e filtro de role.
  app.get(
    '/admin/users',
    { preHandler: [app.requireRole(Role.STAFF)] },
    async (request) => {
      const { q, role, limit, cursor, includeDeleted } =
        listUsersQuerySchema.parse(request.query)

      const where: Prisma.UserWhereInput = {}
      if (!includeDeleted) where.deletedAt = null
      if (role) where.role = role
      if (q) {
        where.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { cpfCnpj: { contains: q.replace(/\D/g, '') || q } },
        ]
      }

      const rows = await app.prisma.user.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        include: {
          balance: { select: { available: true, reserved: true } },
          _count: { select: { cars: true } },
        },
      })

      const hasMore = rows.length > limit
      const items = (hasMore ? rows.slice(0, limit) : rows).map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        cpfCnpj: u.cpfCnpj,
        role: u.role,
        createdAt: u.createdAt.toISOString(),
        deletedAt: u.deletedAt?.toISOString() ?? null,
        pendingDeletion: u.pendingDeletion,
        balance: {
          available: u.balance?.available ?? 0,
          reserved: u.balance?.reserved ?? 0,
        },
        carsCount: u._count.cars,
      }))

      return {
        items,
        nextCursor: hasMore ? items[items.length - 1]!.id : null,
      }
    },
  )

  // GET /admin/users/:id
  // Detalhe completo + counts + últimas transações + consent.
  app.get(
    '/admin/users/:id',
    { preHandler: [app.requireRole(Role.STAFF)] },
    async (request) => {
      const { id } = idParamsSchema.parse(request.params)

      const user = await app.prisma.user.findUnique({
        where: { id },
        include: {
          address: true,
          balance: true,
          consent: true,
          _count: {
            select: {
              cars: true,
              purchases: true,
              solicitacoes: true,
              remapOrders: true,
            },
          },
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
              id: true,
              type: true,
              amount: true,
              balanceAfter: true,
              createdAt: true,
            },
          },
        },
      })

      if (!user) throw new NotFoundError('User')

      return {
        id: user.id,
        clerkId: user.clerkId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        cpfCnpj: user.cpfCnpj,
        avatarUrl: user.avatarUrl,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        deletedAt: user.deletedAt?.toISOString() ?? null,
        pendingDeletion: user.pendingDeletion,
        address: user.address
          ? {
              cep: user.address.cep,
              street: user.address.street,
              number: user.address.number,
              complement: user.address.complement,
              neighborhood: user.address.neighborhood,
              city: user.address.city,
              state: user.address.state,
            }
          : null,
        balance: {
          available: user.balance?.available ?? 0,
          reserved: user.balance?.reserved ?? 0,
        },
        consent: user.consent
          ? {
              marketingEmail: user.consent.marketingEmail,
              marketingWhatsapp: user.consent.marketingWhatsapp,
              transactionalEmail: user.consent.transactionalEmail,
              transactionalWhatsapp: user.consent.transactionalWhatsapp,
              transactionalPush: user.consent.transactionalPush,
            }
          : null,
        counts: {
          cars: user._count.cars,
          purchases: user._count.purchases,
          solicitacoes: user._count.solicitacoes,
          remapOrders: user._count.remapOrders,
        },
        recentTransactions: user.transactions.map((t) => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          balanceAfter: t.balanceAfter,
          createdAt: t.createdAt.toISOString(),
        })),
      }
    },
  )

  // PATCH /admin/users/:id
  // Edita dados básicos (name, phone, cpfCnpj). Email/avatar/role têm
  // endpoints próprios ou são gerenciados em outros fluxos.
  app.patch(
    '/admin/users/:id',
    { preHandler: [app.requireRole(Role.STAFF)] },
    async (request) => {
      const { id } = idParamsSchema.parse(request.params)
      const body = updateUserAdminSchema.parse(request.body)

      const existing = await app.prisma.user.findUnique({ where: { id } })
      if (!existing) throw new NotFoundError('User')

      // Pre-valida unicidade do CPF/CNPJ pra dar erro de domínio amigável
      // em vez de deixar o P2002 cru do Prisma vazar.
      if (body.cpfCnpj) {
        const conflict = await app.prisma.user.findFirst({
          where: { cpfCnpj: body.cpfCnpj, NOT: { id } },
          select: { id: true },
        })
        if (conflict) {
          throw new ConflictError(
            'CPF_CNPJ_CONFLICT',
            'CPF/CNPJ já cadastrado em outra conta',
          )
        }
      }

      const updates: Prisma.UserUpdateInput = {}
      if (body.name !== undefined) updates.name = body.name
      if (body.phone !== undefined) updates.phone = body.phone
      if (body.cpfCnpj !== undefined) updates.cpfCnpj = body.cpfCnpj

      const updated = await app.prisma.user.update({
        where: { id },
        data: updates,
      })

      request.log.info(
        {
          audit: 'user-update',
          targetUserId: id,
          actorUserId: request.user?.id,
          before: {
            name: existing.name,
            phone: maskPii(existing.phone),
            cpfCnpj: maskPii(existing.cpfCnpj),
          },
          after: {
            name: updated.name,
            phone: maskPii(updated.phone),
            cpfCnpj: maskPii(updated.cpfCnpj),
          },
        },
        'admin updated user',
      )

      return { ok: true }
    },
  )

  // PATCH /admin/users/:id/role
  // Mudança de role é escalation-sensitive: apenas ADMIN promove. STAFF
  // não pode promover ninguém. User não pode mudar a própria role.
  app.patch(
    '/admin/users/:id/role',
    { preHandler: [app.requireRole(Role.ADMIN)] },
    async (request) => {
      const actor = request.user
      if (!actor) throw new UnauthorizedError()

      const { id } = idParamsSchema.parse(request.params)
      const { role } = updateUserRoleSchema.parse(request.body)

      if (id === actor.id) {
        throw new BusinessError(
          'CANNOT_CHANGE_OWN_ROLE',
          'Não dá pra mudar a própria role. Peça pra outro admin',
        )
      }

      const target = await app.prisma.user.findUnique({ where: { id } })
      if (!target) throw new NotFoundError('User')

      if (target.role === role) return { ok: true, unchanged: true }

      await app.prisma.user.update({
        where: { id },
        data: { role },
      })

      request.log.warn(
        {
          audit: 'role-change',
          targetUserId: id,
          actorUserId: actor.id,
          before: target.role,
          after: role,
        },
        'admin changed user role',
      )

      return { ok: true }
    },
  )

  // GET /admin/users/:id/sessions
  // Lista sessões ativas do user via Clerk backend SDK. Não cacheamos porque
  // o ponto da feature é ver o estado real-time. Falhas do Clerk degradam pra
  // 503 (não 500) porque a indisponibilidade é externa.
  app.get(
    '/admin/users/:id/sessions',
    { preHandler: [app.requireRole(Role.STAFF)] },
    async (request) => {
      const { id } = idParamsSchema.parse(request.params)

      const user = await app.prisma.user.findUnique({
        where: { id },
        select: { clerkId: true },
      })
      if (!user) throw new NotFoundError('User')

      let sessions
      try {
        sessions = await clerk.sessions.getSessionList({
          userId: user.clerkId,
          status: 'active',
        })
      } catch (err) {
        request.log.error({ err, targetUserId: id }, 'clerk sessions list failed')
        throw new BusinessError(
          'CLERK_UNAVAILABLE',
          'Não foi possível consultar sessões agora. Tenta de novo em alguns segundos',
        )
      }

      const items = sessions.data.map((s) => ({
        id: s.id,
        status: s.status,
        createdAt: new Date(s.createdAt).toISOString(),
        lastActiveAt: new Date(s.lastActiveAt).toISOString(),
        expireAt: new Date(s.expireAt).toISOString(),
        browser: s.latestActivity?.browserName ?? null,
        browserVersion: s.latestActivity?.browserVersion ?? null,
        deviceType: s.latestActivity?.deviceType ?? null,
        isMobile: s.latestActivity?.isMobile ?? false,
        city: s.latestActivity?.city ?? null,
        country: s.latestActivity?.country ?? null,
        ipAddress: s.latestActivity?.ipAddress ?? null,
      }))

      return { items }
    },
  )

  // POST /admin/users/:id/sessions/:sessionId/revoke
  // Força logout de uma sessão específica. Verifica que a sessão pertence ao
  // user pra não permitir admin revogar sessões alheias por palpite de ID.
  // Caveat: o JWT que o cliente carrega não invalida instantaneamente — ele
  // expira no próximo refresh (5 min por default no Clerk). Pra logout
  // instant, o cliente precisa recarregar.
  app.post(
    '/admin/users/:id/sessions/:sessionId/revoke',
    { preHandler: [app.requireRole(Role.STAFF)] },
    async (request) => {
      const actor = request.user
      if (!actor) throw new UnauthorizedError()

      const { id, sessionId } = sessionParamsSchema.parse(request.params)

      const target = await app.prisma.user.findUnique({
        where: { id },
        select: { clerkId: true },
      })
      if (!target) throw new NotFoundError('User')

      // Confere ownership antes de revogar: busca a sessão e valida userId.
      let session
      try {
        session = await clerk.sessions.getSession(sessionId)
      } catch (err) {
        request.log.warn({ err, sessionId }, 'clerk session lookup failed')
        throw new NotFoundError('Session')
      }
      if (session.userId !== target.clerkId) {
        throw new ForbiddenError('Session does not belong to this user')
      }

      try {
        await clerk.sessions.revokeSession(sessionId)
      } catch (err) {
        request.log.error(
          { err, sessionId, targetUserId: id },
          'clerk session revoke failed',
        )
        throw new BusinessError(
          'CLERK_REVOKE_FAILED',
          'Não foi possível revogar a sessão. Tenta de novo',
        )
      }

      request.log.warn(
        {
          audit: 'session-revoke',
          targetUserId: id,
          actorUserId: actor.id,
          sessionId,
        },
        'admin revoked user session',
      )

      return { ok: true }
    },
  )

  // POST /admin/users/:id/password-reset
  // Gera um sign-in token no Clerk (one-time, expira em 1h) e dispara email
  // pro endereço cadastrado com o link. O admin nunca vê a senha — o user
  // clica no link, entra logado, e troca a senha no /perfil → Segurança.
  //
  // O email é enviado sempre, mesmo se consent.marketingEmail=false. É
  // transacional (recuperação de conta), não marketing.
  app.post(
    '/admin/users/:id/password-reset',
    { preHandler: [app.requireRole(Role.STAFF)] },
    async (request) => {
      const actor = request.user
      if (!actor) throw new UnauthorizedError()

      const { id } = idParamsSchema.parse(request.params)

      const target = await app.prisma.user.findUnique({
        where: { id },
        select: { clerkId: true, email: true, name: true, deletedAt: true },
      })
      if (!target) throw new NotFoundError('User')
      if (target.deletedAt) {
        throw new BusinessError(
          'USER_DELETED',
          'Conta deletada. Reset de senha não aplicável',
        )
      }

      let signIn
      try {
        signIn = await clerk.signInTokens.createSignInToken({
          userId: target.clerkId,
          expiresInSeconds: PASSWORD_RESET_EXPIRES_SECONDS,
        })
      } catch (err) {
        request.log.error(
          { err, targetUserId: id },
          'clerk sign-in token creation failed',
        )
        throw new BusinessError(
          'CLERK_TOKEN_FAILED',
          'Não foi possível gerar o link agora. Tenta de novo',
        )
      }

      // Revoga todas as sessões ativas do user antes de mandar o email.
      // Prática padrão em flow de password reset: se a conta está sendo
      // recuperada (possivelmente comprometida), qualquer sessão pré-existente
      // não deve continuar válida. Falha aqui é não-fatal — o sign-in token
      // já existe, ainda permite o reset; logamos pra audit.
      let revokedCount = 0
      try {
        const sessions = await clerk.sessions.getSessionList({
          userId: target.clerkId,
          status: 'active',
        })
        const results = await Promise.allSettled(
          sessions.data.map((s) => clerk.sessions.revokeSession(s.id)),
        )
        revokedCount = results.filter((r) => r.status === 'fulfilled').length
        const failed = results.length - revokedCount
        if (failed > 0) {
          request.log.warn(
            { targetUserId: id, failed, attempted: results.length },
            'some sessions failed to revoke during password reset',
          )
        }
      } catch (err) {
        request.log.warn(
          { err, targetUserId: id },
          'failed to enumerate sessions during password reset',
        )
      }

      // signIn.url aponta pro accounts portal hosted do Clerk (clerk.accounts.dev).
      // Como temos sign-in embedded em /sign-in, montamos a URL no nosso domínio
      // com o ticket — o componente <SignIn /> detecta o __clerk_ticket
      // automaticamente e completa o login sem senha.
      const resetUrl = `${siteUrl()}/sign-in?__clerk_ticket=${encodeURIComponent(signIn.token)}`

      await queueEmail({
        kind: 'passwordReset',
        to: target.email,
        props: {
          siteUrl: siteUrl(),
          customerName: target.name,
          resetUrl,
          expiresInMinutes: Math.round(PASSWORD_RESET_EXPIRES_SECONDS / 60),
          sessionsRevoked: revokedCount,
        },
      })

      request.log.warn(
        {
          audit: 'password-reset',
          targetUserId: id,
          actorUserId: actor.id,
          signInTokenId: signIn.id,
          revokedSessions: revokedCount,
        },
        'admin initiated password reset',
      )

      return {
        ok: true,
        expiresInMinutes: Math.round(PASSWORD_RESET_EXPIRES_SECONDS / 60),
        sentTo: target.email,
        revokedSessions: revokedCount,
      }
    },
  )
}

