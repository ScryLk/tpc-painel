# tests/

Esta pasta NÃO contém testes. Testes ficam co-located com o código testado.

## Por quê co-located

- Achar o teste é trivial: tá ao lado do arquivo
- Renomear/mover arquivo: teste vai junto
- Importações: paths curtos relativos
- Modificar feature: edita lado a lado

## Convenção

Cada arquivo `Foo.ts` (ou `Foo.tsx`) tem seu teste em `Foo.test.ts`
no MESMO diretório.

```
packages/lib/src/business/
├── isCompatible.ts
├── isCompatible.test.ts          ← teste co-located
├── fitsBalance.ts
└── fitsBalance.test.ts

apps/api/src/routes/
├── pacotes.ts
└── pacotes.test.ts

packages/ui/src/domain/
├── PointsDisplay.tsx
└── PointsDisplay.test.tsx
```

## Onde colocar fixtures

- **Pequenas** (1-3 objetos): inline no teste, no `describe` block
- **Médias** (4-20 objetos): arquivo `__fixtures__/` no mesmo dir do teste
- **Compartilhadas** entre múltiplos testes: `packages/lib/src/test-utils/`

## Helpers de teste compartilhados

`packages/lib/src/test-utils/` exporta:

- `createMockUser(overrides?)` — User do Prisma com defaults sensatos
- `createMockCar(overrides?)` — Car da garagem
- `createMockService(overrides?)` — Service do catálogo
- `mockClerkSession(userId)` — Mock de sessão pra testes API

Importação: `import { createMockUser } from '@tpc/lib/test-utils'`

## Como rodar

```bash
# Todos os testes
pnpm test

# Apenas um pacote
pnpm --filter @tpc/api test
pnpm --filter @tpc/ui test

# Watch mode (dev)
pnpm test --watch

# Coverage
pnpm test --coverage
```

## Regras adicionais

Ver `.claude/rules/testing.md` pra padrões de naming, AAA pattern, mocks, etc.
