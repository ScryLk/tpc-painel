# Feature: Garagem

> Status: pronta pra implementar
> Versão: 1.0
> Atualizado: 2026-05-19
> Telas relacionadas: 10a (Garagem normal), 10b (Garagem empty), 10c (Garagem no limite)
> Wireframe: `tpc-painelv11.zip`, screens-4.jsx (`GaragemScreen`, `GaragemEmptyScreen`, `GarageCarCard`)
> Spec da Sprint 2 que precisa fechar antes do Catálogo presencial. Catálogo
> filtra serviços pela compatibilidade com o carro ativo.

---

## Contexto

Cliente cadastra os carros que possui e mantém um ativo por vez. O carro ativo
é o "default" do catálogo presencial e por arquivo: serviços compatíveis,
parcelamento sugerido, garantia, tudo gira em torno dele.

Limite duro de 3 carros por conta. Cliente que tem mais que isso na vida
real precisa rotacionar (delete soft + add). Decisão do produto: 99% dos
clientes têm 1-2 carros, o limite previne abuso (criação de conta colega +
pedidos no nome).

A Garagem também é a porta de entrada das funcionalidades de Sprint 2+:
- "Status do carro" sobrepõe pedidos ativos em mapeamento (file service) ou
  em serviço (presencial).
- Compatibilidade de catálogo (`Service.motorTypes` cruza com `Car.motorType`).
- Histórico unificado filtra por `carId` (Sprint 4).

---

## Requisitos funcionais

### Listar garagem
- [ ] `GET /me/cars` retorna lista de carros não-deletados do user
- [ ] Inclui `isActive`, `mapState` e dados do pedido em andamento (se houver)
- [ ] Ordenação: ativo primeiro, depois por `createdAt asc`
- [ ] Tela `/garagem` (mobile-first) renderiza cada carro como `GarageCarCard`
- [ ] Header mostra `${n} de 3 carros` (ou "nenhum carro ainda" no empty)
- [ ] Quando lista vazia, renderiza `GaragemEmptyScreen` com CTA primária
- [ ] Quando lista atinge 3, renderiza card warning "Limite atingido" no fim
- [ ] FAB "+" no canto inferior direito; disabled quando no limite

### Criar carro
- [ ] `POST /me/cars` com body validado por Zod
- [ ] Limite duro: rejeita com `BusinessError(GARAGE_LIMIT_REACHED)` quando
  `cars.where(deletedAt: null).count() >= 3`
- [ ] Placa única por user: rejeita com `ConflictError(PLATE_ALREADY_REGISTERED)`
  se placa já existe (incluindo soft-deleted, pra não permitir colisão
  acidental — soft delete preserva histórico)
- [ ] Se for o primeiro carro do user, marca automaticamente `isActive=true`
- [ ] Se já tem outros carros, novo carro entra `isActive=false`
- [ ] `mapState` default = `STOCK`
- [ ] Fluxo UI: bottom sheet ou rota `/garagem/adicionar` com form em 5 steps
  (marca → modelo → ano → motor → placa), seguindo wireframe `OnboardingBrandStep`
  / `OnboardingMotorStep` / `OnboardingPlateStep`. Cada step tem progress
  bars + indicador X/5 + "Pular" desabilitado (todos campos obrigatórios)

### Editar carro
- [ ] `PATCH /me/cars/:id` aceita: `color`, `plate`
- [ ] Brand, model, year, motorType são imutáveis após criação (mudar = novo
  carro). Decisão pra prevenir trapaça em garantia.
- [ ] Placa única continua valendo
- [ ] Carro com pedido em andamento (Solicitacao PENDENTE/CONFIRMADA/EM_EXEC
  ou RemapOrder em qualquer status que não APPROVED/CANCELLED/NEEDS_REVISION)
  NÃO permite edição de placa, só de cor

### Ativar carro
- [ ] `POST /me/cars/:id/activate` torna o carro ativo
- [ ] Operação atômica em transação: marca alvo como `isActive=true` e todos
  os outros do user como `isActive=false`
- [ ] Sem efeito se já era ativo (idempotente, retorna 200)
- [ ] Não pode ativar carro com `deletedAt != null` (404)

### Deletar carro (soft)
- [ ] `DELETE /me/cars/:id` faz soft delete (`deletedAt = now()`)
- [ ] Rejeita com `BusinessError(CAR_HAS_PENDING_ORDERS)` se houver
  Solicitacao em PENDENTE/CONFIRMADA/EM_EXEC ou RemapOrder em
  AWAITING_QUOTE/QUOTE_SENT/ANALYZING/MAPPING/AWAITING_REVIEW
- [ ] Se o carro deletado era o ativo, escolhe o próximo (mais antigo
  não-deletado) e marca `isActive=true`. Se não tem nenhum, ninguém fica
  ativo
- [ ] Soft-deleted não aparece em `GET /me/cars` nem conta no limite
- [ ] Histórico unificado (Sprint 4) ainda mostra serviços que aconteceram
  nesse carro (LGPD: cliente pode pedir anonimização separadamente)

### Estado visual do carro
- [ ] `mapState` (default `STOCK`) reflete o último serviço Stage aplicado:
  - Sem mods → `STOCK`
  - Stage 1 aprovado → `STAGE1`
  - Stage 2 aprovado → `STAGE2`
  - Stage 3 aprovado → `STAGE3`
- [ ] Cálculo do `mapState` é responsabilidade do handler que aprova um
  pedido (Sprint 2 Solicitar serviço / Sprint 3 file service). Garagem
  apenas lê.
- [ ] Quando carro tem `activeOrder` (pedido em andamento), badge de status
  do card sobrepõe `mapState`:
  - Pedido por arquivo em mapeamento → `Em mapeamento` (vermelho, pulse)
  - Pedido presencial em execução → `Em serviço` (amarelo, pulse)
- [ ] Card mostra `mapState` quando não tem pedido ativo

### Garantia
- [ ] Carro com `mapState` diferente de `STOCK` mostra barra de garantia
  com `warrantyPct` e `warrantyText`
- [ ] Garantia padrão: 12 meses [TPC-DECISION #9 — política real ainda a definir]
- [ ] Conta a partir da data do `Transaction(DEBIT)` do último Stage
- [ ] Quando expira, barra fica vazia + texto "Garantia expirada"
- [ ] Out of scope V1: regras de renovação ou perda de garantia por
  modificação externa

---

## Requisitos não-funcionais

- Mobile-first (390px wireframe)
- Operações de Car em transação Prisma (ativar troca de ativo)
- Validação Zod de placa BR aceita Mercosul (`ABC1D23`) e antiga (`ABC-1234`)
- Lista de marcas/modelos sugerida no form (autocomplete client-side) mas
  free-text por baixo
- Performance: tela carrega ≤ 1.5s em 3G

---

## Decisões de design

### Limite duro de 3 carros, não soft
Cliente real raramente tem 4+ carros performance. Permitir N carros abre
brecha pra usar 1 conta como "garagem coletiva" (família, oficina pirata,
etc). Limite duro força disciplina e protege garantia. Soft delete preserva
histórico — quem precisar trocar, deleta o antigo e adiciona o novo.

### Brand/model/year/motor imutáveis
Mudar marca/modelo de um carro existente é trapaça em garantia. Uma vez
cadastrado, virou rótulo. Quem comprou carro novo cria novo cadastro.
Cor e placa são editáveis (cliente pinta, faz licenciamento, troca placa).

### Status visual: pedido > mapState
Quando carro está em serviço/mapeamento, o estado "real" dele é instável.
Sobrepor o `mapState` por "Em serviço" evita confusão. Quando o pedido
finaliza com APROVADO, o handler atualiza `mapState` e o badge volta ao
default.

### Ativação atômica via endpoint dedicado
PATCH genérico de `isActive=true` exigiria racing-safe handling pra
manter "1 ativo por user". Endpoint dedicado encapsula a transação:
um update SET isActive=false WHERE userId E outro SET isActive=true
WHERE id, ambos no mesmo `$transaction`. Constraint do banco protege.

### Placa única incluindo soft-deleted
Reusar a mesma placa em uma "novo" registro ofusca o histórico (cliente
deletou Carro A com placa X, criou Carro B com placa X — dois carros
diferentes ou o mesmo carro vendido?). Forçar placa única no nível do
user evita ambiguidade. Quem quer "ressuscitar" um carro deletado: TPC
faz manual (Sprint 4 endpoint admin).

### Garagem como porta única de cadastro
Onboarding inicial (Sprint 1) é só intro. Cadastro real de carro acontece
em `/garagem/adicionar`. Decisão: não duplica fluxo. Reuso máximo do
form de 5 steps.

---

## Modelo de dados

`Car` já existe em `packages/db/prisma/schema.prisma` desde a Sprint 0,
não muda nesta feature:

```prisma
model Car {
  id        String    @id @default(uuid())
  userId    String
  brand     String
  model     String
  year      Int
  motorType String     // 'gasoline' | 'turbo' | 'diesel' | 'flex' | 'atmo' | 'hybrid'
  plate     String
  color     String?
  isActive  Boolean   @default(true)
  mapState  MapState  @default(STOCK)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  user         User          @relation(fields: [userId], references: [id])
  solicitacoes Solicitacao[]
  remapOrders  RemapOrder[]

  @@unique([userId, plate])
  @@index([userId, isActive])
}
```

Possível migration v1.1 (não obrigatória pra MVP):
- Adicionar `warrantyExpiresAt: DateTime?` pra cachear o cálculo de garantia
- Adicionar `lastStageDebitedAt: DateTime?` pra audit
- Adicionar `activeOrderType` derivado (otimização de read), mas computar
  no endpoint via join é suficiente por agora

---

## Endpoints

Todos sob `preHandler: [app.requireAuth]`, scope = user atual.

### `GET /me/cars`
Lista carros não-deletados do user, ordenados ativo-primeiro depois por
`createdAt asc`.

Inclui pedidos ativos via includes para enriquecer o card:
```ts
{
  cars: [
    {
      id, brand, model, year, motorType, plate, color, isActive, mapState,
      createdAt,
      activeOrder: {
        type: 'remap' | 'presencial',
        id: string,
        label: string,  // "EGR off em mapeamento", "DPF off agendado"
      } | null,
      extraOrders: number,  // count de pedidos extras pendentes
      warranty: {
        pct: number,        // 0-1
        text: string,       // "8 meses restantes" | "Expirada"
      } | null,             // null quando mapState === 'STOCK'
    }
  ],
  meta: { count: number, limit: 3 }
}
```

### `POST /me/cars`
Cria carro. Body:
```ts
{
  brand: string,                // 2-60 chars
  model: string,                // 2-60 chars
  year: number,                 // int, 1980-currentYear+1
  motorType: 'gasoline' | 'turbo' | 'diesel' | 'flex' | 'atmo' | 'hybrid',
  plate: string,                // regex Mercosul OU antiga (sem hífen)
  color?: string,
}
```

Erros:
- `GARAGE_LIMIT_REACHED` (422) — 3 carros não-deletados
- `PLATE_ALREADY_REGISTERED` (409) — placa já existe pro user (mesmo
  soft-deleted)
- `VALIDATION_ERROR` (400) — Zod

Response: o carro criado, mesmo shape do GET.

### `PATCH /me/cars/:id`
Edita carro. Body:
```ts
{
  color?: string,
  plate?: string,  // se mudar, mesma regra de unicidade
}
```

Erros:
- `NOT_FOUND` (404) — id inexistente ou de outro user ou soft-deleted
- `PLATE_ALREADY_REGISTERED` (409)
- `CAR_HAS_PENDING_ORDERS` (422) — quando tenta mudar `plate` e há pedido
  ativo

### `POST /me/cars/:id/activate`
Marca o carro como ativo, desmarca os outros. Idempotente.

Erros:
- `NOT_FOUND` (404) — id inexistente ou deletado

Response:
```ts
{ ok: true, activeCarId: string }
```

### `DELETE /me/cars/:id`
Soft delete. Re-elege ativo se necessário.

Erros:
- `NOT_FOUND` (404)
- `CAR_HAS_PENDING_ORDERS` (422)

Response:
```ts
{ ok: true, deletedCarId: string, newActiveCarId: string | null }
```

---

## Critérios de aceitação

Cada um vira teste (unit + integration).

### Backend
- [ ] `POST /me/cars` cria o primeiro carro com `isActive=true`
- [ ] `POST /me/cars` cria o segundo carro com `isActive=false`
- [ ] 4ª chamada retorna 422 `GARAGE_LIMIT_REACHED`
- [ ] Placa em outro user NÃO bloqueia
- [ ] Mesma placa no mesmo user (mesmo soft-deleted) retorna 409
- [ ] `POST /me/cars/:id/activate` deixa apenas 1 carro `isActive=true`
- [ ] `DELETE /me/cars/:id` no carro ativo elege o próximo mais antigo como ativo
- [ ] `DELETE /me/cars/:id` com Solicitacao PENDENTE retorna 422
- [ ] Listagem de carros excluí soft-deleted
- [ ] `GET /me/cars` em conta sem carros retorna `{ cars: [], meta: { count: 0, limit: 3 } }`
- [ ] `PATCH /me/cars/:id` ignora alterações em brand/model/year/motorType
  (não falha, só desconsidera)
- [ ] Ordenação: ativo primeiro, depois por createdAt asc

### Frontend
- [ ] `/garagem` empty: mostra silhueta + CTA "Adicionar carro"
- [ ] `/garagem` com 1-2 carros: lista + FAB visível e clicável
- [ ] `/garagem` com 3 carros: card "Limite atingido" + FAB disabled (visualmente cinza)
- [ ] Card do carro ativo tem border vermelho + shadow + badge "ATIVO"
- [ ] Card com `activeOrder` mostra detail row com tipo (remap/presencial) + ícone
- [ ] Badge de status sobrepõe `mapState` quando há `activeOrder`
- [ ] Botão muda baseado em estado: "Solicitar serviço" (ativo, sem pedido)
  / "Tornar ativo" (não ativo, sem pedido) / "Ver pedido" (com activeOrder)
- [ ] Garantia bar aparece somente quando `mapState != STOCK` e sem `activeOrder`

### Fluxo Adicionar Carro
- [ ] 5 steps (marca, modelo, ano, motor, placa) com progress bar
- [ ] Back button volta step, sem perda de dados já preenchidos
- [ ] Placa validada client-side com regex + máscara visual
- [ ] Submit no último step → POST + redireciona pra `/garagem`
- [ ] Erro de placa duplicada exibe inline sem perder o form
- [ ] Erro de limite retorna ao `/garagem` com toast (ou redirect pré-submit
  se já no limite)

---

## Out of scope (v1)

- Importar dados do carro via FIPE ou base externa
- OCR de placa via câmera
- Upload de foto/imagem do carro real (sprite só por `type`: sedan/hatch/
  suv/coupe/wagon/pickup)
- Compartilhar carro entre contas (1 carro → N users)
- Mudança automática de `mapState` por API externa (RENAVAM, etc)
- Garantia variável por serviço (hoje 12m default fixo)
- Histórico detalhado dentro do card (timeline é só preview, "VER TUDO" leva
  pro Histórico unificado — Sprint 4)
- "Tornar ativo" e "Solicitar serviço" juntos (cliente clica em "Solicitar"
  num não-ativo: backend retorna erro ou activate-then-solicitate? Decisão:
  obriga "Tornar ativo" antes, fluxo explícito)

---

## Referências

- Wireframe: `tpc-painelv11.zip`, `tpc-screens-4.jsx` linhas 580-960
- Constituição: `CLAUDE.md` ("Garagem: máximo 3 carros, 1 ativo por vez")
- Rules: `.claude/rules/api.md`, `.claude/rules/db.md`, `.claude/rules/frontend.md`
- Decisão TPC pendente: [TPC-DECISION #9] política de garantia real
