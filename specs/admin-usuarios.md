# Feature: Admin · Usuários

> Status: rascunho, pronto pra implementar
> Versão: 0.1
> Atualizado: 2026-05-26

---

## Contexto

Segunda seção do painel admin. Permite o time TPC ver e editar usuários
cadastrados no app. Foco: visibilidade + ajustes administrativos pontuais
(corrigir CPF, telefone, promover staff, ver saldo/atividade de um cliente
que abriu ticket).

NÃO é onde se faz exclusão de conta (já existe fluxo LGPD self-service em
`/me/account`) nem onde se mexe em saldo manualmente (auditoria via
Transaction direto no DB por enquanto, fora do escopo).

---

## Requisitos funcionais

### Listar (`GET /admin/users`)
- [ ] Requires `STAFF`. Query params:
  - `q` (busca por nome, email, ou CPF/CNPJ — ILIKE em qualquer um)
  - `role` (filtro por `CUSTOMER` | `STAFF` | `ADMIN`)
  - `limit` (default 50, max 100)
  - `cursor` (id do último item da página anterior)
- [ ] Retorna lista com shape compacto: id, name, email, role, cpfCnpj,
  createdAt, balance.available, balance.reserved, deletedAt, pendingDeletion,
  carsCount.
- [ ] Ordenação: `createdAt DESC, id DESC` (estável pra cursor pagination)
- [ ] Inclui deletados/pending (com flag) — admin precisa ver

### Detalhe (`GET /admin/users/:id`)
- [ ] Requires `STAFF`. Retorna user full + balance + counts (cars,
  purchases, solicitacoes, remapOrders) + últimas 10 transações + endereço
- [ ] Inclui `consent` (LGPD flags atuais)

### Editar (`PATCH /admin/users/:id`)
- [ ] Requires `STAFF`. Body parcial:
  - `name?: string` (max 200)
  - `phone?: string | null` (max 40)
  - `cpfCnpj?: string | null` (validação básica de 11 ou 14 dígitos)
- [ ] Email NÃO é editável aqui (Clerk-managed, fluxo próprio)
- [ ] Avatar NÃO é editável aqui (user gerencia em /perfil)
- [ ] Endereço fora do escopo do MVP (PATCH separado depois se precisar)
- [ ] Se cpfCnpj conflita com outro user, retorna 409 `CPF_CNPJ_CONFLICT`
- [ ] Log de mudança em `request.log.info` com diff before/after

### Mudar role (`PATCH /admin/users/:id/role`)
- [ ] Requires `ADMIN` (não STAFF — escalation só admin promove)
- [ ] Body: `{ role: 'CUSTOMER' | 'STAFF' | 'ADMIN' }`
- [ ] Não pode mudar a própria role (evita auto-rebaixamento acidental)
- [ ] Log explícito da mudança (auditoria — quem promoveu quem, quando)
- [ ] Não toca em Clerk publicMetadata (DB é fonte de verdade nessa arquitetura,
  conforme `auth.ts:requireAuth` deriva role do DB)

---

## Requisitos não-funcionais

### Segurança
- Lista filtra `deletedAt: null` por padrão; só com `?includeDeleted=true`
  inclui (escondido do UI cliente)
- Endpoint de detalhe RETORNA dados de user deletado (admin precisa ver
  audit)
- PII (CPF, telefone) aparece em logs apenas mascarado (`***`)
- Mudança de role gera linha em `Transaction`? NÃO — Transaction é só pra
  saldo. Log normal via `request.log.warn` com tag `audit:role-change`

### Performance
- Lista paginada (cursor). 50 por padrão.
- Busca usa Postgres ILIKE com índice — adicionar índices em
  `email`, `name`, `cpfCnpj` se ainda não houver
- Detalhe: 1 query com `include` (não N+1)

### UI
- Lista: tabela compacta com colunas Nome, Email, Role (badge), CPF, Saldo,
  Cadastro, Status. Linha clicável → detalhe.
- Filtros: input de busca + dropdown de role + toggle "ver deletados"
- Detalhe: 3 seções — Dados pessoais (editável), Conta (role + status +
  consent), Atividade (saldo + counts + últimas transações)
- Edit inline ou modal? Modal por enquanto, mais simples
- Confirmação obrigatória pra mudança de role

---

## Phase 2 — implementado
- Ver sessões ativas do user (via Clerk backend `sessions.getSessionList`)
- Forçar logout de uma sessão específica (Clerk `sessions.revokeSession`)
  - Caveat documentado: JWT do cliente só invalida no próximo refresh (~5min)
- Validação de ownership: admin não consegue revogar sessão alheia chutando ID
- **Reset de senha admin-iniciado**: gera Clerk sign-in token (1h, one-time),
  envia email com link via Resend. Admin nunca vê a senha — user clica no
  link, fica logado, troca a senha em /perfil → Segurança. Template
  `PasswordReset.tsx` deixa claro que foi admin-iniciado pra reduzir suspeita
  de phishing.
  - Bloqueado em contas deletadas
  - Email é transacional, ignora consent.marketingEmail

## Phase 3 — ainda fora do escopo
- Anonimizar PII manualmente (separado do fluxo LGPD)
- Histórico de pedidos do user com filtros
- Editar endereço
- Bulk ops (selecionar múltiplos, exportar CSV)
- "Online agora" view global (sessões ativas across all users)

---

## Endpoints (resumo)

```
GET    /admin/users?q=&role=&limit=&cursor=&includeDeleted=
GET    /admin/users/:id
PATCH  /admin/users/:id            { name?, phone?, cpfCnpj? }
PATCH  /admin/users/:id/role       { role }    # ADMIN only
```

## Schemas Zod (compartilhados em @tpc/lib/validators)

```ts
listUsersQuerySchema:    { q?, role?, limit?, cursor?, includeDeleted? }
updateUserAdminSchema:   { name?, phone?, cpfCnpj? }
updateUserRoleSchema:    { role: Role }
```
