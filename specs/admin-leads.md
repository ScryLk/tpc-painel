# Feature: Admin · Leads da Landing

> Status: rascunho, pronto pra implementar
> Versão: 0.1
> Atualizado: 2026-05-26
> Primeiro fluxo do painel admin. Escolhido como warm-up porque não toca em
> saldo, pagamento, ou pontos.

---

## Contexto

A landing page externa (tpcperformance.com.br) tem form de contato. Hoje, leads
chegam por email solto pro time TPC, que responde manualmente. Esse fluxo é
frágil: emails se perdem, sem audit, sem padrão de resposta, sem visibilidade
de quem já respondeu.

A spec move esse fluxo pro painel:
- Landing POSTa lead na API do painel (não envia email direto pro time)
- Painel armazena lead, dispara email de notificação pro admin
- Admin abre o painel, vê lista de leads pendentes, abre um lead, escreve
  resposta, envia
- Cliente recebe email formatado vindo do domínio TPC
- Lead vira `REPLIED` no painel, fica em histórico

Decisão (Lucas + Claude): persistir lead no DB, 1 resposta por lead, conversa
contínua acontece fora do app (WhatsApp/email do cliente). Painel é só o ponto
de triagem inicial.

---

## Requisitos funcionais

### Ingest (landing → painel)
- [ ] `POST /leads` aceita JSON com `name`, `email`, `phone`, `vehicle`, `year`,
  `message`. Todos opcionais menos `name`, `email`, `message`
- [ ] Endpoint NÃO requer Clerk JWT (landing é separada)
- [ ] Endpoint exige header `X-Lead-Token` com valor igual a
  `env.LEADS_INGEST_TOKEN`. Sem o token correto, 401
- [ ] Validação Zod com mensagens em PT-BR
- [ ] Email validado por regex, max 200 chars
- [ ] Message max 4000 chars (anti-flood)
- [ ] Captura `userAgent` e `ip` (via `request.ip` do Fastify) pra audit
- [ ] Idempotência via header `Idempotency-Key` (opcional): se vier, e já
  existe Lead com mesmo key nas últimas 24h, retorna o lead existente em
  vez de criar duplicado
- [ ] Enfileira email de notificação pra `env.LEADS_ADMIN_EMAIL` após criação
- [ ] Retorna `{ ok: true, leadId: string }` em 201

### Listar (admin)
- [ ] `GET /admin/leads` (Clerk auth, role `STAFF` ou `ADMIN`)
- [ ] Query params: `status` (NEW | REPLIED | ARCHIVED, default NEW),
  `limit` (default 30, max 100), `cursor` (lead id pra paginar)
- [ ] Retorna `{ items: Lead[], nextCursor: string | null, counts: { NEW, REPLIED, ARCHIVED } }`
- [ ] Ordenação: mais recentes primeiro
- [ ] Lead.message truncado em 200 chars no list response (full vai pelo detail)

### Detalhe (admin)
- [ ] `GET /admin/leads/:id`
- [ ] Retorna lead completo + `repliedAt`, `replyMessage`, `repliedByUserId`
  quando aplicável

### Responder (admin)
- [ ] `POST /admin/leads/:id/reply`
- [ ] Body: `{ message: string }` (max 4000 chars, min 10 chars)
- [ ] Só permite quando `lead.status === 'NEW'`. Se já `REPLIED`, retorna
  `BusinessError('LEAD_ALREADY_REPLIED')`
- [ ] Enfileira email de resposta pra `lead.email` (template `LeadResponse`)
- [ ] Em transação: atualiza lead com `status: 'REPLIED'`, `replyMessage`,
  `repliedAt`, `repliedByUserId`
- [ ] Retorna lead atualizado

### Arquivar (admin)
- [ ] `POST /admin/leads/:id/archive`
- [ ] Body vazio
- [ ] Permite só de `NEW` → `ARCHIVED` (não permite arquivar `REPLIED`)
- [ ] Usado pra dispensar spam ou leads inválidos sem responder
- [ ] Retorna lead atualizado

---

## Requisitos não-funcionais

- Endpoint público (`POST /leads`) tem rate limit aplicado no nível do nginx/
  Vercel (out of scope V1, mas anotar). Token compartilhado reduz superfície
  enquanto rate limit não chega
- Email da landing é PII: nunca logar `name`, `email`, `phone`, `message` em
  console em produção
- Admin UI mobile-friendly mas escritório-first (provavelmente uso em desktop)

---

## Decisões de design

### Lead persistido como source of truth, não email
Antes: email era a fonte. Agora: DB. Razão: audit, busca, evitar resposta
duplicada, métricas (quantos leads/semana, tempo médio de resposta).

### Token compartilhado em vez de auth via Clerk pra ingest
Landing é estática (Next.js export ou outro stack), não tem session Clerk.
Token compartilhado em ENV resolve com 1 linha de código. Quando virar
problema (token vazou? landing virou multi-tenant?), migra pra HMAC.

### 1 resposta por lead, fluxo continua fora
Reduz complexidade. WhatsApp é o canal natural de continuação no Brasil.
Painel registra que a primeira resposta saiu, pronto.

### Arquivar vs deletar
Soft state `ARCHIVED`, nunca delete. Lead é registro de tentativa de contato,
útil pra audit/marketing futuro.

### Notificação por email ao admin
MVP: 1 endereço fixo via `LEADS_ADMIN_EMAIL`. Quando time TPC crescer e cada
um quiser receber, vira lista (split por vírgula), ou query `User where role
in (STAFF, ADMIN)`. Não vamos pra Slack/Discord/Discord webhook no V1 — fica
pra Sprint admin V2.

### Reply-to do email de resposta = email do admin que respondeu
Quando cliente recebe a resposta, pode responder direto. O `replyTo` vai pro
`env.EMAIL_REPLY_TO` global (atendimento@tpc...), não pro admin individual,
por enquanto. Simplifica e não vaza email pessoal de staff.

### Templates reaproveitam HTML pronto do Lucas
Lucas trouxe 2 templates HTML inline já testados. Em vez de portar pra
react-email components, criamos `LeadAdminNotification.ts` e `LeadResponse.ts`
exportando strings de HTML. Diferente do padrão `.tsx` de react-email atual,
mas registra no mesmo pipeline `buildEmail` via novo case.

---

## Modelo de dados

```prisma
enum LeadStatus {
  NEW
  REPLIED
  ARCHIVED
}

model Lead {
  id              String      @id @default(uuid())
  name            String
  email           String
  phone           String?
  vehicle         String?
  year            String?
  message         String
  source          String      @default("landing")
  status          LeadStatus  @default(NEW)
  // Audit
  ipAddress       String?
  userAgent       String?
  // Resposta (preenchido quando status passa a REPLIED)
  replyMessage    String?
  repliedAt       DateTime?
  repliedByUserId String?
  // Dedupe
  idempotencyKey  String?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  repliedBy User? @relation(fields: [repliedByUserId], references: [id])

  @@index([status, createdAt(sort: Desc)])
  @@index([email])
  @@unique([idempotencyKey])
}
```

User precisa de relação reversa `leadReplies Lead[]`.

---

## Endpoints

### `POST /leads` (público + token)
- Headers: `X-Lead-Token: <env.LEADS_INGEST_TOKEN>`
- Headers opcional: `Idempotency-Key: <string>`
- Body:
  ```ts
  {
    name: string,           // min 2, max 120
    email: string,          // regex email, max 200
    phone?: string,         // max 30
    vehicle?: string,       // max 80
    year?: string,          // max 10 (string porque landing manda como string)
    message: string,        // min 5, max 4000
  }
  ```
- Erros:
  - `UNAUTHORIZED` (401) — token ausente ou errado
  - `VALIDATION_ERROR` (400) — Zod
- Response 201:
  ```ts
  { ok: true, leadId: string }
  ```

### `GET /admin/leads`
- Auth: Clerk + role STAFF ou ADMIN
- Query: `status?`, `limit?`, `cursor?`
- Response:
  ```ts
  {
    items: Array<{
      id, name, email, phone, vehicle, year,
      messagePreview: string,  // truncado em 200 chars
      status, createdAt, repliedAt,
    }>,
    nextCursor: string | null,
    counts: { NEW: number, REPLIED: number, ARCHIVED: number }
  }
  ```

### `GET /admin/leads/:id`
- Auth: Clerk + STAFF/ADMIN
- Response: Lead completo incluindo `message`, `replyMessage`, `repliedBy.name`

### `POST /admin/leads/:id/reply`
- Auth: Clerk + STAFF/ADMIN
- Body: `{ message: string }` (min 10, max 4000)
- Erros:
  - `LEAD_ALREADY_REPLIED` (422)
  - `NOT_FOUND` (404)
- Response: Lead atualizado

### `POST /admin/leads/:id/archive`
- Auth: Clerk + STAFF/ADMIN
- Body: vazio
- Erros:
  - `INVALID_TRANSITION` (422) se status não for NEW
  - `NOT_FOUND` (404)
- Response: Lead atualizado

---

## Frontend

### Estrutura
- `apps/web/app/admin/layout.tsx` — gate de role (server-side, redirect pra
  /dashboard se user não for STAFF/ADMIN)
- `apps/web/app/admin/page.tsx` — index (redireciona pra /admin/leads no V1)
- `apps/web/app/admin/leads/page.tsx` — list
- `apps/web/app/admin/leads/[id]/page.tsx` — detail
- `apps/web/app/admin/_components/AdminShell.tsx` — shell admin (sidebar,
  breadcrumb), separado do ClientShell pra não importar nav cliente

### Auth gate
- Layout admin chama `/me`, lê `role`, se não for STAFF/ADMIN faz
  `redirect('/dashboard')`
- Mostra link "Admin" no menu do user só quando role = STAFF/ADMIN

### Telas

**Lista de leads (`/admin/leads`)**
- Header: contadores (Novos N, Respondidos N, Arquivados N) como tabs
- Tab default: Novos
- Lista cards/rows: nome, email, veículo (se houver), preview da mensagem,
  data, ações (Abrir, Arquivar)
- Click em row abre `/admin/leads/[id]`

**Detalhe + resposta (`/admin/leads/[id]`)**
- Top: nome, email, phone clicável (`wa.me/<phone>`), veículo, ano, data
- Mensagem completa
- Se status NEW: textarea grande "Sua resposta" + botão "Enviar resposta"
  + nota "Cliente recebe email formatado da TPC"
- Se status REPLIED: mostra `replyMessage`, `repliedAt`, `repliedBy.name`,
  sem botão de responder
- Botão "Arquivar" disponível só em NEW
- Link "Voltar pra lista"

---

## Critérios de aceitação

### Backend
- [ ] `POST /leads` sem `X-Lead-Token` retorna 401
- [ ] `POST /leads` com token errado retorna 401
- [ ] `POST /leads` válido cria Lead e enfileira email pro admin
- [ ] `POST /leads` mesmo `Idempotency-Key` em <24h retorna mesmo leadId
- [ ] `POST /leads` mesmo `Idempotency-Key` >24h cria novo lead
- [ ] `GET /admin/leads` sem Clerk JWT retorna 401
- [ ] `GET /admin/leads` com role CUSTOMER retorna 403
- [ ] `GET /admin/leads?status=NEW` retorna só NEW
- [ ] `POST /admin/leads/:id/reply` em lead NEW: enfileira email +
  atualiza status pra REPLIED
- [ ] `POST /admin/leads/:id/reply` em REPLIED retorna 422
- [ ] `POST /admin/leads/:id/archive` em NEW: atualiza pra ARCHIVED
- [ ] `POST /admin/leads/:id/archive` em REPLIED retorna 422

### Frontend
- [ ] Customer logado tentando `/admin/leads` é redirecionado pra /dashboard
- [ ] Admin/staff vê lista de leads NEW por default
- [ ] Tabs trocam status filtrado
- [ ] Click em row abre detail
- [ ] Submit de resposta enfileira email e marca como REPLIED
- [ ] Após responder, página recarrega mostrando estado REPLIED
- [ ] Botão arquivar funciona em leads NEW

### Email
- [ ] Template admin notification renderiza com dados do lead
- [ ] Template response renderiza com mensagem custom + dados business
- [ ] Modo dry-run loga e não envia quando RESEND_API_KEY ausente

---

## Out of scope (v1)

- Multi-thread no mesmo lead (1 resposta só)
- Atribuir lead pra admin específico ("João pegou esse")
- Templates de resposta pré-definidos ("obrigado pelo contato...")
- Anexar arquivos na resposta
- Notificação por Slack/Discord/push pra admin
- Métricas/dashboard (leads/dia, tempo de resposta)
- Rate limit no `POST /leads` (deixar pro infra layer)
- Anti-spam por honeypot ou reCAPTCHA
- Linkar lead criado virou customer (matching automático por email com User)
- Auditoria detalhada de quem leu, quem clicou em arquivar, etc

---

## Referências

- Templates HTML originais: trazidos pelo Lucas, do projeto da landing
- Email service: [`apps/api/src/emails/service.ts`](../apps/api/src/emails/service.ts)
- Jobs registry: [`apps/api/src/emails/jobs.ts`](../apps/api/src/emails/jobs.ts)
- Roles existentes no schema: `CUSTOMER`, `STAFF`, `ADMIN`
- Constituição: [`CLAUDE.md`](../CLAUDE.md)
