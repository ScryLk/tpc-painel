# Feature: Onboarding (primeiro login)

> Status: rascunho, pendente revisão
> Versão: 0.1
> Atualizado: 2026-05-25
> Telas relacionadas: dashboard (empty state quando 0 carros) + welcome modal (novo)
> Depende de: [`specs/garagem.md`](./garagem.md) (reuso do `AddCarWizard`)

---

## Contexto

Usuário recém-cadastrado cai no `/dashboard` sem entender o modelo do app:
pontos pré-pagos, 2 canais (presencial + arquivo), garagem como pré-requisito
de qualquer pedido. Sem direcionamento, o cliente abre o app e não sabe por
onde começar.

Decisão de escopo (validada com Lucas): o onboarding cobre **somente até o
cadastro do primeiro carro**. Não cobre primeira compra de pontos nem
primeiro pedido. A garagem é a porta obrigatória de todo o resto do app:
catálogo filtra serviços pelo carro ativo, file service amarra o pedido ao
carro, compatibilidade gira em torno do `motorType`. Sem carro, o usuário
não consegue avançar mesmo que queira, então focar onboarding nele resolve
o problema real e mantém o escopo enxuto.

O onboarding tem dois componentes:
1. **Welcome modal** no primeiro login, explica em 3 slides curtos o modelo
   e termina com CTA pra cadastrar o primeiro carro
2. **Empty state guiada no dashboard** que persiste enquanto o usuário tiver
   0 carros, mesmo depois de fechar o modal

Não é um tour guiado com coachmarks. Decisão: tour estilo react-joyride é
frágil em mobile-first PWA (overlay quebra com teclado, scroll, reorientação)
e a maioria dos usuários pula. Welcome + empty state guiam sem prender.

---

## Requisitos funcionais

### Welcome modal
- [ ] Aparece automaticamente no `/dashboard` quando o user tem
  `onboardingDismissedAt = null` E `cars.length === 0`
- [ ] 3 slides com indicador de progresso (1/3, 2/3, 3/3)
- [ ] Botões "Voltar" (disabled no slide 1) e "Próximo" / "Cadastrar meu carro"
  (no slide 3)
- [ ] Botão X no topo direito fecha o modal sem cadastrar carro (dismiss)
- [ ] ESC fecha o modal (mesmo comportamento do X)
- [ ] Click no backdrop fecha o modal (mesmo comportamento do X)
- [ ] Slide 3 tem dois botões: "Cadastrar meu carro" (primário) e
  "Explorar primeiro" (secundário, dismiss)
- [ ] Mobile-first: ocupa quase fullscreen em ≤390px, modal centralizado em desktop

### Cadastro do carro
- [ ] CTA "Cadastrar meu carro" fecha o welcome e abre o `AddCarWizard`
  existente (sem mudanças no wizard em si)
- [ ] Quando o wizard completa com sucesso (POST `/me/cars` retorna 201),
  o onboarding é considerado concluído (derivado de `cars.length >= 1`)
- [ ] Se o user fecha o wizard sem completar, o welcome NÃO reabre, mas a
  empty state do dashboard fica visível

### Dismiss
- [ ] Fechar o welcome (X, ESC, backdrop, ou "Explorar primeiro") chama
  `POST /me/onboarding/dismiss`, que grava `User.onboardingDismissedAt = now()`
- [ ] Após dismiss, o welcome não reabre em logins futuros mesmo se o user
  ainda tiver 0 carros
- [ ] Dismiss é idempotente (chamar 2x não falha)

### Empty state no dashboard
- [ ] Quando `cars.length === 0`, dashboard mostra banner persistente no
  topo (acima do `SaldoHeroCard`) com CTA "Adicionar seu primeiro carro"
- [ ] CTA do banner abre o `AddCarWizard` direto (mesmo que o do welcome)
- [ ] Banner some quando o user cadastra o primeiro carro (deriva de
  `cars.length`, não de flag)
- [ ] Banner é independente do welcome: aparece para qualquer user com 0
  carros, inclusive os que dismissaram o welcome

### Detecção de "primeiro login"
- [ ] Critério: `user.onboardingDismissedAt == null && cars.length === 0`
- [ ] Não usa heurística por `createdAt` recente (frágil, e useremos o app
  sem login por muitos dias antes de cadastrar carro em alguns casos)

---

## Requisitos não-funcionais

- Mobile-first (390px wireframe)
- Welcome modal não bloqueia ações críticas (user sempre pode fechar)
- Estado de onboarding lido na carga inicial do dashboard, sem flash visual
  do modal abrindo após render
- Server Component lê estado, Client Component renderiza modal apenas quando
  necessário (sem `'use client'` em árvore inteira)

---

## Decisões de design

### Somente até primeiro carro, não até primeira compra/pedido
Garagem é pré-requisito pra qualquer pedido. Sem carro, o catálogo não
funciona (filtragem por compatibilidade). Forçar primeira compra antes do
primeiro carro inverte a ordem natural. Forçar primeiro pedido aumenta o
risco de o user abandonar antes de cadastrar dados.

### Sem checklist visível, sem step tracking persistido
Estado de onboarding deriva de fatos observáveis (`cars.length`,
`onboardingDismissedAt`). Não criamos modelo `Onboarding` nem campo
`onboardingStep`. Menos estado pra sincronizar, menos código pra manter.

### `onboardingDismissedAt` em vez de `onboardingCompletedAt`
Onboarding "completo" é derivado (`cars.length >= 1`). Só persistimos o
dismiss explícito, que é o único caso onde precisamos diferenciar "nunca
viu o welcome" de "viu e fechou sem cadastrar". User que cadastra carro pelo
wizard direto da empty state (sem ver welcome) também é considerado
"onboarded" pelo critério derivado.

### Modal não-bloqueante
Forçar cadastro de carro antes de explorar é agressivo demais. User pode
querer ver os pacotes ou o catálogo antes de comprometer dados do veículo.
Empty state guiada no dashboard garante que ele não esqueça.

### Reusar `AddCarWizard` em vez de duplicar
Wizard de 5 steps já existe e tem todos os tratamentos de erro. CTA do
welcome só dispara o mesmo componente. Decisão alinhada com a spec da
Garagem ("garagem como porta única de cadastro").

### Welcome só no dashboard, não em outras páginas
Modal aparecer no meio de `/catalogo` ou `/pontos/comprar` seria invasivo
se o user navegou pra lá direto via link. Dashboard é o destino default do
post-login da Clerk e onde o welcome faz sentido contextual.

### Não internacionalizar a copy do welcome agora
PT-BR informal hardcoded em `lib/copy.ts`. Quando i18n virar prioridade
(Sprint pós-MVP), reaproveita a estrutura.

---

## Copy dos slides (PT-BR informal)

Centralizada em `apps/web/lib/copy/onboarding.ts`.

### Slide 1 — Boas-vindas
- **Título**: "Tudo certo, {firstName}!"
- **Subtítulo**: "Você entrou na carteira pré-paga da TPC Performance."
- **Corpo**: "Aqui você compra pontos com desconto, e usa em remap de
  motor: presencial na nossa oficina em Panambi/RS, ou enviando seu arquivo
  pelo chat. Sem mensalidade, sem letra miúda."
- **Ilustração**: ícone de raio (mesma da hero do dashboard)

### Slide 2 — Como funciona
- **Título**: "Dois jeitos de usar seus pontos"
- **Corpo (dois blocos)**:
  - **Presencial**: "Você agenda, leva o carro até a TPC, e a gente executa
    no dia marcado. Stage 1, Pop & Bang, DPF, e mais."
  - **Por arquivo**: "Você manda o `.bin` ou `.ori` pelo chat, a gente
    devolve modificado. Funciona pra quem mora longe de Panambi."
- **Nota**: "Diagnóstico inicial é sempre grátis pelo app."

### Slide 3 — Pra começar
- **Título**: "Vamos cadastrar seu carro?"
- **Corpo**: "É rápido, 5 passos. A gente precisa pra mostrar só os
  serviços compatíveis com seu motor e calcular garantia certinha."
- **Nota**: "Até 3 carros por conta. Pode adicionar/remover depois."
- **CTA primária**: "Cadastrar meu carro"
- **CTA secundária**: "Explorar primeiro"

---

## Empty state do dashboard

Renderizada acima do `SaldoHeroCard` quando `cars.length === 0`.

- **Visual**: card com border vermelho leve, padding generoso, ícone de carro
  + plus
- **Título**: "Cadastre seu primeiro carro"
- **Corpo**: "Sem carro cadastrado, a gente não consegue filtrar serviços
  compatíveis nem calcular garantia. Leva 1 minuto."
- **CTA**: "Adicionar carro" → abre `AddCarWizard`
- **Dismissível?** Não. Persiste até cadastrar carro (e some sozinha).

---

## Modelo de dados

Migration `apps/api/prisma/migrations/<timestamp>_add_user_onboarding_dismissed_at`:

```prisma
model User {
  // ... campos existentes
  onboardingDismissedAt DateTime?  // null = nunca dismissou o welcome
  // ...
}
```

Sem novos índices (campo só lido junto do User principal, sem query
filtrando por ele).

---

## Endpoints

### `GET /me` (existente, extensão)
Resposta inclui o campo novo:
```ts
{
  id: string,
  email: string,
  name: string,
  // ...
  onboardingDismissedAt: string | null,  // ISO date ou null
}
```

### `POST /me/onboarding/dismiss` (novo)
Marca o welcome como dismissado. Idempotente.

Body: vazio.

Lógica:
```ts
await prisma.user.update({
  where: { id: userId },
  data: { onboardingDismissedAt: new Date() },
})
```

Se já estiver setado, não sobrescreve (preserva a primeira data).

Response:
```ts
{ ok: true, dismissedAt: string }
```

Errors:
- `UNAUTHORIZED` (401) — sem JWT

### `GET /me/cars` (existente, sem mudança)
Já retorna `meta.count`. Frontend usa pra derivar "tem carro?".

---

## Frontend

### Estrutura

- `apps/web/lib/copy/onboarding.ts` — strings dos slides
- `apps/web/app/dashboard/_components/WelcomeModal.tsx` — Client Component,
  controla slide atual + dismiss
- `apps/web/app/dashboard/_components/GarageEmptyBanner.tsx` — Client
  Component (precisa abrir wizard)
- `apps/web/app/dashboard/view.tsx` — recebe `shouldShowWelcome` e
  `hasCar` via props, renderiza condicionalmente
- `apps/web/app/dashboard/page.tsx` — Server Component, fetch `/me` e
  `/me/cars`, calcula `shouldShowWelcome`

### Fluxo

1. `page.tsx` busca em paralelo: `/me`, `/me/cars`, `/me/saldo`, `/me/atividade`
2. Calcula `shouldShowWelcome = !me.onboardingDismissedAt && cars.meta.count === 0`
3. Calcula `hasCar = cars.meta.count > 0`
4. Passa props pra `view.tsx`
5. `view.tsx` renderiza `<WelcomeModal>` se `shouldShowWelcome`
6. `view.tsx` renderiza `<GarageEmptyBanner>` se `!hasCar` (independente do welcome)
7. Modal e banner compartilham handler `onAddCar()` que abre o `AddCarWizard`
8. Modal `onDismiss` chama `POST /me/onboarding/dismiss` e fecha
9. Após sucesso do wizard, refresh do dashboard (mesma rota), banner some

### Reutilização do AddCarWizard

O wizard já recebe `onClose` e `onSuccess`. O dashboard mantém estado local
`isWizardOpen`. Modal e banner chamam `setWizardOpen(true)`. Wizard fecha
via `onClose`, e em sucesso via `onSuccess(carId)` o dashboard recarrega
(via `router.refresh()` ou navegação pra `/garagem`).

Decisão: após sucesso, vai pra `/garagem` em vez de manter no dashboard.
User vê o carro recém-cadastrado em destaque e entende que esse é o lugar
da garagem. Próxima volta ao dashboard mostra dashboard normal sem
empty state.

---

## Critérios de aceitação

### Backend
- [ ] Migration adiciona `onboardingDismissedAt` nullable em `User`
- [ ] `GET /me` retorna o campo (null pra users existentes)
- [ ] `POST /me/onboarding/dismiss` grava `now()` quando null
- [ ] `POST /me/onboarding/dismiss` 2x não sobrescreve a primeira data
- [ ] `POST /me/onboarding/dismiss` sem JWT retorna 401
- [ ] User existente (criado antes da migration) tem `onboardingDismissedAt = null`,
  ou seja, veria o welcome no próximo login se ainda tiver 0 carros

### Frontend
- [ ] User novo com 0 carros vê welcome modal no primeiro acesso ao dashboard
- [ ] User novo com 0 carros vê empty state banner no dashboard (independente do modal)
- [ ] Slides avançam com "Próximo", voltam com "Voltar"
- [ ] "Voltar" disabled no slide 1
- [ ] Indicador 1/3, 2/3, 3/3 atualiza
- [ ] X fecha o modal e dispara `POST /me/onboarding/dismiss`
- [ ] ESC fecha o modal e dispara `POST /me/onboarding/dismiss`
- [ ] Click no backdrop fecha o modal e dispara `POST /me/onboarding/dismiss`
- [ ] "Cadastrar meu carro" no slide 3 fecha o welcome e abre o `AddCarWizard`
- [ ] "Explorar primeiro" no slide 3 fecha o welcome (dismiss)
- [ ] Após dismiss, welcome NÃO reabre em re-acessos ao dashboard
- [ ] Empty state banner some quando o user cadastra primeiro carro
- [ ] Empty state banner persiste mesmo após dismiss do welcome
- [ ] Empty state banner tem CTA que abre o mesmo `AddCarWizard`
- [ ] User que cadastra carro pelo wizard nunca mais vê empty state nem welcome
- [ ] Modal acessível: foco vai pro modal ao abrir, trap de foco, ESC fecha

---

## Out of scope (v1)

- Tour guiado com coachmarks/spotlights em elementos da UI
- Checklist persistente "Comece por aqui" com múltiplos passos (comprar
  pontos, primeiro pedido, etc.)
- Re-onboarding pra users que voltam após muito tempo
- Onboarding pra staff/admin (esses caem em outra árvore)
- Vídeo explicativo embed
- Skip do onboarding via querystring (`?skipOnboarding=1`)
- A/B test de copy ou ordem dos slides
- Welcome aparecer em outras rotas além do dashboard
- Modificar o `AddCarWizard` em si (escopo é da spec da Garagem)
- Empty state análoga em outras telas (catálogo, pontos), que também
  filtram por carro mas não são o ponto de entrada

---

## Referências

- Constituição: [`CLAUDE.md`](../CLAUDE.md)
- Spec relacionada: [`specs/garagem.md`](./garagem.md)
- Rules: [`.claude/rules/frontend.md`](../.claude/rules/frontend.md),
  [`.claude/rules/api.md`](../.claude/rules/api.md),
  [`.claude/rules/db.md`](../.claude/rules/db.md)
- Componentes reutilizados:
  [`apps/web/app/garagem/_components/AddCarWizard.tsx`](../apps/web/app/garagem/_components/AddCarWizard.tsx)
