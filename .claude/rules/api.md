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
- Jobs críticos (expire-reservation, notify-whatsapp, expire-remap-quote) tem
  retry com backoff exponencial.
- Falhou todas as tentativas? Loga em sentry + adiciona em dead-letter queue.

---

## WebSocket (Socket.IO) — chat de file service

Socket.IO usado pra chat real-time no fluxo de file service (RemapOrder).

### Setup
- Plugin `src/plugins/socketio.ts` registra Socket.IO sobre o Fastify HTTP.
- Handler em `src/ws/chat.ts`.

### Autenticação
- Cliente conecta passando JWT do Clerk no handshake.
- Server valida JWT antes de aceitar conexão.
- Se inválido, desconecta com `auth_error`.

```ts
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token
  const user = await verifyClerkToken(token)
  if (!user) return next(new Error('Unauthorized'))
  socket.data.user = user
  next()
})
```

### Rooms por pedido
- Cada `RemapOrder` tem sua sala (`order:${orderId}`)
- Cliente entra na sala do próprio pedido (validação de ownership)
- TPC staff pode entrar em qualquer sala (validação de role)

### Eventos

**Servidor → cliente**:
- `message:new` — payload: `{ id, body, senderType, fileId?, createdAt }`
- `file:uploaded` — payload: `{ fileId, kind, fileName }`
- `status:changed` — payload: `{ orderId, oldStatus, newStatus }`

**Cliente → servidor**:
- `typing` — cliente está digitando (opcional MVP)
- `read` — cliente leu mensagem X (opcional MVP)

### Persistência
- TODA mensagem é gravada em DB antes de emitir via WebSocket.
- Cliente desconectado recebe mensagens via REST GET `/remap-orders/:id/messages` na próxima conexão.
- WebSocket é canal de tempo-real, não de verdade. DB é source of truth.

### Fallback
- Cliente sem WebSocket faz long-polling em `GET /remap-orders/:id/messages?since=<timestamp>`
- Socket.IO já faz fallback automático.

---

## Upload de arquivos — file service

Upload de `.bin`, `.ori`, `.frf`, `.kess`, `.fls` no `RemapOrder`.

### Limites
- Tamanho máx: 16MB (validar client-side e server-side)
- Extensões aceitas: `.bin`, `.ori`, `.frf`, `.kess`, `.fls`
- Validar via magic bytes (não confiar em extensão)

### Fluxo de upload
1. Frontend calcula SHA256 do arquivo (client-side, via Web Crypto API)
2. POST multipart pra `/remap-orders/:id/files`
3. Server valida:
   - Tamanho dentro do limite
   - Extensão aceita
   - User tem acesso ao order
   - SHA256 não duplicado (dedup)
4. Server sobe pra Cloudflare R2 em path estruturado:
   ```
   users/{userId}/orders/{orderId}/{kind}_{sha256[:8]}.bin
   ```
5. Cria `RemapFile` no DB com r2Key, sha256, fileSize, fileName, kind
6. Dispara mensagem de sistema no chat
7. Notifica TPC interno (Slack/Discord webhook)

### Storage paths (R2)
Estrutura hierárquica facilita auditoria + bulk operations:
```
r2://tpc-files/
├── users/{userId}/
│   ├── orders/{orderId}/
│   │   ├── original_a3f4e1c2.bin
│   │   ├── modified_b7d2f841.bin
│   │   └── report_c1e9a623.pdf
│   └── nfs/{nfId}.pdf
```

### Signed URLs pra download
- NUNCA expor `r2Key` direto. Sempre signed URL temporária.
- Validade default: 1h
- Endpoint: `GET /files/:fileId/download`
- Server valida:
  - User tem acesso ao file (ownership ou role staff)
  - File não foi deletado (deletedAt is null)
- Server gera signed URL e redireciona (302) ou retorna `{ url, expiresAt }`

### Integridade
- SHA256 calculado client-side antes do upload
- Server recalcula após upload e compara
- Se difere → arquivo corrompido durante transferência → falha + retry

### Anti-pirataria (V2, NÃO no MVP)
Quando TPC decidir implementar:
- Marca d'água digital com hash do `userId` embutida no arquivo modificado
- Vinculação ao chassi informado no upload (TPC mapeia incluindo trava)
- Limite de N downloads (counter no DB, signed URL expira)
- Logs de download (quem baixou, quando, IP)

---

## LGPD — endpoints obrigatórios

Cliente brasileiro tem direitos garantidos por lei. Endpoints:

### `GET /me/data-export`
Cria job pra gerar ZIP com todos os dados do user:
- Dados pessoais (User)
- Histórico (Solicitacao, Purchase, Transaction, RemapOrder)
- Arquivos modificados (link pra download de cada um)
- Carros (Car)
- Cartões salvos (apenas brand + last4, NUNCA tokens)
- Mensagens (Message do chat)
- Consentimentos (Consent)

Server retorna `DataExportRequest` com status `processing`. Job roda async, emite
push/email quando ZIP estiver pronto pra download (signed URL R2, validade 7 dias).

### `DELETE /me/account`
Solicita exclusão. NÃO apaga imediato (período de carência opcional). Body:
```ts
{
  reason?: string,
  confirmText: 'EXCLUIR',  // cliente digita pra confirmar
}
```

Lógica:
1. Valida `confirmText === 'EXCLUIR'`
2. Cria `AccountDeletion` com `scheduledFor = now() + 30 days`
3. Marca user como `pendingDeletion = true`
4. Bloqueia novos pedidos/compras
5. Cliente recebe email "Conta agendada pra exclusão em 30 dias. Pra cancelar, faz login antes"
6. Job diário verifica `AccountDeletion` vencidas e executa:
   - Anonimiza dados pessoais (PII)
   - Mantém Transaction e Purchase por 5 anos (Lei 8.846/94)
   - Deleta arquivos R2 (.bin originais e modificados)
   - Deleta cartões salvos
   - Deleta mensagens do chat
7. Após anonimização, conta efetivamente excluída

### `GET /me/consents`
Lista consentimentos atuais. Default values:
```json
{
  "marketingEmail": false,
  "marketingWhatsapp": false,
  "transactionalPush": true,
  "transactionalEmail": true,
  "transactionalWhatsapp": true
}
```

### `PUT /me/consents`
Atualiza consentimentos. Cliente pode mudar a qualquer momento.

### Princípios LGPD aplicados
- **Default OFF pra marketing** (opt-in obrigatório)
- **Default ON pra transacional** (mas pode desligar)
- **Direito de portabilidade**: export
- **Direito de esquecimento**: exclusão (com prazo)
- **Direito de retificação**: cliente edita dados pessoais
- **Transparência**: política de privacidade visível e atualizada

---

## Lógica de saldo de pontos

`PointsBalance` tem 2 campos: `available` e `reserved`. Total real = soma.

### Operações

**Comprar pontos (CREDIT)**:
- Webhook MP `approved` → incrementa `available`
- Cria `Transaction(CREDIT)`

**Solicitar serviço presencial (RESERVE)**:
- Move pts de `available` pra `reserved`
- Cria `Reservation(solicitacaoId)`
- Cria `Transaction(RESERVE)`

**Solicitar file service (RESERVE)** (padrão, não custom):
- Move pts de `available` pra `reserved`
- Cria `Reservation(remapOrderId)`
- Cria `Transaction(RESERVE)`

**Aceitar quote de file service custom (RESERVE)**:
- Move pts de `available` pra `reserved`
- Cria `Reservation(remapOrderId)`
- Cria `Transaction(RESERVE)`

**TPC confirma serviço (presencial) ou cliente aprova arquivo (remap) — DEBIT**:
- Move pts de `reserved` pra histórico (vira `Transaction(DEBIT)`)
- Atualiza Solicitacao/RemapOrder com `pointsDebited`

**Cliente cancela / TPC nega / reserva expira (UNRESERVE)**:
- Move pts de `reserved` pra `available`
- Cria `Transaction(UNRESERVE)`
- Se cancelamento com multa (24h-2h presencial), parte vai pra `DEBIT` e parte pra `UNRESERVE`

### Constraints no DB
- `available >= 0` (constraint)
- `reserved >= 0` (constraint)
- `available + reserved <= sum(CREDIT) - sum(DEBIT)` (audit check)

### Concorrência
- Toda operação de saldo em transação Prisma com SERIALIZABLE
- Otimistic locking via `version` field
- Webhook MP retentado não duplica crédito (idempotência via `mpTransactionId`)

---

## Não fazer

- Não usar `request.body as any`. Use Zod.
- Não retornar Prisma model direto (vaza schema interno). Mapeia pra DTO.
- Não gravar dados sensíveis em log (CPF, cartão, etc).
- Não chamar APIs externas sincronamente dentro de webhook do MP.
  Jogue em job, responda 200, processe depois.
- Não expor `r2Key` em response (sempre signed URL).
- Não emitir evento WebSocket sem persistir mensagem em DB antes.
- Não permitir saldo negativo (constraint + check explícito).
- Não esquecer LGPD em endpoints novos (consentimento, propósito, retenção).
