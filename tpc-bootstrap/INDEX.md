# TPC Painel · Índice do Monorepo

Mapa vivo da estrutura. Atualiza esse arquivo sempre que adicionar/mover pacote.
Se Claude precisa achar lógica de X, começa aqui.

## Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Frontend (web)**: Next.js 15 (App Router), Tailwind v4, Geist Sans/Mono
- **Backend (API)**: Fastify 5, Prisma 6, PostgreSQL 16, Redis 7
- **Auth**: Clerk (web + admin via roles)
- **Pagamento**: Mercado Pago (Pix + Cartão)
- **Storage**: Cloudflare R2 (NFs, comprovantes)
- **Mobile**: Não no MVP. PWA via Next.js. Expo entra depois.
- **Deploy**: Vercel (web) + Railway/Render (API + Postgres + Redis)
- **Testes**: Vitest + Testing Library
- **CI**: GitHub Actions

## Layout

```
tpc-painel/
├── apps/
│   ├── web/                    Painel cliente + admin (rotas protegidas por role)
│   └── api/                    Fastify backend (REST + webhooks Mercado Pago)
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
│   ├── (auth)/                 Login, signup, recover password
│   ├── (cliente)/              Painel do cliente final
│   │   ├── page.tsx            Dashboard
│   │   ├── pontos/             Comprar pontos + checkout
│   │   ├── catalogo/           Catálogo de serviços
│   │   ├── servico/[id]/       Detalhe + agendamento
│   │   ├── garagem/            Meus carros
│   │   ├── historico/          Extrato
│   │   └── perfil/             Configurações
│   ├── (admin)/                Painel TPC (role = 'tpc-staff' no Clerk)
│   │   ├── pedidos/            Confirmar/recusar solicitações
│   │   ├── clientes/           Lista de clientes
│   │   ├── catalogo/           Editar serviços/preços
│   │   └── financeiro/         Vendas, NFs
│   ├── api/                    Route handlers Next.js (proxy/BFF pra apps/api)
│   └── layout.tsx              Root layout (Clerk provider, theme)
│
├── components/                 Componentes específicos web (não compartilháveis)
├── lib/                        Hooks, utils web-only
├── public/
│   ├── sprites/                PNGs dos carros (Gemini-generated)
│   └── manifest.json           PWA manifest
└── tailwind.config.ts
```

**Entry points úteis**:
- `app/(cliente)/page.tsx` → Dashboard
- `app/(cliente)/pontos/comprar/page.tsx` → Comprar Pontos
- `app/(cliente)/servico/[id]/agendar/page.tsx` → Agendar
- `app/(admin)/pedidos/page.tsx` → Onde TPC confirma pedidos

---

## apps/api

**Propósito**: Backend Fastify. REST endpoints + webhooks Mercado Pago + jobs assíncronos.

**Stack**: Fastify 5, Prisma 6, Zod, BullMQ (jobs), Redis 7.

**Estrutura interna**:

```
apps/api/
├── src/
│   ├── server.ts               Fastify bootstrap
│   ├── routes/
│   │   ├── auth.ts             Sync Clerk → DB
│   │   ├── pacotes.ts          POST /pacotes/comprar (cria Mercado Pago checkout)
│   │   ├── checkout.ts         POST /checkout/pix · /checkout/cartao
│   │   ├── webhooks.ts         POST /webhooks/mercadopago
│   │   ├── carros.ts           CRUD garagem
│   │   ├── servicos.ts         GET catálogo + GET detalhe
│   │   ├── solicitacoes.ts     POST agendar · GET histórico · POST cancelar
│   │   └── admin/              Endpoints admin (confirmar pedido, etc)
│   ├── jobs/
│   │   ├── notify-whatsapp.ts  Envia WhatsApp pós-confirmação
│   │   ├── notify-email.ts     Email com NF
│   │   └── expire-reservation.ts  Libera saldo reservado se TPC não confirmar em 24h
│   ├── lib/
│   │   ├── mercadopago.ts      SDK wrapper
│   │   ├── clerk.ts            Verify session token
│   │   └── whatsapp.ts         Provider (Twilio ou Cloud API)
│   └── plugins/
│       ├── auth.ts             Fastify plugin: extract user from Clerk JWT
│       ├── error.ts            Error handler centralizado
│       └── prisma.ts           Prisma client lifecycle
│
├── prisma/                     (mira em packages/db, não duplica schema aqui)
├── tests/                      Testes co-located em `__tests__/` dentro de cada módulo
└── package.json
```

**Entry points úteis**:
- `src/server.ts` → bootstrap
- `src/routes/webhooks.ts` → webhook Mercado Pago (CRÍTICO, frágil)
- `src/jobs/expire-reservation.ts` → lógica de saldo reservado expirar

---

## packages/db

**Propósito**: Schema Prisma único compartilhado. Client gerado, types exportados.

**Stack**: Prisma 6, PostgreSQL 16.

**Estrutura interna**:

```
packages/db/
├── prisma/
│   ├── schema.prisma           Single source of truth do schema
│   └── migrations/             Versionado, sempre revisar antes de merge
├── src/
│   ├── index.ts                export PrismaClient singleton
│   └── types.ts                Re-exports + tipos derivados úteis
└── package.json
```

**Entidades principais** (resumo, ver `prisma/schema.prisma` pra detalhes):

- `User` — sync com Clerk, tem `role: 'cliente' | 'tpc-staff' | 'admin'`
- `Car` — carros da garagem do cliente, `motorType`, `plate`, `status`
- `Service` — catálogo (Stage 1/2/3, DPF, etc), preço em pontos + avulso
- `Package` — pacotes de pontos (Iniciante, Stage 1, Pro, VIP)
- `Purchase` — compra de pacote (Mercado Pago tx, pts creditados)
- `PointsBalance` — saldo do user. Tem campo `available` + `reserved`
- `Reservation` — pontos reservados (vinculados a uma Solicitacao pendente)
- `Solicitacao` — pedido de serviço (status: pendente / confirmada / em-exec / concluida / cancelada)
- `Transaction` — histórico de movimentação de pontos (audit log)

---

## packages/ui

**Propósito**: Componentes universais (cliente + admin). Sem lógica de negócio aqui.

**Estrutura interna**:

```
packages/ui/
├── src/
│   ├── primitives/             Button, Card, Badge, Input
│   ├── domain/                 PointsDisplay, ServiceCard, CarSilhouette
│   ├── layout/                 ScreenChrome, TPCHeader, TabBar
│   ├── icons/                  ServiceIcon, brand icons
│   └── tokens.ts               TPC palette + typography (single source of truth)
└── package.json
```

**Princípio**: Componente NÃO faz fetch. Recebe dados via props. Lógica fica nas pages/server components que consomem.

---

## packages/lib

**Propósito**: Helpers puros compartilhados. Funções pequenas, testáveis.

**Estrutura interna**:

```
packages/lib/
├── src/
│   ├── validators/             Zod schemas (CPF, placa, telefone BR)
│   ├── formatters/             Money, points (1.250), date (BR)
│   ├── business/               isCompatible, fitsBalance, economyPct
│   └── constants/              SERVICE_DURATION_DAYS, PERFORMANCE_PROFILES
└── package.json
```

---

## packages/config

**Propósito**: Configs compartilhados. Não tem código de runtime.

```
packages/config/
├── tsconfig.base.json
├── eslint.base.js
├── prettier.config.js
└── tailwind.preset.ts          TPC tokens em formato Tailwind
```

---

## Convenções de import

Cada pacote tem alias no `tsconfig.base.json`:

```ts
import { Button } from '@tpc/ui'
import { prisma } from '@tpc/db'
import { isCompatible } from '@tpc/lib'
```

NÃO use paths relativos profundos (`../../../packages/ui`). Sempre alias.

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

Detalhes no `README.md` (setup pra novo dev).

---

## Estado atual (atualizar conforme avança)

- [ ] Bootstrap monorepo
- [ ] Setup Prisma + Postgres + seed
- [ ] Auth Clerk
- [ ] Telas: Splash, Login, Onboarding
- [ ] Tela: Dashboard
- [ ] Tela: Comprar Pontos
- [ ] Telas: Checkout (Pix · Cartão · Sucesso)
- [ ] Webhook Mercado Pago + crédito de pontos
- [ ] Tela: Catálogo
- [ ] Tela: Detalhe do Serviço
- [ ] Tela: Agendar + Reserva de saldo
- [ ] Job: expirar reserva em 24h
- [ ] Tela: Garagem
- [ ] Tela: Histórico
- [ ] Tela: Perfil
- [ ] Painel admin TPC: confirmar pedidos
- [ ] WhatsApp Business API integration
- [ ] PWA (manifest + service worker)
- [ ] Deploy Vercel + Railway

---

**Para Claude Code**: ao adicionar feature nova, atualizar este INDEX com o novo módulo + checkbox no estado atual. Se mudar layout de pasta, atualizar mapa.
