# TPC Painel

Monorepo do app de carteira pre-paga da TPC Performance. App de pontos pra 2
canais (presencial em Panambi/RS e por arquivo). Constituicao em `CLAUDE.md`,
mapa do monorepo em `INDEX.md`, specs em `specs/`.

## Pre-requisitos

- Node 20.11+
- pnpm 9.15+ (`corepack enable && corepack prepare pnpm@9.15.0 --activate`)
- Docker + Docker Compose

## Setup

```bash
# 1. clone e instala deps
pnpm install

# 2. copia env de exemplo
cp .env.example .env
cp apps/web/.env.local.example apps/web/.env.local

# 3. sobe Postgres + Redis em background
docker compose up -d postgres redis

# 4. gera client Prisma + roda migrations + seed
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# 5. preenche chaves Clerk no .env (raiz) e apps/web/.env.local
#    pega em https://dashboard.clerk.com (Development instance)
```

## Comandos do dia-a-dia

```bash
pnpm dev           # turbo run dev em todos workspaces
pnpm build         # build de tudo
pnpm test          # vitest em todos pacotes
pnpm typecheck     # tsc --noEmit em todos pacotes
pnpm lint          # lint em todos pacotes

pnpm db:migrate    # cria migration nova
pnpm db:seed       # roda seed (idempotente, usa upsert)
pnpm db:studio     # abre Prisma Studio
pnpm db:reset      # apaga DB e re-aplica migrations + seed
```

## Infra local

- Postgres app:    `postgres://tpc:tpc_dev@localhost:5432/tpc_painel`
- Postgres test:   `postgres://tpc:tpc_test@localhost:5433/tpc_painel_test`
- Redis:           `redis://localhost:6379`

`docker compose down -v` apaga volumes (cuidado em dev, perde dados).

## Onde tudo vive

| Pasta              | O que e                                        |
| ------------------ | ---------------------------------------------- |
| `apps/web/`        | Painel cliente + admin (Next.js 15)            |
| `apps/api/`        | Backend Fastify (REST + WebSocket + webhooks)  |
| `packages/db/`     | Prisma schema + client + seed                  |
| `packages/lib/`    | Helpers compartilhados (Zod, formatters)       |
| `packages/ui/`     | Componentes universais (cliente + admin)       |
| `specs/`           | Spec-first. Uma feature por arquivo.           |
| `.claude/`         | Config Claude Code (rules, hooks, settings)    |

Sprint 0 entregou:

- Monorepo (pnpm + turborepo) + Docker Compose (Postgres + Redis)
- Prisma schema (17 entidades) + seed idempotente
- Auth Clerk: middleware/provider no web, plugin JWT + lazy sync no api,
  rotas `/sign-in`, `/sign-up`, `/dashboard` (web), endpoints `/health` e
  `/me` (api).

Pendente do Sprint 0: CI (GitHub Actions). Sprint 1 inicia o funil de pontos.

## Como rodar os apps

```bash
# api Fastify (porta 3001)
pnpm --filter @tpc/api dev

# web Next.js (porta 3000)
pnpm --filter @tpc/web dev

# os dois em paralelo
pnpm dev
```

A `/me` no Fastify exige header `Authorization: Bearer <clerk_jwt>`. O JWT
sai do Clerk no front, ou da rota `/v1/sessions/.../tokens` do Clerk pra
testes.

## Padroes

Antes de codar, ler `CLAUDE.md` (constituicao) e a rule relevante em
`.claude/rules/`. Spec primeiro, codigo depois.
