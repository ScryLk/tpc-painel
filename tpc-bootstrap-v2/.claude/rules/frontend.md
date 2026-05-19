# Rules: Frontend (Next.js web)

Escopo: `apps/web/**`, `packages/ui/**`

## Server Components first

- Default é **Server Component** (sem `'use client'`).
- `'use client'` SÓ quando:
  - Usa `useState`, `useEffect`, ou hook que requer client
  - Event handler (`onClick`, `onChange`, etc.)
  - Browser-only API (`window`, `localStorage`, `document`)
  - Biblioteca client-only (Framer Motion, etc.)
- Componente pequeno client dentro de Server Component é OK. Vai descendo
  ao máximo a fronteira cliente.
- Data fetching: Server Components fazem direto. Client Components recebem
  via props ou usam route handlers.

## Tailwind v4

- Use tokens TPC via `tailwind.preset.ts` em `packages/config`.
- Cores: `bg-tpc-red`, `text-tpc-ink`, `border-tpc-border`. Não hardcode hex.
- Spacing usa scale padrão Tailwind (4px base). Não inventa números mágicos.
- `cn()` helper pra combinar classes condicionais. Em `packages/lib/utils`.

## Estrutura de page

```tsx
// app/(cliente)/pontos/comprar/page.tsx
import { getPackages } from '@/lib/data/packages'
import { ComprarPontosView } from './view'

export default async function ComprarPontosPage() {
  const packages = await getPackages() // Server-side
  return <ComprarPontosView packages={packages} />
}
```

- `page.tsx` é SEMPRE Server Component. Faz fetch, passa pra View.
- `view.tsx` é Client Component se tiver interatividade. Recebe dados via props.
- Loading state: `loading.tsx` no mesmo dir.
- Error state: `error.tsx` no mesmo dir.

## Forms

- Server actions sempre que possível (`'use server'`).
- Validação Zod (mesmo schema do backend, importa de `@tpc/lib/validators`).
- Mostra erros campo a campo, não modal genérico.

## Imagens

- `next/image` sempre. Nunca `<img>` direto.
- Sprites de carro: `public/sprites/{type}.png`. Pre-otimizadas (WebP < 80KB).

## Animação

- CSS transitions e keyframes pra coisas simples (hover, fade).
- Framer Motion só quando precisa de gestures/layout animation real.
- Wireframe usa CSS keyframes (`tpc-pulse`, `tpc-fab-pulse`). Manter padrão.

## Estados visuais consistentes

Todo estado de UI segue paleta semântica:

- **Verde** (`tpc-green`): sucesso, confirmado, ganho, ativo
- **Vermelho** (`tpc-red`): ação primária, brand, status crítico, perda de pts
- **Amarelo** (`tpc-yellow`): pendente, atenção, saldo reservado, multa
- **Cinza tertiary**: neutro, desabilitado, info passiva
- **Cinza secondary**: gasto de pontos (NÃO usar vermelho aqui, gasto não é erro)

## Acessibilidade

- Botões sempre têm label visível ou `aria-label`.
- Contraste WCAG AA (paleta TPC já cumpre, validar caso adicione cor).
- Foco visível (`focus-visible:` ring), não remover outline sem substituir.
- Mobile touch targets ≥ 44px.

## PWA

- `manifest.json` em `public/`.
- Service worker via `next-pwa` ou implementação custom mínima.
- Splash, ícones (192, 512), theme color = `#000000`.

## Não fazer

- Não `'use client'` no topo de tudo "só por garantia".
- Não fetch em `useEffect` se dá pra fazer Server Component.
- Não hardcode strings de UI no componente. Constantes em `lib/copy.ts`
  quando relevante (facilita revisão e i18n futuro).
- Não fazer state global com Zustand/Redux antes de provar que precisa.
  Use React Context + Server Components primeiro.
