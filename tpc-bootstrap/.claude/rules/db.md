# Rules: Database (Prisma + Postgres)

Escopo: `packages/db/**`, qualquer arquivo que importa de `@tpc/db`

## Schema

- Single source of truth: `packages/db/prisma/schema.prisma`.
- Não duplicar schema em outros lugares. Tipos derivados saem do Prisma client.

## Naming

- **Tabelas**: PascalCase singular (`User`, `Car`, `Service`).
  Mapeie pra `snake_case` plural via `@@map("users")` se quiser convenção SQL.
- **Campos**: camelCase no Prisma (`createdAt`, `motorType`).
- **Enums**: PascalCase com valores em UPPER_SNAKE (`enum Role { CUSTOMER, STAFF, ADMIN }`).
- **Relations**: nome do modelo singular (`car`) pra relação 1:N apontando pro pai;
  plural pra relação N:1 listando filhos (`cars`).

## Soft delete

- Modelos com dados sensíveis ou audit-relevant usam `deletedAt: DateTime?`.
- Queries default filtram `deletedAt: null` via middleware Prisma.
- Hard delete só em modelos transient (sessions, tokens expirados).

## Migrations

- **Sempre revisar** SQL gerado antes de aplicar (`prisma migrate dev`).
- Migration tem nome descritivo: `20260519_add_reservation_table`.
- Mudanças em modelo com dados produção PRECISAM de plano de rollback.
- Nunca editar migration já aplicada em qualquer ambiente.
- Adicionar coluna NOT NULL em tabela existente? 3 etapas:
  1. Adiciona como nullable
  2. Backfill dados
  3. Torna NOT NULL

## Índices

- Adicionar `@@index([campo])` em colunas usadas em WHERE/ORDER BY frequente.
- Composto pra queries combinadas: `@@index([userId, createdAt(sort: Desc)])`.
- Sem índice em coluna usada só em INSERT/UPDATE.

## Transações

- Operação que muda saldo, reservation, ou cria solicitação: SEMPRE em transação.
- Use `prisma.$transaction([...])` pra batch, ou `prisma.$transaction(async (tx) => ...)` pra lógica complexa.
- Webhook MP: transação atômica. Falhou? Aborta tudo.

## Saldo de pontos — regras críticas

- `PointsBalance` tem 2 campos: `available` e `reserved`. Total real = soma.
- Comprar pontos: aumenta `available`.
- Solicitar serviço: move de `available` pra `reserved`.
- TPC confirma: debita `reserved` (vira `Transaction` tipo `DEBIT`).
- TPC nega ou expira: move de `reserved` de volta pra `available`.
- Nunca permita `available < 0` ou `reserved < 0`. Constraint no banco.

## Audit log

- `Transaction` é append-only. Nunca update ou delete.
- Toda mudança de saldo gera linha em `Transaction` com:
  - `type: 'CREDIT' | 'DEBIT' | 'RESERVE' | 'UNRESERVE'`
  - `amount`, `balanceAfter`, `relatedEntityId`, `relatedEntityType`

## Seeds

- `prisma/seed.ts` cria dados base pra dev:
  - 4 pacotes (Iniciante, Stage 1, Pro, VIP)
  - 12 serviços do catálogo
  - User dummy com role 'CUSTOMER' e 1 carro
  - User dummy com role 'STAFF' (admin)
- Não inventa dados produção em seed.

## Não fazer

- Não usar Prisma Client fora de `apps/api/`. Frontend chama API, não DB.
  - Exceção: server actions do Next.js que precisam de leitura simples.
- Não usar `prisma.$queryRaw` se Prisma normal resolve. Raw SQL é última opção.
- Não fazer N+1 query (`findMany` num map). Use `include` ou `select`.
- Não retornar campos sensíveis (password hash, tokens). Use `select` explícito.
