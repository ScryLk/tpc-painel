// Loaded by vitest BEFORE any test module imports. Sets env vars so the
// strict Zod env loader in src/lib/env.ts passes without a real .env file.

process.env.NODE_ENV = 'test'
process.env.MP_MOCK = 'true'
process.env.MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET ?? ''
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://test:test@localhost:5432/test?schema=public'
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379'
process.env.CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY ?? 'sk_test_placeholder'
