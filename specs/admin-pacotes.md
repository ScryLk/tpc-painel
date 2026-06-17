# Feature: Admin · Pacotes de pontos

> Status: rascunho, pronto pra implementar
> Versão: 0.1
> Atualizado: 2026-05-26

---

## Contexto

Quarta seção do painel admin. Permite TPC editar os pacotes de pontos
(Iniciante, Stage 1, Stage 2/Pro, Stage 3/VIP) sem mexer no DB ou seed.

## Garantia importante (motivo de não precisar versionamento)

`Purchase.amountCents` e `Purchase.pointsCredited` **fazem snapshot** no
momento da compra (idem `Service.pts → Solicitacao`). Mudar preço/pontos do
Package no admin **não retroage** em compras já feitas. Sem necessidade de
versionar.

## Requisitos funcionais

### Listar (`GET /admin/packages`)
- [ ] Requires `STAFF`.
- [ ] Sem paginação (4-10 pacotes max). Inclui inativos.
- [ ] Retorna campos do model + `_count.purchases`
- [ ] Ordena por `sortOrder asc, name asc`

### Detalhe (`GET /admin/packages/:id`)
- [ ] Shape igual ao item da lista (sem count).

### Criar (`POST /admin/packages`)
- [ ] `tier` obrigatório, kebab-case lowercase. Imutável após criação.
- [ ] Body: tier, name, points (≥1), priceCents (≥1), bonusPoints (≥0),
  bonusPct (0-100), popular, active, sortOrder.
- [ ] 409 se tier já existe.

### Editar (`PATCH /admin/packages/:id`)
- [ ] Body parcial. `tier` NÃO editável.
- [ ] Validações iguais às do create.

### Excluir (`DELETE /admin/packages/:id`)
- [ ] Requires `STAFF`.
- [ ] Pre-check: se `_count.purchases > 0`, retorna 422 `PACKAGE_HAS_PURCHASES`
  com mensagem orientando o admin a desativar (active=false) em vez de excluir.
- [ ] Hard delete só permitido quando 0 purchases — preserva histórico fiscal
  (Lei 8.846/94: 5 anos de retenção de transações).
- [ ] UI bloqueia o botão de excluir quando `purchasesCount > 0` e mostra
  o count pra contexto.
- [ ] Log `audit:package-delete`.

## Requisitos não-funcionais

### UI
- Página `/admin/pacotes` com lista vertical (estilo cards/tabela compacta).
- Botão "+ Novo pacote" no header.
- Linha clicável → modal de edição. Mesmo shell dos modais de serviços.
- Badge "Popular" / "Inativo" visíveis na lista.
- Mostra `purchases` count pra contexto.

## Fora do escopo
- Hard delete
- Editar tier
- Histórico de mudanças de preço
- Calculadora visual de desconto
- A/B test entre dois preços
