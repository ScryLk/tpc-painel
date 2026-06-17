# Rotas da API · TPC Painel

> Última atualização: 2026-06-17
> Fonte: `apps/api/src/routes/**` (Fastify)
> Convenção: paths começam em `/`. JSON body por default. Auth via Bearer JWT do Clerk no header `Authorization`. Erros uniformes em `{ error: { code, message } }`.

Tipos de auth:
- **público** — sem header de auth (landing, catálogo, webhooks)
- **requireAuth** — qualquer user logado (Customer / Staff / Admin)
- **requireRole(STAFF)** — Staff ou Admin (Admin herda Staff)
- **requireRole(ADMIN)** — apenas Admin

---

## 1. Públicas

Sem JWT. Algumas têm proteção alternativa (token compartilhado, HMAC).

### Health
| Método | Path | Origem |
|---|---|---|
| GET | `/health` | [health.ts](apps/api/src/routes/health.ts) |

### Catálogo (consumido pelo app e por landing externa)
| Método | Path | Origem |
|---|---|---|
| GET | `/servicos` | [servicos.ts](apps/api/src/routes/servicos.ts) |
| GET | `/servicos/:id` | [servicos.ts](apps/api/src/routes/servicos.ts) |
| GET | `/remap-services` | [remap-services.ts](apps/api/src/routes/remap-services.ts) |
| GET | `/remap-services/:id` | [remap-services.ts](apps/api/src/routes/remap-services.ts) |
| GET | `/pacotes` | [pacotes.ts](apps/api/src/routes/pacotes.ts) |

### Lead ingest (landing externa → painel)
| Método | Path | Notas |
|---|---|---|
| POST | `/leads` | requer header `X-Lead-Token` = `env.LEADS_INGEST_TOKEN`. [leads.ts](apps/api/src/routes/leads.ts) |

### Webhooks
| Método | Path | Notas |
|---|---|---|
| POST | `/webhooks/mercadopago` | HMAC validado via `MP_WEBHOOK_SECRET`. Idempotente. [webhooks.ts](apps/api/src/routes/webhooks.ts) |

---

## 2. Cliente autenticado (`requireAuth`)

Todas exigem JWT do Clerk.

### Conta (`/me`)
| Método | Path | Descrição |
|---|---|---|
| GET | `/me` | Perfil completo + saldo + endereço |
| PATCH | `/me/profile` | Atualiza nome, telefone, CPF/CNPJ, endereço |
| PATCH | `/me/avatar` | Atualiza avatar URL |
| POST | `/me/onboarding/dismiss` | Marca welcome modal como visto |
| GET | `/me/saldo` | Saldo disponível e reservado |
| GET | `/me/atividade` | Últimas transações |

Origem: [me.ts](apps/api/src/routes/me.ts)

### LGPD (`/me/consents`, `/me/data-export`, `/me/account`)
| Método | Path | Descrição |
|---|---|---|
| GET | `/me/consents` | Estado atual dos consentimentos |
| PUT | `/me/consents` | Atualiza consentimentos granulares |
| POST | `/me/data-export` | Solicita ZIP com todos os dados |
| GET | `/me/data-export/latest` | Última solicitação |
| GET | `/me/data-export/:id/download` | Download signed URL do ZIP |
| POST | `/me/account/deletion` | Agenda exclusão (30d de carência) |
| GET | `/me/account/deletion` | Status da exclusão agendada |
| DELETE | `/me/account/deletion` | Cancela exclusão agendada |

Origem: [lgpd.ts](apps/api/src/routes/lgpd.ts)

### Garagem
| Método | Path | Descrição |
|---|---|---|
| GET | `/me/cars` | Lista carros |
| POST | `/me/cars` | Adiciona carro (max 3) |
| PATCH | `/me/cars/:id` | Atualiza cor/placa |
| POST | `/me/cars/:id/activate` | Marca como ativo (1 por vez) |
| DELETE | `/me/cars/:id` | Soft delete (bloqueado se pedido em aberto) |

Origem: [cars.ts](apps/api/src/routes/cars.ts)

### Notificações
| Método | Path | Descrição |
|---|---|---|
| GET | `/me/notifications` | Lista com `unreadCount` |
| POST | `/me/notifications/:id/read` | Marca como lida |
| POST | `/me/notifications/read-all` | Marca todas |
| DELETE | `/me/notifications/:id` | Remove |

Origem: [notifications.ts](apps/api/src/routes/notifications.ts)

### Pagamentos (`/checkout`, `/purchases`)
| Método | Path | Descrição |
|---|---|---|
| POST | `/checkout` | Inicia compra de pacote (Pix ou cartão MP) |
| GET | `/purchases/:id` | Detalhe da compra |

Origem: [checkout.ts](apps/api/src/routes/checkout.ts), [purchases.ts](apps/api/src/routes/purchases.ts)

### Cartões salvos
| Método | Path | Descrição |
|---|---|---|
| GET | `/me/saved-cards` | Lista cartões tokenizados |
| POST | `/me/saved-cards` | Salva novo cartão pós-compra |
| DELETE | `/me/saved-cards/:id` | Remove cartão |
| POST | `/me/saved-cards/:id/default` | Promove a padrão |
| GET | `/me/cartoes-salvos` | Alias legado (mesma listagem) |
| DELETE | `/me/cartoes-salvos/:id` | Alias legado |

Origem: [saved-cards.ts](apps/api/src/routes/saved-cards.ts), [me.ts](apps/api/src/routes/me.ts)

### Pedidos presenciais (`/solicitacoes`)
| Método | Path | Descrição |
|---|---|---|
| POST | `/solicitacoes` | Agenda serviço presencial |
| GET | `/me/solicitacoes` | Lista do user |
| GET | `/solicitacoes/:id` | Detalhe |
| POST | `/solicitacoes/:id/cancel` | Cancela (com regra de multa por janela) |

Origem: [solicitacoes.ts](apps/api/src/routes/solicitacoes.ts)

### File service (`/remap-orders`)
| Método | Path | Descrição |
|---|---|---|
| POST | `/remap-orders` | Cria pedido (padrão ou custom) |
| GET | `/me/remap-orders` | Lista do user |
| GET | `/remap-orders/:id` | Detalhe + arquivos + status |
| POST | `/remap-orders/:id/cancel` | Cancela |
| POST | `/remap-orders/:id/accept-quote` | Aceita orçamento custom |
| GET | `/remap-orders/:id/messages` | Histórico do chat |
| POST | `/remap-orders/:id/messages` | Envia mensagem no chat |
| POST | `/remap-orders/:id/approve` | Aprova arquivo modificado (gera DEBIT final) |
| POST | `/remap-orders/:id/dev/simulate-tpc-reply` | Helper dev (TPC responde) |

Origem: [remap-orders.ts](apps/api/src/routes/remap-orders.ts)

---

## 3. Admin

Sob `/admin/**`. Todas com `requireRole(STAFF)` exceto onde explicitado.

### Leads (resposta à landing)
| Método | Path | Descrição |
|---|---|---|
| GET | `/admin/leads` | Lista por status (NEW / REPLIED / ARCHIVED) |
| GET | `/admin/leads/:id` | Detalhe |
| POST | `/admin/leads/:id/reply` | Envia resposta por email |
| POST | `/admin/leads/:id/archive` | Arquiva sem responder |

Origem: [admin/leads.ts](apps/api/src/routes/admin/leads.ts)

### Usuários
| Método | Path | Auth | Descrição |
|---|---|---|---|
| GET | `/admin/users` | STAFF | Lista paginada com busca + filtro de role |
| GET | `/admin/users/:id` | STAFF | Detalhe completo + saldo + counts |
| PATCH | `/admin/users/:id` | STAFF | Edita nome, telefone, CPF/CNPJ |
| PATCH | `/admin/users/:id/role` | **ADMIN** | Promove/demove role |
| GET | `/admin/users/:id/sessions` | STAFF | Lista sessões ativas (Clerk SDK) |
| POST | `/admin/users/:id/sessions/:sessionId/revoke` | STAFF | Força logout de uma sessão |
| POST | `/admin/users/:id/password-reset` | STAFF | Envia email com link de reset + revoga sessões |

Origem: [admin/users.ts](apps/api/src/routes/admin/users.ts)

### Catálogo presencial (`Service`)
| Método | Path | Descrição |
|---|---|---|
| GET | `/admin/services` | Lista (inclui inativos) |
| GET | `/admin/services/:id` | Detalhe |
| POST | `/admin/services` | Cria serviço |
| PATCH | `/admin/services/:id` | Edita (slug imutável) |

Origem: [admin/services.ts](apps/api/src/routes/admin/services.ts)

### Catálogo file service (`RemapService`)
| Método | Path | Descrição |
|---|---|---|
| GET | `/admin/remap-services` | Lista |
| GET | `/admin/remap-services/:id` | Detalhe |
| POST | `/admin/remap-services` | Cria |
| PATCH | `/admin/remap-services/:id` | Edita |

Origem: [admin/remap-services.ts](apps/api/src/routes/admin/remap-services.ts)

### Pacotes de pontos
| Método | Path | Descrição |
|---|---|---|
| GET | `/admin/packages` | Lista |
| GET | `/admin/packages/:id` | Detalhe |
| POST | `/admin/packages` | Cria |
| PATCH | `/admin/packages/:id` | Edita (tier imutável) |
| DELETE | `/admin/packages/:id` | Hard delete (bloqueado se tem `Purchase`) |

Origem: [admin/packages.ts](apps/api/src/routes/admin/packages.ts)

### Marketing
| Método | Path | Descrição |
|---|---|---|
| GET | `/admin/marketing-campaigns` | Lista campanhas |
| GET | `/admin/marketing-campaigns/:id` | Detalhe + stats por status de delivery |
| POST | `/admin/marketing-campaigns` | Cria DRAFT |
| PATCH | `/admin/marketing-campaigns/:id` | Edita DRAFT (422 se SENDING/SENT) |
| DELETE | `/admin/marketing-campaigns/:id` | Exclui DRAFT (422 se já SENT) |
| GET | `/admin/marketing-campaigns/:id/audience-count` | Estimativa de destinatários opt-in |
| POST | `/admin/marketing-campaigns/:id/test-send` | Envia preview pro admin logado |
| POST | `/admin/marketing-campaigns/:id/send` | Enfileira fan-out real (202) |

Origem: [admin/marketing-campaigns.ts](apps/api/src/routes/admin/marketing-campaigns.ts)

### Operação — Solicitações presenciais
| Método | Path | Descrição |
|---|---|---|
| POST | `/admin/solicitacoes/:id/confirm` | Confirma agendamento → libera reservation |
| POST | `/admin/solicitacoes/:id/start` | Marca em andamento |
| POST | `/admin/solicitacoes/:id/complete` | Conclui → DEBIT final |

Origem: [admin/solicitacoes.ts](apps/api/src/routes/admin/solicitacoes.ts)

### Operação — File service (remap orders)
| Método | Path | Descrição |
|---|---|---|
| POST | `/admin/remap-orders/:id/quote` | Manda orçamento pra um pedido custom |

Origem: [admin/remap-orders.ts](apps/api/src/routes/admin/remap-orders.ts)

---

## 4. Dev only

Rotas de uso interno em ambiente de desenvolvimento. Bloqueiam em produção.

| Método | Path | Auth | Descrição |
|---|---|---|---|
| POST | `/dev/test-email` | requireAuth | Dispara email transacional pro próprio user (preview) |
| POST | `/dev/test-marketing` | requireAuth | Dispara email de showcase pro próprio user |
| POST | `/remap-orders/:id/dev/simulate-tpc-reply` | requireAuth | Simula resposta da TPC no chat de file service |

Origem: [notifications.ts](apps/api/src/routes/notifications.ts), [remap-orders.ts](apps/api/src/routes/remap-orders.ts)

---

## Notas

- **Registro central** em [`apps/api/src/server.ts`](apps/api/src/server.ts). Cada arquivo de `routes/` exporta um plugin Fastify.
- **Sem auto-discovery** — quando adicionar rota nova, registrar no `server.ts`.
- **Validação** via Zod em todo body/query/params externos. Schemas compartilhados com o frontend via `@tpc/lib/validators`.
- **Erros** seguem o contrato `{ error: { code, message, details? } }`. Frontend deve ramificar por `code`, não por `message`.
- **Idempotência crítica**: `/webhooks/mercadopago` usa `mpTransactionId` como chave; `/leads` aceita header opcional `Idempotency-Key`.
- **Real-time**: chat de file service usa Socket.IO em paralelo às rotas REST de `/remap-orders/:id/messages`. Source of truth permanece no DB; WS é só pra empurrar updates.
