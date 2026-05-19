# Rules: Testing (Vitest)

Escopo: `**/*.test.ts`, `**/*.test.tsx`

## Setup

- **Vitest** pra unit, integration, e component tests.
- **Testing Library** (`@testing-library/react`) pra componentes React.
- **Co-located**: arquivo `Foo.test.ts` no MESMO dir de `Foo.ts`.
- Pasta `tests/` na raiz é só pra docs/convenção, NÃO contém testes.

## Quando escrever teste

Obrigatório:

- Lógica de saldo (available, reserved, transação)
- Webhook Mercado Pago
- Validações Zod críticas (CPF, placa, valores)
- Cálculos de bônus, economia, parcelamento
- Auth + role check

Recomendado:

- Helpers de business logic (isCompatible, fitsBalance, etc.)
- Componentes com interatividade complexa

Não precisa:

- Componentes puramente apresentação
- Wrappers triviais
- Page components Next.js (cobrem por E2E depois)

## Padrão AAA

```ts
import { describe, it, expect } from 'vitest'

describe('fitsBalance', () => {
  it('returns true when service price equals balance exactly', () => {
    // Arrange
    const service = { pts: 500 }
    const balance = 500

    // Act
    const result = fitsBalance(service, balance)

    // Assert
    expect(result).toBe(true)
  })

  it('returns false when service exceeds balance', () => {
    // ...
  })
})
```

## Naming

- `describe`: nome do módulo/função sendo testado
- `it`: descreve o comportamento esperado em frase ("returns X when Y")
- Não escrever `it('should ...')`. Já é entendido. Use `it('returns', 'creates', 'throws')`.

## Fixtures

- Fixtures comuns em `__fixtures__/` co-located com o teste.
- Helpers de criação: `createMockUser()`, `createMockCar()` em `packages/lib/test-utils`.
- Não copia-cola dados de teste entre arquivos. Centraliza no fixture.

## Mocks

- Prisma: mock com `vi.mock('@tpc/db')` ou usar `prisma-mock` lib.
- Mercado Pago: SEMPRE mock em testes. Nunca chama API real.
- Time-sensitive: use `vi.setSystemTime()` pra dates determinísticos.

## Componentes React

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

describe('PointsDisplay', () => {
  it('shows balance formatted with thousands separator', () => {
    render(<PointsDisplay balance={1250} />)
    expect(screen.getByText('1.250')).toBeInTheDocument()
  })

  it('calls onRecharge when plus button clicked', async () => {
    const onRecharge = vi.fn()
    render(<PointsDisplay balance={100} onRecharge={onRecharge} />)
    await userEvent.click(screen.getByLabelText('Recarregar pontos'))
    expect(onRecharge).toHaveBeenCalledOnce()
  })
})
```

## Test database

- Pra integration tests no `apps/api/`, usar Postgres em Docker separado:
  `docker compose up -d postgres-test`.
- `.env.test` com `DATABASE_URL` apontando pra esse banco.
- Migration + seed antes da suite, truncate entre testes.

## Não fazer

- Não testar implementação interna (state interno, métodos privados).
  Testa o comportamento observável.
- Não escrever teste que depende da ordem de execução.
- Não testar coisa de framework (Next.js routing, Prisma básico).
- Não comentar teste que tá quebrado. Conserta ou deleta.
- Não usar `jest.fn()` no Vitest. É `vi.fn()`.
