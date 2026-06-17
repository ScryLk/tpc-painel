# Feature: Admin · Serviços

> Status: rascunho, pronto pra implementar
> Versão: 0.1
> Atualizado: 2026-05-26

---

## Contexto

Terceira seção do painel admin. Permite TPC editar o catálogo de serviços
sem precisar do dev mexer no DB / seed. Cobre os dois canais do app:

- **Serviços presenciais** (`Service`): Stage 1, Pop & Bang, DPF, etc.
- **Serviços por arquivo** (`RemapService`): file service via chat.

## Garantia importante (motivo de não precisar versionamento)

`Solicitacao.pointsReserved` / `Solicitacao.pointsDebited` (e seus
equivalentes em `RemapOrder`) **copiam o snapshot** dos `pts` do serviço
no momento da reserva. Mudar `Service.pts` ou `RemapService.pts` no admin
**não retroage** em pedidos já abertos. Por isso, não é necessário criar
tabela de versões — basta editar in-place.

## Requisitos funcionais

### Listar presenciais (`GET /admin/services`)
- [ ] Requires `STAFF`.
- [ ] Sem paginação no MVP (catálogo é pequeno, <50 entries)
- [ ] Inclui inativos por padrão (admin precisa ver)
- [ ] Retorna todos os campos do model + `_count.solicitacoes`
- [ ] Ordena por `sortOrder asc, name asc`

### Listar por arquivo (`GET /admin/remap-services`)
- [ ] Mesmo shape. Retorna `_count.remapOrders`.

### Detalhe (`GET /admin/services/:id`, `GET /admin/remap-services/:id`)
- [ ] Mesmo shape do item da lista, sem count.

### Editar (`PATCH /admin/services/:id`)
- [ ] Body parcial:
  - `name`, `description`, `category` (enum), `pts` (≥1), `priceAvulsoCents`
    (≥0), `motorTypes` (string[]), `durationDays` (≥1), `popular`, `active`,
    `sortOrder`
- [ ] `slug` NÃO é editável (gera links externos / referências antigas)
- [ ] Log audit antes/depois

### Editar remap (`PATCH /admin/remap-services/:id`)
- [ ] Mesma ideia, com campos do RemapService:
  - `name`, `description`, `category` (string), `pts`, `priceAvulsoCents`,
    `supports` (string[]), `isCustom`, `active`, `sortOrder`

### Criar (`POST /admin/services`, `POST /admin/remap-services`)
- [ ] Slug é obrigatório no create. Validação: `^[a-z0-9-]+$`, max 60 chars.
- [ ] Body com todos os campos obrigatórios + opcionais.
- [ ] Conflict 409 se slug já existe.

### Toggle active (sem endpoint próprio)
- [ ] Faz parte do PATCH editar. Soft-deactivate via `active=false`.
- [ ] Hard delete NÃO existe no MVP (pra preservar referências de orders).

## Requisitos não-funcionais

### UI
- Página `/admin/servicos` com tabs no topo: **Presenciais** | **Por arquivo**
- Cada tab mostra tabela compacta com: Nome, Categoria, Pts, Status, Ações
- Linha clicável → modal de edição
- Botão "Novo serviço" no topo da tab corrente
- Confirmação obrigatória pra desativar serviço que tem orders em aberto

### Performance
- Lista é pequena, sem paginação. Cache de 60s no client.

## Fora do escopo (Phase 2)
- Hard delete
- Editar slug
- Bulk import/export (CSV, JSON)
- Histórico de mudanças de preço
- Preview de compatibilidade ("quais carros suportam esse serviço")
- Mover entre categorias com confirmação especial
