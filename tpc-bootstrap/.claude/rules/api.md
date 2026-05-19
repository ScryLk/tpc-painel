# Rules: API (Fastify backend)

Escopo: `apps/api/**`

## Fastify routing

- Use Fastify plugin pattern. Cada arquivo de `routes/` exporta um plugin:

  ```ts
  import { FastifyPluginAsync } from 'fastify'
  export const pacotesRoutes: FastifyPluginAsync = async (app) => {
    app.get('/pacotes', async () => { /* ... */ })
  }
  ```

- Registro centralizado em `src/server.ts`. Não auto-discovery por enquanto.
- Path prefix por arquivo: `app.register(pacotesRoutes, { prefix: '/pacotes' })`.

## Validação Zod sempre

Toda input externa passa por Zod schema. Nunca acessa `request.body` direto.

```ts
import { z } from 'zod'

const comprarPacoteSchema = z.object({
  packageId: z.string().uuid(),
  paymentMethod: z.enum(['pix', 'card']),
  installments: z.number().int().min(1).max(3).optional(),
})

app.post('/pacotes/comprar', async (request) => {
  const body = comprarPacoteSchema.parse(request.body)
  // body é tipado, validado, seguro
})
```

Compartilhe schemas com frontend via `@tpc/lib/validators` quando o mesmo
shape é usado nos dois lados.

## Error handling

- Errors HTTP custom em `src/lib/errors.ts`. Nunca lançar `new Error()` cru
  em route handler.
- Use `BusinessError`, `NotFoundError`, `ValidationError`, etc.
- Plugin `src/plugins/error.ts` centraliza serialização pra JSON consistente:

  ```json
  { "error": { "code": "INSUFFICIENT_BALANCE", "message": "Saldo insuficiente" } }
  ```

- Frontend lida com `code`, não com `message` (mensagem pode mudar, code é estável).

## Auth com Clerk

- Plugin `src/plugins/auth.ts` extrai user do JWT. Anexa em `request.user`.
- Rotas protegidas adicionam `preHandler: [app.requireAuth]`.
- Pra rotas admin, `preHandler: [app.requireAuth, app.requireRole('tpc-staff')]`.

## Webhook Mercado Pago — atenção

- Sempre validar assinatura HMAC. Sem isso, qualquer um cria crédito de pontos.
- Idempotente: usar `transaction.id` do MP como chave única em `Purchase`.
  Re-receber webhook não duplica crédito.
- Retry-safe: webhook pode chegar 5+ vezes. Sempre check se já processou.
- Demora resposta = MP retenta. Responda 200 ASAP mesmo se job é assíncrono.

## Jobs (BullMQ + Redis)

- Jobs assíncronos em `src/jobs/`. Cada um exporta `name`, `processor`, e
  `schedule()`.
- Jobs críticos (expire-reservation, notify-whatsapp) tem retry com backoff
  exponencial.
- Falhou todas as tentativas? Loga em sentry + adiciona em dead-letter queue.

## Não fazer

- Não usar `request.body as any`. Use Zod.
- Não retornar Prisma model direto (vaza schema interno). Mapeia pra DTO.
- Não gravar dados sensíveis em log (CPF, cartão, etc).
- Não chamar APIs externas sincronamente dentro de webhook do MP.
  Jogue em job, responda 200, processe depois.
