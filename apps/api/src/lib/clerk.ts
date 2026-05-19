import { createClerkClient, verifyToken as clerkVerifyToken } from '@clerk/backend'

import { env } from './env.js'

export const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY })

export const verifyClerkToken = (
  token: string,
): ReturnType<typeof clerkVerifyToken> =>
  clerkVerifyToken(token, { secretKey: env.CLERK_SECRET_KEY })
