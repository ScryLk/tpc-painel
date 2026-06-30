# TPC Painel — Documentação do projeto

Documentação completa do monorepo `scrylk/tpc-painel`: o que é, desde quando,
com o quê, como está organizado, e quais regras valem. Quando em dúvida sobre
arquitetura ou onde mexer, começa aqui. Pro mapa vivo de pastas usa o
`INDEX.md`; pras regras por escopo, `.claude/rules/*`.

---

## 1. O que é

App de **carteira pré-paga de pontos** pros serviços de remap automotivo da
**TPC Performance** (Panambi/RS). O cliente compra pacotes de pontos com desconto
progressivo e resgata em serviços por **2 canais paralelos, mesma carteira**:

1. **Presencial** — leva o carro na oficina, TPC faz o remap fisicamente
   (Stage 1/2/3, Pop & Bang, DPF off, etc). 12 serviços de catálogo.
2. **Por arquivo (file service)** — envia o `.bin`/`.ori` da ECU pelo app, TPC
   mapeia e devolve o arquivo modificado pelo chat. Cliente grava com hardware
   próprio (KESS, MPPS, FLEX). 9 serviços + pedido custom.

Modelo: voucher digital pré-pago. **Não existe pagamento avulso no app**, só
ponto. O cliente compra pacote (Iniciante/Stage 1/Pro/VIP), o saldo vira ponto,
o ponto vira serviço.

Tem um **repo irmão**: `scrylk/tpc` é a **landing page** pública da marca (topo
de funil, capta lead). Os dois se completam: a landing capta, o painel converte
e opera. Ver seção 11.

---

## 2. Início do projeto e tempo trabalhado

- **Primeiro commit**: 2026-05-19. **Último**: 2026-06-17.
- **66 commits** ao longo de ~1 mês, concentrados em 3 janelas:
  - **2026-05-19** (36 commits): bootstrap do monorepo, Sprint 0 (schema,
    seed, Clerk, CI) e arranque das Sprints 1-3.
  - **2026-05-20** (25 commits): grosso das features (catálogo, agendar,
    garagem, pacotes, file service, jobs).
  - **2026-06-17** (5 commits): preparação de deploy (Render, pnpm lockfile).
- **Autoria**: trabalho conjunto Lucas + Claude (pair com IA). ~38 commits via
  Claude, ~28 via Lucas.
- **Volume**: ~34.6 mil linhas de TS/TSX, 200 arquivos versionados, 25 models
  Prisma, 13 enums, 50+ endpoints, 14 templates de email, 11 specs.

### Progresso por Sprint
- **Sprint 0 — Fundação**: ✅ monorepo, Prisma+Postgres+Redis em Docker, schema
  completo, seed, Clerk, CI GitHub Actions.
- **Sprint 1 — Funil de pontos**: ✅ dashboard, comprar pontos, checkout
  (Pix/cartão), webhook Mercado Pago (idempotente, HMAC), jobs de notificação,
  templates React Email, cartão salvo (1-click).
- **Sprint 2 — Catálogo + agendar (presencial)**: ✅ catálogo com filtro de
  compatibilidade, detalhe de serviço, calendário + slots, garagem (3 carros),
  reserva de pontos com job de expiração 24h, endpoints admin
  (confirm/start/complete).
- **Sprint 3 — File service**: ✅ catálogo arquivo, detalhe, fluxo de quote
  custom, chat de pedido via REST. ⏳ Socket.IO e upload R2 ainda na arquitetura
  (ver seção 8).
- **Sprint 4 — Conta + LGPD**: ✅ endpoints (histórico, export ZIP, exclusão
  30d, consentimentos), telas de perfil/histórico portadas.
- **Sprint 5 — Produção**: 🔮 PWA, deploy completo, observability (Sentry),
  domínio, anti-fraude inicial.

---

## 3. Stack e tecnologias

### Geral
| Camada | Tecnologia | Versão |
|---|---|---|
| Monorepo | pnpm workspaces + Turborepo | pnpm 9.15.0 / turbo 2.3.3 |
| Runtime | Node.js | 22.x |
| Linguagem | TypeScript (strict) | 5.7.2 |
| Format | Prettier | 3.4.2 |

### Backend (`apps/api`)
| | Tecnologia | Versão |
|---|---|---|
| Framework | Fastify | 5.2.1 |
| Plugins | fastify-plugin / @fastify/cors | 5.0.1 / 10.0.1 |
| ORM | Prisma + @prisma/client | 6.1.0 |
| Validação | Zod | 3.24.1 |
| Jobs | BullMQ (sobre Redis) | 5.34.0 |
| Redis client | ioredis | 5.4.2 |
| Auth | @clerk/backend | 1.21.0 |
| Email | Resend + React Email | 6.12.3 / 1.0.12 |
| Pix QR | qrcode | 1.5.4 |
| Build/dev | tsup / tsx | 8.5.1 / 4.19.2 |
| Log | pino-pretty | 13.0.0 |

### Frontend (`apps/web`)
| | Tecnologia | Versão |
|---|---|---|
| Framework | Next.js (App Router) | 15.1.3 |
| UI | React + React DOM | 19.0.0 |
| Estilo | Tailwind CSS v4 + @tailwindcss/postcss | 4.0.0 |
| Auth | @clerk/nextjs + @clerk/localizations | 6.18.0 / 4.6.6 |
| Fontes | geist (Sans/Mono) | 1.3.1 |
| Testes | Vitest | 2.1.8 |

### Infra e serviços externos
- **PostgreSQL 16** + **Redis 7** (local via `docker-compose.yml`).
- **Clerk** — auth de cliente e admin (via roles).
- **Mercado Pago** — Pix + cartão até 3x.
- **Cloudflare R2** — storage de `.bin`/`.ori`, NFs, comprovantes.
- **Resend** — email transacional (sem `RESEND_API_KEY` entra em dry-run).
- **WhatsApp Business API** — provider a definir (Twilio/Z-API/Cloud API).
- **Deploy**: Vercel (web) + Render/Railway (API + Postgres + Redis).
  `render.yaml` define o serviço `tpc-painel-api`.

---

## 4. Layout do monorepo

```
tpc-painel/
├── apps/
│   ├── web/        Next.js 15 — painel cliente + admin (rotas por role)
│   └── api/        Fastify 5 — REST + webhooks + jobs (+ WS planejado)
├── packages/
│   ├── db/         Prisma schema + client + seed (@tpc/db)
│   ├── ui/         Componentes universais cliente+admin (@tpc/ui)
│   ├── lib/        Validators Zod, formatters, business logic (@tpc/lib)
│   └── config/     tsconfig/eslint/tailwind compartilhados
├── specs/          Spec-first: uma feature por arquivo (11 specs)
├── .claude/rules/  Regras por escopo (api, frontend, db, testing, git)
├── INDEX.md        Mapa vivo do monorepo (começa por ele pra achar código)
├── ROUTES.md       Referência completa de endpoints da API
├── turbo.json      Pipeline Turborepo
└── .env.example    Todas as env vars (sem valores reais)
```

Aliases de import: `@tpc/db`, `@tpc/lib`, `@tpc/ui` (em `tsconfig.base.json`).
Frontend nunca importa Prisma direto: chama a API (exceção: server actions com
leitura simples).

### apps/api (`src/`)
- `routes/` — um plugin Fastify por arquivo, registro central em `server.ts`
  (sem auto-discovery). Subpasta `admin/` pras rotas de staff.
- `plugins/` — `auth.ts` (Clerk JWT → `request.user`, `requireAuth`,
  `requireRole`), `error.ts` (serializa `{ error: { code, message } }`),
  `prisma.ts` (ciclo de vida do client).
- `jobs/` — BullMQ: `expire-reservation`, `notify-email`, `notify-whatsapp`,
  `export-user-data`, `execute-account-deletion`, `send-marketing-campaign`.
- `emails/` — Resend + React Email; 14 templates em `templates/` + `_layout`.
- `lib/` — `env.ts` (Zod), `errors.ts`, `hmac.ts`, `mercadopago.ts`,
  `queue.ts`, `clerk.ts`.

### apps/web (`app/`)
Route groups: `(auth)` (sign-in/sign-up Clerk pt-BR), área cliente
(`dashboard`, `catalogo/{presencial,arquivo}`, `servico/[id]`, `pontos/*`,
`pedido/[id]`, `garagem`, `historico`, `perfil`), `admin/*` (leads, usuarios,
servicos, pacotes, marketing) e `legal/{termos,privacidade}`. Cliente de API em
`lib/api/{client,server}.ts`.

### packages
- **db**: `prisma/schema.prisma` (25 models, 13 enums) + `seed.ts` (4 pacotes,
  12 serviços, 9+1 remap, users dummy CUSTOMER e STAFF).
- **ui**: `primitives/` (Button, Card), `domain/` (PointsDisplay, CarSilhouette,
  MonthCalendar, FuelBar, TPCLogo, BrandPill, BackButton, SecHeading,
  DiagonalStripes), `layout/` (ScreenChrome, TPCHeader, DesktopDrawer),
  `lib/cn.ts`.
- **lib**: `validators/` (Zod, compartilhados com o front), `formatters/`,
  `business/` (helpers `isCompatible`, `fitsBalance`, `economyPct`),
  `constants/`, `test-utils/`.

---

## 5. Modelo de dados (Prisma)

### Enums (13)
`Role` (CUSTOMER/STAFF/ADMIN) · `MapState` (STOCK/STAGE1/2/3) · `Slot`
(MANHA/TARDE) · `ServiceCategory` (PERFORMANCE/AESTHETIC/CONFIG) ·
`SolicitacaoStatus` (PENDENTE→CONFIRMADA→EM_EXEC→CONCLUIDA/CANCELADA) ·
`RemapOrderStatus` (AWAITING_QUOTE/QUOTE_SENT/ANALYZING/MAPPING/AWAITING_REVIEW/
APPROVED/NEEDS_REVISION/CANCELLED) · `RemapFileKind`
(ORIGINAL/MODIFIED/ATTACHMENT/REPORT) · `MessageSenderType`
(CUSTOMER/TPC_STAFF/SYSTEM) · `TransactionType` (CREDIT/DEBIT/RESERVE/UNRESERVE)
· `PurchaseStatus` (PENDING/APPROVED/REJECTED/REFUNDED) · `MpPaymentMethod`
(PIX/CREDIT_CARD) · `DataExportStatus` (PROCESSING/READY/FAILED/EXPIRED) ·
`NotificationKind` (INFO/SUCCESS/WARNING/EVENT/ALERT) · `LeadStatus`
(NEW/REPLIED/ARCHIVED) · `CampaignStatus` · `DeliveryStatus`.

### Models (25, resumo)
- **Auth/catálogo**: `User` (sync Clerk), `Car` (garagem, max 3), `Service`
  (catálogo presencial), `RemapService` (catálogo file service), `Package`
  (pacotes de ponto), `Address`.
- **Carteira**: `PointsBalance` (`available` + `reserved`, com `version` pra
  optimistic lock), `Reservation`, `Transaction` (append-only, audit),
  `Purchase` (pagamento MP, `mpTransactionId` único), `SavedCard` (só bandeira +
  last4, nunca PAN/CVV).
- **Presencial**: `Solicitacao` (protocolo, agendamento, multa de cancelamento).
- **File service**: `RemapOrder` (pedido + quote custom), `RemapFile` (r2Key +
  sha256), `Message` (chat).
- **LGPD**: `DataExportRequest`, `AccountDeletion` (carência 30d), `Consent`
  (marketing OFF, transacional ON por default).
- **Engajamento**: `Notification`, `Lead` (form da landing), `MarketingCampaign`,
  `MarketingCampaignDelivery`.

Lista completa de campos/índices: ver `packages/db/prisma/schema.prisma`.

---

## 6. API — visão geral

Referência completa e sempre atual em **`ROUTES.md`**. Resumo dos grupos:

- **Públicas**: `/health`, catálogo (`/servicos`, `/remap-services`,
  `/pacotes`), `/leads` (ingest da landing, token), `/webhooks/mercadopago`
  (HMAC, idempotente).
- **Cliente (`requireAuth`)**: `/me/*` (perfil, saldo, atividade), LGPD
  (`/me/consents`, `/me/data-export`, `/me/account/deletion`), garagem
  (`/me/cars`), notificações, `/checkout` + `/purchases`, cartões salvos,
  `/solicitacoes` (presencial), `/remap-orders` (file service + chat).
- **Admin (`requireRole`)**: `/admin/leads`, `/admin/users` (role change exige
  ADMIN), `/admin/services`, `/admin/remap-services`, `/admin/packages`,
  `/admin/marketing-campaigns`, operação (`/admin/solicitacoes/:id/{confirm,
  start,complete}`, `/admin/remap-orders/:id/quote`).

Contrato de erro: `{ error: { code, message, details? } }`. Front ramifica por
`code`, não por `message`.

---

## 7. Regras de ouro

### 1. Spec first
Antes de feature nova, ler ou criar `specs/<feature>.md`. Não codar sem spec
aprovada. Spec versionada no git.

### 2. Sem em-dashes
Em comentário, copy ou commit. Lucas não gosta. Vírgula, ponto ou dois-pontos.

### 3. Server Components first (Next.js)
Default é Server Component. `'use client'` só com state/effect/handler/browser
API. `page.tsx` faz fetch e passa pra `view.tsx`.

### 4. Validação com Zod, sempre
Todo input externo (body, query, params, env) passa por Zod. Sem `any`. Schemas
compartilhados com o front via `@tpc/lib/validators`.

### 5. Pontos têm 2 estados: disponível + reservado
Saldo = `available` + `reserved`. Reserva presencial expira em 24h se TPC não
confirmar; file service fica reservado até o cliente aprovar. Jobs
`expire-reservation` são críticos. Testar bem. Toda operação de saldo em
transação Prisma, `available >= 0` e `reserved >= 0` por constraint.

### 6. Webhook Mercado Pago é zona perigosa
Idempotente (`mpTransactionId` único), retry-safe, valida HMAC. Se quebrar,
cliente paga e não recebe ponto. Responde 200 rápido, processa pesado em job.

### 7. Database como single source of truth
Preço, bônus, compatibilidade vêm do banco via API. Front só renderiza.

### 8. PT-BR pro usuário, EN pro código
Copy/UI: PT-BR informal. Código, commits, variáveis, comentários técnicos: EN.

### 9. Mobile-first
Wireframe é 390px. Web responsive expande pra cima.

### 10. Conventional Commits
`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`. Scope opcional.

### 11. NUNCA commitar segredos
`.env` é gitignored. Use `.env.example` com placeholders. Em prod, secrets vão
pras env vars da Vercel/Render.

### 12. Testes em mudança crítica
Mexeu em saldo, reserva, webhook MP ou auth? Tem que ter teste. Vitest, AAA,
co-located. Mercado Pago SEMPRE mockado.

### 13. File service: chat e arquivos são frágeis
Testar reconnect, retry, integridade SHA256, signed URLs com expiração.

### 14. LGPD não é opcional
Exportar dados (ZIP por job), excluir conta (carência fiscal), consentimentos
granulares. Marketing **default OFF**, transacional **default ON**. Não inverter.

### 15. Acesso a arquivo modificado é PRA SEMPRE
Cliente que aprovou arquivo baixa pra sempre pelo Histórico. Não implementar
expiração de arquivo sem decisão explícita da TPC.

---

## 8. Real-time, upload e o estado atual

A arquitetura prevê **Socket.IO** sobre o Fastify pro chat de file service e
**Cloudflare R2** pro upload de `.bin`. Hoje:

- O **chat funciona via REST** (`GET/POST /remap-orders/:id/messages`); o DB é a
  source of truth. Socket.IO ainda **não está instalado** (não está nas deps) —
  é o próximo passo pra empurrar updates em tempo real. Toda mensagem é
  persistida antes de qualquer emissão.
- O **upload R2** com signed URLs, dedup por SHA256 e validação por magic bytes
  está descrito em `.claude/rules/api.md` e parcialmente implementado.

Quando for ligar o Socket.IO: JWT do Clerk no handshake, sala por pedido
(`order:${orderId}`), ownership do cliente / role pra staff. Nunca emitir evento
sem persistir a mensagem antes.

---

## 9. Decisões tomadas (não rediscutir sem motivo forte)

- **Painel admin** é rota dentro de `apps/web/admin/`, não app separado.
- **Mobile**: PWA no MVP, Expo só depois de validar tração.
- **2 canais (presencial + arquivo)** na mesma carteira; tabs no catálogo.
- **Pacotes**: Iniciante 100/R$100, Stage 1 500/R$450, Pro 1000/R$850,
  VIP 2000/R$1600 (custo/pt do VIP tem inconsistência conhecida, validar).
- **Pagamento avulso não existe**, só ponto.
- **Saldo reservado** é mostrado separado do disponível.
- **Cartão salvo** via tokenização MP (1-click em recompra).
- **Diagnóstico** sempre grátis.
- **Cancelamento presencial**: >24h livre / 24h-2h com 20% multa / <2h aprovação
  manual.
- **Garagem**: max 3 carros, 1 ativo por vez.
- **File service**: arquivos `.bin/.ori/.frf/.kess/.fls`, máx 16MB. Anti-pirataria
  NÃO no MVP (aceita perda). Retenção do modificado: pra sempre.

---

## 10. Decisões pendentes (validar com TPC — marcadas `[TPC-DECISION]`)

CNPJ/razão social · preços avulso reais (catálogo) · percentuais de ganho ·
WhatsApp Business ativo · endereço(s) e horário da oficina · absorver 3-4% pra 3x
sem juros · política anti-pirataria · garantia · agendamento real · lista de ECUs
suportadas · tempo médio de entrega. Pauta consolidada em
`specs/tpc-coordenacao.md`.

---

## 11. Integração com a landing (`scrylk/tpc`)

A landing capta lead e o painel tria/responde. O contrato:

- Landing faz `POST /leads` na API do painel com `name`, `email`, `phone`,
  `vehicle`, `year`, `message` + header `X-Lead-Token` = `LEADS_INGEST_TOKEN`.
  Sem token, 401. Aceita `Idempotency-Key` opcional.
- O painel cria um `Lead` (status NEW), notifica o admin por email, e o time
  responde em `/admin/leads/:id` (fluxo NEW → REPLIED → ARCHIVED). Spec em
  `specs/admin-leads.md`.
- A landing hoje ainda guarda lead local (`.data/contacts.json`); migrar o
  ingest pra cá é a costura pendente entre os repos.
- O catálogo público da API (`/servicos`, `/remap-services`, `/pacotes`) pode
  alimentar conteúdo dinâmico na landing.

---

## 12. Como rodar

```bash
pnpm install
cp .env.example .env            # preencher Clerk, MP, R2, Resend...
docker compose up -d            # Postgres 16 (5432/5433) + Redis 7
pnpm db:generate && pnpm db:migrate && pnpm db:seed
pnpm dev                        # turbo: web :3000 + api :3001
```

Scripts úteis: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm db:studio`,
`pnpm db:reset`. CI (`.github/workflows/ci.yml`): lint + typecheck + test +
`prisma validate`, em pnpm 9.15.0 / Node 20.

---

## 13. Quando perguntar antes de fazer

Mudar schema do DB · adicionar dep externa pesada · mudar rota pública · tocar no
webhook MP · alterar saldo de pontos · adicionar role/permissão · tocar no chat
real-time · mudar storage/retenção R2 · implementar anti-pirataria. Pro resto,
segue o que faz sentido. Lucas confia.

---

## 14. Onde encontrar mais

- **Mapa do monorepo**: `INDEX.md`
- **Endpoints**: `ROUTES.md`
- **Regras por escopo**: `.claude/rules/{api,frontend,db,testing,git}.md`
- **Specs de feature**: `specs/<feature>.md`
- **Pauta com a TPC**: `specs/tpc-coordenacao.md`
- **Setup pra dev**: `README.md`
- **Landing irmã**: repositório `scrylk/tpc`
