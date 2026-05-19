import fp from 'fastify-plugin'
import type { FastifyPluginAsync, FastifyRequest } from 'fastify'

import { Role, type User } from '@tpc/db'

import { clerk, verifyClerkToken } from '../lib/clerk.js'
import { ForbiddenError, UnauthorizedError } from '../lib/errors.js'

declare module 'fastify' {
  interface FastifyInstance {
    requireAuth: (request: FastifyRequest) => Promise<void>
    requireRole: (role: Role) => (request: FastifyRequest) => Promise<void>
  }
  interface FastifyRequest {
    user?: User
    clerkUserId?: string
  }
}

type ClerkPublicMetadata = { role?: string } & Record<string, unknown>

const deriveRole = (metadata: ClerkPublicMetadata | undefined): Role => {
  const raw = metadata?.role
  if (raw === 'tpc-staff' || raw === 'STAFF' || raw === 'staff') return Role.STAFF
  if (raw === 'admin' || raw === 'ADMIN') return Role.ADMIN
  return Role.CUSTOMER
}

const extractBearerToken = (header: string | undefined): string => {
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing Bearer token')
  }
  return header.slice('Bearer '.length).trim()
}

const authPlugin: FastifyPluginAsync = async (app) => {
  app.decorate('requireAuth', async (request: FastifyRequest) => {
    const token = extractBearerToken(request.headers.authorization)

    let clerkUserId: string
    try {
      const payload = await verifyClerkToken(token)
      clerkUserId = payload.sub
    } catch (err) {
      request.log.debug({ err }, 'clerk token verification failed')
      throw new UnauthorizedError('Invalid or expired token')
    }

    request.clerkUserId = clerkUserId

    // Lazy sync: try to find user, fall back to fetching Clerk profile and
    // upserting on first authenticated request. Upsert handles the race where
    // two parallel requests for a brand-new user arrive simultaneously.
    let user = await app.prisma.user.findUnique({ where: { clerkId: clerkUserId } })

    if (!user) {
      const clerkUser = await clerk.users.getUser(clerkUserId)
      const primaryEmail = clerkUser.emailAddresses.find(
        (e) => e.id === clerkUser.primaryEmailAddressId,
      )?.emailAddress
      if (!primaryEmail) {
        throw new UnauthorizedError('Clerk user has no primary email')
      }
      const name =
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
        primaryEmail
      const phone = clerkUser.phoneNumbers[0]?.phoneNumber ?? null
      const role = deriveRole(clerkUser.publicMetadata as ClerkPublicMetadata)

      user = await app.prisma.user.upsert({
        where: { clerkId: clerkUserId },
        create: {
          clerkId: clerkUserId,
          email: primaryEmail,
          name,
          phone,
          role,
          balance: { create: {} },
          consent: { create: {} },
        },
        update: {},
      })
    }

    if (user.deletedAt || user.pendingDeletion) {
      throw new UnauthorizedError('Account is no longer active')
    }

    request.user = user
  })

  app.decorate('requireRole', (role: Role) => async (request: FastifyRequest) => {
    await app.requireAuth(request)
    const current = request.user
    if (!current) throw new UnauthorizedError()
    if (current.role !== role && current.role !== Role.ADMIN) {
      throw new ForbiddenError(`Requires role ${role}`)
    }
  })
}

export default fp(authPlugin, { name: 'auth', dependencies: ['prisma'] })
