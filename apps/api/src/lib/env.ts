import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().positive().default(3001),
  // PORT (env padrão de Render/Heroku/Fly) tem prioridade sobre API_PORT
  // quando setado. Necessário pra deploy em PaaS que injeta PORT dinâmico
  // sem precisar mexer no start command.
  PORT: z.coerce.number().int().positive().optional(),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  CLERK_SECRET_KEY: z.string().min(1, 'CLERK_SECRET_KEY is required'),

  // Mercado Pago. Opcional em dev quando MP_MOCK=true (default).
  MP_ACCESS_TOKEN: z.string().optional(),
  MP_PUBLIC_KEY: z.string().optional(),
  MP_WEBHOOK_SECRET: z.string().optional(),
  MP_MOCK: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),

  // URL pública do api (usada como notification_url nas preferências MP).
  API_PUBLIC_URL: z.string().url().default('http://localhost:3001'),

  // Email (Resend). Opcional em dev: se RESEND_API_KEY não vier, o envio
  // entra em modo dry-run (loga no stdout em vez de mandar).
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('TPC Performance <onboarding@resend.dev>'),
  EMAIL_REPLY_TO: z.string().email().optional(),
  // Email que recebe a notificação quando um lead novo chega pela landing.
  // Em produção, apontar pro endereço do time de atendimento TPC. Em dev sem
  // config, RESEND_API_KEY ausente faz dry-run (loga sem enviar).
  ADMIN_EMAIL: z.string().email().optional(),
  // Token compartilhado que a landing externa envia no header X-Lead-Token
  // ao POST /leads. Falhar sem token = 401. Sem rate limit no app, então
  // o token é a primeira barreira contra abuso público.
  LEADS_INGEST_TOKEN: z.string().min(16).optional(),
  // URL absoluta usada nos templates pra montar links (botões pro app).
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment configuration:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
export type Env = z.infer<typeof envSchema>
