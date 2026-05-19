# TPC Painel · Índice do Monorepo

Mapa vivo da estrutura. Atualiza esse arquivo sempre que adicionar/mover pacote.
Se Claude precisa achar lógica de X, começa aqui.

## Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Frontend (web)**: Next.js 15 (App Router), Tailwind v4, Geist Sans/Mono
- **Backend (API)**: Fastify 5, Prisma 6, PostgreSQL 16, Redis 7
- **Real-time chat**: Socket.IO sobre Fastify (chat de file service)
- **Storage**: Cloudflare R2 (arquivos .bin/.ori, comprovantes, NFs)
- **Auth**: Clerk (cliente + admin via roles)
- **Pagamento**: Mercado Pago (Pix + Cartão 3x sem juros)
- **Mobile**: Não no MVP. PWA via Next.js. Expo entra depois.
- **Deploy**: Vercel (web) + Railway/Render (API + Postgres + Redis)
- **Testes**: Vitest + Testing Library
- **CI**: GitHub Actions

## Modelo de negócio

App de carteira pré-paga pra **2 linhas de serviço da TPC Performance**:

1. **Presencial**: Cliente leva o carro na oficina de Panambi, TPC faz remap fisicamente (Stage 1/2/3, Pop & Bang, DPF off…). 12 serviços.

2. **Por arquivo (file service)**: Cliente envia .bin/.ori da ECU pelo app, TPC analisa, mapeia, devolve arquivo modificado pelo chat. Cliente grava na ECU com hardware próprio (KESS, MPPS, FLEX…). 9 serviços + pedido custom.

Mesma carteira de pontos pra ambos. Mesma compra de pacote (Iniciante/Stage 1/Pro/VIP). Cliente escolhe o canal no Catálogo via tabs.

## Layout

```
tpc-painel/
├── apps/
│   ├── web/                    Painel cliente + admin (rotas protegidas por role)
│   └── api/                    Fastify backend (REST + WebSocket + webhooks)
│
├── packages/
│   ├── db/                     Prisma schema + client + migrations
│   ├── ui/                     Componentes universais (cliente + admin)
│   ├── lib/                    Helpers compartilhados (validações Zod, formatters)
│   └── config/                 tsconfig, eslint, tailwind, prettier compartilhados
│
├── specs/                      Spec-first. Uma feature por arquivo. Versionado.
├── tests/                      Convenção de testes (testes ficam co-located com código)
├── .claude/                    Config Claude Code (rules, hooks, settings)
│
├── CLAUDE.md                   Constituição do projeto (regras de ouro)
├── CLAUDE.local.md             Preferências pessoais do Lucas (gitignored)
├── INDEX.md                    Você está aqui
├── README.md                   Setup + dev workflow pra novos devs
│
├── turbo.json                  Turborepo pipeline
├── pnpm-workspace.yaml         pnpm workspaces config
├── package.json                Root scripts
└── .env.example                Vars do ambiente (sem valores reais)
```

---

## apps/web

**Propósito**: Painel cliente (mobile-first PWA) + painel admin TPC (rotas protegidas).

**Stack**: Next.js 15 App Router, Tailwind v4, Clerk, React 19.

**Estrutura interna**:

```
apps/web/
├── app/
│   ├── (auth)/                       Login, signup, recover password, onboarding
│   ├── (cliente)/                    Painel do cliente final
│   │   ├── page.tsx                  Dashboard
│   │   ├── pontos/                   Comprar pontos + checkout
│   │   ├── catalogo/                 Catálogo (presencial + por arquivo)
│   │   │   └── [canal]/              `presencial` ou `arquivo`
│   │   ├── servico/[id]/             Detalhe + agendamento/upload
│   │   │   ├── agendar/              Fluxo presencial
│   │   │   └── solicitar/            Fluxo por arquivo (upload)
│   │   ├── pedido/[orderId]/         Detalhe do pedido + chat
│   │   ├── garagem/                  Meus carros (até 3)
│   │   ├── historico/                Extrato unificado
│   │   └── perfil/                   Configurações + LGPD + segurança
│   │
│   ├── (admin)/                      Painel TPC (role = 'tpc-staff' no Clerk)
│   │   ├── pedidos/                  Confirmar/recusar solicitações presenciais
│   │   ├── arquivos/                 Pedidos de file service · upload arquivo modificado
│   │   ├── clientes/                 Lista de clientes
│   │   ├── catalogo/                 Editar serviços/preços
│   │   └── financeiro/               Vendas, NFs
│   │
│   ├── api/                          Route handlers Next.js (proxy/BFF pra apps/api)
│   └── layout.tsx                    Root layout (Clerk provider, theme)
│
├── components/                       Componentes específicos web (não compartilháveis)
├── lib/                              Hooks, utils web-only
├── public/
│   ├── sprites/                      PNGs dos carros (Gemini-generated)
│   └── manifest.json                 PWA manifest
└── tailwind.config.ts
```

---

## apps/api

**Propósito**: Backend Fastify. REST endpoints + WebSocket pra chat + webhooks Mercado Pago + jobs assíncronos.

**Stack**: Fastify 5, Prisma 6, Zod, BullMQ (jobs), Redis 7, Socket.IO (chat).

**Estrutura interna**:

```
apps/api/
├── src/
│   ├── server.ts                     Fastify bootstrap + Socket.IO mount
│   ├── routes/
│   │   ├── auth.ts                   Sync Clerk → DB
│   │   ├── pacotes.ts                POST /pacotes/comprar (cria MP checkout)
│   │   ├── checkout.ts               POST /checkout/pix · /checkout/cartao
│   │   ├── webhooks.ts               POST /webhooks/mercadopago
│   │   ├── carros.ts                 CRUD garagem (máx 3 carros)
│   │   ├── servicos.ts               GET catálogo + GET detalhe
│   │   ├── solicitacoes.ts           POST agendar · GET histórico · POST cancelar (presencial)
│   │   ├── remap-orders.ts           POST criar · POST upload · POST aprovar · GET listar
│   │   ├── messages.ts               POST mensagem no chat (file service)
│   │   ├── files.ts                  GET signed URL pra download de arquivo modificado
│   │   ├── lgpd.ts                   GET export-dados · POST excluir-conta
│   │   └── admin/                    Endpoints admin (confirmar pedido, entregar arquivo, etc)
│   │
│   ├── jobs/
│   │   ├── notify-whatsapp.ts        Envia WhatsApp pós-confirmação
│   │   ├── notify-email.ts           Email com NF
│   │   ├── expire-reservation.ts     Libera saldo reservado se TPC não confirmar em 24h
│   │   ├── expire-remap-quote.ts     Limpa pedido custom se TPC não orçar em 24h
│   │   └── export-user-data.ts       Gera ZIP de dados LGPD pra cliente baixar
│   │
│   ├── ws/                           Socket.IO handlers
│   │   ├── chat.ts                   Rooms por remapOrderId · events: message:new, file:uploaded, status:changed
│   │   └── auth.ts                   Verifica JWT antes de aceitar conexão WS
│   │
│   ├── lib/
│   │   ├── mercadopago.ts            SDK wrapper
│   │   ├── clerk.ts                  Verify session token
│   │   ├── whatsapp.ts               Provider (Twilio / Z-API / Cloud API)
│   │   ├── r2.ts                     Cloudflare R2 SDK + signed URLs
│   │   └── hash.ts                   SHA256 pra integridade de arquivos
│   │
│   └── plugins/
│       ├── auth.ts                   Fastify plugin: extract user from Clerk JWT
│       ├── error.ts                  Error handler centralizado
│       ├── prisma.ts                 Prisma client lifecycle
│       └── socketio.ts               Socket.IO plugin
│
├── prisma/                           (mira em packages/db, não duplica schema aqui)
├── tests/                            Testes co-located em `__tests__/` dentro de cada módulo
└── package.json
```

**Entry points críticos** (frágeis, atenção):
- `src/server.ts` → bootstrap
- `src/routes/webhooks.ts` → webhook Mercado Pago (idempotente, valida HMAC)
- `src/jobs/expire-reservation.ts` → lógica de saldo reservado expirar
- `src/ws/chat.ts` → real-time chat de file service
- `src/routes/files.ts` → signed URLs do R2 (segurança)
- `src/routes/lgpd.ts` → export + exclusão LGPD

---

## packages/db

**Propósito**: Schema Prisma único compartilhado. Client gerado, types exportados.

**Entidades principais** (ver `prisma/schema.prisma` pra detalhes):

### Core / Auth
- `User` — sync com Clerk, role: `CUSTOMER | STAFF | ADMIN`
- `Car` — carros da garagem (máx 3 por user), motorType, plate, isActive (1 ativo por user)
- `Service` — catálogo presencial (Stage 1/2/3, DPF, etc), pts + priceAvulso + motorTypes
- `RemapService` — catálogo por arquivo (9 serviços + custom), pts + supports[]
- `Package` — pacotes de pontos (Iniciante, Stage 1, Pro, VIP)

### Carteira / Transações
- `Purchase` — compra de pacote (MP tx, pts creditados)
- `PointsBalance` — saldo do user com 2 campos: `available` + `reserved`
- `Reservation` — pontos reservados (vinculados a Solicitacao ou RemapOrder)
- `Transaction` — histórico append-only de movimentação (CREDIT / DEBIT / RESERVE / UNRESERVE)
- `SavedCard` — cartões tokenizados Mercado Pago (1-click checkout)

### Pedidos presenciais
- `Solicitacao` — pedido de serviço presencial
  - status: `PENDENTE | CONFIRMADA | EM_EXEC | CONCLUIDA | CANCELADA`
  - data + slot (manhã/tarde) + observações + carId

### Pedidos por arquivo (file service)
- `RemapOrder` — pedido por arquivo
  - status: `AWAITING_QUOTE | QUOTE_SENT | ANALYZING | MAPPING | AWAITING_REVIEW | APPROVED | NEEDS_REVISION | CANCELLED`
  - isCustomQuote (true = pedido sem preço fixo, vai pra orçamento)
  - pointsReserved + pointsDebited
  - Dados técnicos: ecuModel, hardwareUsed, readMode, vehicleVin, mileage, description
- `RemapFile` — arquivos do pedido (original cliente + modificado TPC)
  - kind: `ORIGINAL | MODIFIED | ATTACHMENT | REPORT`
  - r2Key + sha256 (integridade + dedup)
- `Message` — chat do RemapOrder
  - senderType: `customer | tpc-staff | system`
  - body + fileId (anexo opcional)
  - readAt

### LGPD
- `DataExportRequest` — solicitação de export de dados (gera ZIP)
- `AccountDeletion` — pedido de exclusão (com período de carência)
- `Consent` — consentimentos granulares (marketing email, marketing whatsapp, etc)

---

## packages/ui

Componentes universais. Sem lógica de negócio. Recebe dados via props.

```
packages/ui/
├── src/
│   ├── primitives/                   Button, Card, Badge, Input, Toggle
│   ├── domain/                       PointsDisplay, ServiceCard, CarSilhouette, ChannelTab
│   ├── chat/                         MessageBubble, FileAttachment, ChatInput
│   ├── layout/                       ScreenChrome, TPCHeader, TabBar
│   ├── icons/                        ServiceIcon, brand icons
│   └── tokens.ts                     TPC palette + typography (single source of truth)
└── package.json
```

---

## packages/lib

Helpers puros compartilhados. Funções pequenas, testáveis.

```
packages/lib/
├── src/
│   ├── validators/                   Zod schemas (CPF, placa, telefone BR, .bin file)
│   ├── formatters/                   Money, points (1.250), date (BR)
│   ├── business/                     isCompatible, fitsBalance, economyPct, getServiceCategory
│   ├── constants/                    SERVICE_DURATION_DAYS, PERFORMANCE_PROFILES, REMAP_STATUSES
│   └── test-utils/                   Fixtures + mocks compartilhados
└── package.json
```

---

## Convenções de import

Cada pacote tem alias no `tsconfig.base.json`:

```ts
import { Button } from '@tpc/ui'
import { prisma } from '@tpc/db'
import { isCompatible } from '@tpc/lib'
```

NÃO use paths relativos profundos. Sempre alias.

---

## Como rodar tudo

```bash
# Setup inicial (uma vez)
pnpm install
docker compose up -d postgres redis
pnpm db:migrate
pnpm db:seed

# Dev (em paralelo via Turborepo)
pnpm dev

# Build de produção
pnpm build

# Testes
pnpm test

# Typecheck completo
pnpm typecheck
```

---

## Wireframe → Implementação: mapa de telas

| # | Tela | Artboard | Componente | Página Next.js |
|---|------|----------|------------|----------------|
| 01 | Splash | `splash` | `SplashScreen` | `app/page.tsx` (intermediário) |
| 02 | Login | `login` | `LoginScreen` | `app/(auth)/login/page.tsx` |
| 03 | Onboarding | `onboarding-*` | `OnboardingScreen` | `app/(auth)/onboarding/[step]/page.tsx` |
| 04 | Dashboard | `dashboard` | `DashboardScreen` | `app/(cliente)/page.tsx` |
| 05 | Comprar Pontos | `comprar` | `ComprarScreen` | `pontos/comprar/page.tsx` |
| 06a-d | Checkout | `checkout-*` | `CheckoutView` | `pontos/checkout/page.tsx?method=` |
| 07 | Catálogo presencial | `catalog` | `CatalogScreen` | `catalogo/presencial/page.tsx` |
| 08a-d | Detalhe presencial | `service*` | `ServiceDetailScreen` | `servico/[id]/page.tsx` |
| 08e-f | Detalhe por arquivo | `remap-detail*` | `ServiceDetailScreen` (adaptativo) | `servico/[id]/page.tsx?canal=arquivo` |
| 09a-c | Agendar | `schedule*` | `ScheduleScreen` | `servico/[id]/agendar/page.tsx` |
| 10a-c | Garagem | `garagem*` | `GaragemScreen` | `garagem/page.tsx` |
| 11 | Histórico | `historico` | `HistoricoScreen` | `historico/page.tsx` |
| 12a-b | Perfil | `perfil*` | `PerfilScreen` | `perfil/page.tsx` |
| 13 | Catálogo Remap | `catalog-remap` | `CatalogScreen` (channel=remap) | `catalogo/arquivo/page.tsx` |
| 14a-b | Upload | `remap-upload*` | `RemapUploadScreen` | `servico/[id]/solicitar/page.tsx` |
| 15a-c | Chat | `remap-chat*` | `RemapChatScreen` | `pedido/[orderId]/page.tsx` |

---

## Estado atual

### Wireframe
- [x] Wireframe completo das 12 telas + variantes (`tpc-painel-v11.zip`)
- [ ] Sprites de carro (Gemini · 6 tipos) → integrar em `apps/web/public/sprites/`

### Sprint 0 — Foundation
- [ ] Bootstrap monorepo (pnpm + Turborepo)
- [ ] Setup Prisma + Postgres + Redis (docker compose)
- [ ] Schema completo (15+ entidades)
- [ ] Seed: 4 pacotes + 12 serviços presenciais + 9 serviços remap + user dummy
- [ ] Auth Clerk (cliente + role tpc-staff)
- [ ] Setup CI (GitHub Actions: lint, typecheck, test)

### Sprint 1 — Funil de pontos (aquisição)
- [ ] Telas: Splash, Login, Onboarding, Dashboard
- [ ] Tela: Comprar Pontos
- [ ] Telas: Checkout Pix · Cartão · Cartão salvo · Sucesso
- [ ] Webhook Mercado Pago + crédito de pontos (idempotente, HMAC)
- [ ] Job: notify-whatsapp + notify-email pós-compra

### Sprint 2 — Catálogo + Agendar (resgate presencial)
- [ ] Tela: Catálogo presencial (com hero, combos, filtros)
- [ ] Tela: Detalhe do Serviço (adaptativo: performance/aesthetic/config)
- [ ] Tela: Agendar (calendar, multi-dia, política cancelamento)
- [ ] Tela: Garagem (3 carros, ativo, status sobrepõe)
- [ ] Reserva de saldo + job expirar reserva em 24h

### Sprint 3 — File service
- [ ] Tela: Catálogo "Por arquivo" (tab no Catálogo)
- [ ] Tela: Detalhe do Serviço (adaptado pra remap)
- [ ] Tela: Upload (form técnico + drop zone)
- [ ] Tela: Chat (Socket.IO real-time)
- [ ] Tela: Variant pedido custom (orçamento prévio)
- [ ] Upload de arquivo .bin pra Cloudflare R2 + SHA256
- [ ] Signed URLs pra download (validade curta)
- [ ] Painel admin TPC pra gerenciar pedidos
- [ ] Job: notify-tpc + notify-cliente em cada evento do chat

### Sprint 4 — Conta e LGPD
- [ ] Tela: Histórico (unificado, com downloads permanentes)
- [ ] Tela: Perfil (8 seções)
- [ ] Tela: Excluir conta (com confirmação por digitação)
- [ ] Endpoints LGPD: export dados (ZIP) + exclusão (com período de carência)
- [ ] Consentimentos granulares marketing vs transacional

### Sprint 5 — Produção
- [ ] PWA (manifest + service worker)
- [ ] Deploy Vercel + Railway
- [ ] Monitoring (Sentry / Logtail)
- [ ] Domain + SSL
- [ ] Anti-fraude inicial (rate limit, captcha em login)

---

**Para Claude Code**: ao adicionar feature nova, atualiza este INDEX com o novo módulo + checkbox no estado atual. Se mudar layout de pasta, atualiza o mapa. Wireframe é fonte de verdade visual, mas adaptações de implementação são esperadas (e bem-vindas).
