# TPC Painel — Constituição

Documento curto. Regras de ouro. Quando em dúvida, lê isso primeiro.

## O que é

App de carteira pré-paga pra serviços de remap automotivo da TPC Performance.
Cliente compra pacotes de pontos com desconto progressivo, depois resgata em
serviços executados em **2 canais**:

1. **Presencial** na oficina TPC de Panambi/RS (Stage 1/2/3, Pop & Bang, DPF, etc.)
2. **Por arquivo** (file service): cliente envia .bin/.ori, TPC mapeia, devolve modificado pelo chat

Modelo de negócio: voucher digital pré-pago. Cliente nunca paga avulso pelo app
(apenas referência de "economia"). O app é fluxo de pontos.

## Stack — não negociar sem discussão

- **Monorepo**: pnpm workspaces + Turborepo
- **Backend**: Node + Fastify 5
- **DB**: PostgreSQL 16 + Prisma 6 + Redis 7 (jobs, cache)
- **Real-time**: Socket.IO sobre Fastify (chat de file service)
- **Frontend web**: Next.js 15 App Router + Tailwind v4
- **Auth**: Clerk
- **Pagamento**: Mercado Pago (Pix + Cartão até 3x sem juros)
- **Storage**: Cloudflare R2 (arquivos .bin/.ori, NFs, comprovantes)
- **WhatsApp**: API Business (provider definido depois)
- **Mobile**: PWA no MVP. Expo só depois de validar tração.
- **Testes**: Vitest + Testing Library

Detalhes do monorepo: ver `INDEX.md`.

## Regras de ouro

### 1. Spec first
Antes de implementar feature nova, ler ou criar `specs/<feature>.md`. Não
codar feature sem spec aprovada. Spec versionada no git, evolui junto.

### 2. Sem em-dashes em comentários, copy, ou commits
Lucas não gosta. Use vírgula, ponto, ou dois-pontos.

### 3. Server Components first (Next.js)
Default é Server Component. `'use client'` só quando precisa state, effect,
ou browser API. Não vai dropando `'use client'` no topo de tudo.

### 4. Validação com Zod, sempre
Toda input externo (body, query, params, env) passa por Zod. Sem `any`.

### 5. Pontos têm 2 estados: disponível + reservado
Saldo = available + reserved. Reservation expira em 24h se TPC não confirmar
(pedido presencial). Pra file service, fica reservado até cliente aprovar o
arquivo modificado. Jobs `expire-reservation.ts` e `expire-remap-quote.ts`
são críticos. Testar bem.

### 6. Webhook Mercado Pago é zona perigosa
Idempotente, retry-safe, valida assinatura HMAC. Toda transação de crédito
de pontos passa por aqui. Se quebrar, cliente paga e não recebe pontos.

### 7. Database como single source of truth
Não duplicar lógica de negócio (preço, bônus, compatibilidade) em frontend.
Vem do banco via API. Frontend só renderiza.

### 8. Português brasileiro pra usuário, inglês pra código
Copy do app, UI, e mensagens visíveis ao cliente: PT-BR informal sem
gerundismos esquisitos. Código, commits, nomes de variável, comentários
técnicos: EN.

### 9. Mobile-first nas telas
Wireframe é 390px de largura. Web responsive expande pra cima, não pra baixo.

### 10. Conventional Commits
`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`. Sem scopes obrigatórios
mas se ajudar use (`feat(api): adiciona endpoint X`).

### 11. NUNCA commitar segredos
`.env` é gitignored. Use `.env.example` com placeholders. Em produção,
secrets vão pra Vercel/Railway env vars.

### 12. Testes em mudança crítica
Mudou lógica de saldo, reserva, webhook MP, ou auth? Tem que ter teste.
Não precisa cobrir tudo, mas o que pode quebrar dinheiro tem.

### 13. File service: chat e arquivos são frágeis
Real-time chat (Socket.IO) e upload de arquivos `.bin` pra R2 são pontos de
falha. Testar reconnect, retry, integridade SHA256, signed URLs com expiração.

### 14. LGPD não é opcional
Cliente brasileiro tem direito a:
- Exportar todos os dados (ZIP gerado por job)
- Excluir conta (após período de carência por questões fiscais)
- Gerenciar consentimentos granulares

Marketing **default OFF**, transacional **default ON**. Não inverter.

### 15. Acesso a arquivos modificados é PRA SEMPRE
Cliente que comprou pontos e aprovou arquivo modificado tem direito de baixar
pra sempre. Storage R2 é barato, valor pro cliente é alto. Não implementa
expiração de arquivos sem decisão explícita da TPC.

## Decisões já tomadas (não rediscutir sem motivo forte)

### Arquitetura
- **Painel admin TPC**: rota dentro de `apps/web/(admin)/`, NÃO app separado
- **Mobile**: PWA no MVP. Expo só depois
- **File service e presencial**: 2 canais paralelos no mesmo app, mesma carteira
- **Catálogo**: tabs no topo separam "Presencial" / "Por arquivo"

### Pontos e pacotes
- **Pacotes**: Iniciante 100/R$100, Stage 1 500/R$450, Pro 1000/R$850, VIP 2000/R$1600
- **VIP custo/pt**: inconsistência conhecida (R$0,80 vs R$0,74 do Pro), validar com TPC
- **Pagamento avulso (sem pontos)**: NÃO existe no app. Só ponto
- **Saldo reservado**: cliente vê separado de disponível
- **Cartão salvo**: tokenização Mercado Pago (1-click em recompras)

### Presencial
- **Diagnóstico**: sempre grátis no app
- **Política de cancelamento**: 24h livre / 24h-2h com 20% multa / <2h aprovação manual
- **Multi-dia (Stage 3)**: auto-bloqueio do calendar (cliente seleciona início, sistema reserva dia+1)
- **Garagem**: máximo 3 carros, 1 ativo por vez
- **Status do carro**: estado do mapa (stock/stage1/stage2/stage3) sobreposto por pedido em andamento

### File service
- **Fluxo padrão**: cliente solicita serviço com preço fixo → reserva pontos → envia arquivo → TPC mapeia → entrega no chat → cliente aprova → débito final
- **Fluxo custom**: cliente envia arquivo + descrição (sem reserva) → TPC orça em 24h → cliente aceita ou recusa → segue fluxo padrão
- **Arquivos aceitos**: `.bin`, `.ori`, `.frf`, `.kess`, `.fls` · máx 16MB
- **Dados técnicos no upload**: ECU, hardware, modo de leitura (OBD/Bench/Boot), chassi, KM, observações
- **Hardware do cliente**: KESS V2/V3, MPPS, FLEX, autotuner, OBDLink, Outro
- **Anti-pirataria**: NÃO implementado no MVP. Aceita perda. TPC decide depois se quer marca d'água ou chassi lock.
- **Retenção do arquivo modificado**: pra sempre. Cliente baixa quando quiser pelo Histórico.

### Notificações
- **WhatsApp + email** pra eventos importantes (pedido confirmado, arquivo entregue, etc.)
- **Push** pro app (PWA)
- **Marketing**: opt-in explícito (LGPD)
- **Transacional**: default ON, cliente pode desligar canal a canal

## Decisões pendentes (validar com TPC antes de codar a parte afetada)

Marcadas como `[TPC-DECISION]` no código quando aparecer:

1. **CNPJ da TPC** — pra receber pelo MP como PJ + emitir NF
2. **Preços avulso reais por serviço** (8 placeholders no catálogo presencial + 9 no remap)
3. **Percentuais reais de ganho por serviço/carro** (Stage 1/2/3 etc · hoje plausíveis)
4. **WhatsApp Business API ativa** (Twilio, Z-API, ou Cloud API direto)
5. **Endereço(s) da(s) oficina(s)** da TPC
6. **Horário de funcionamento + feriados** (sáb tarde? domingos? feriados nacionais?)
7. **TPC topa absorver 3-4% taxa pra 3x sem juros?**
8. **Política anti-pirataria** pra file service (marca d'água? chassi lock? aceita perda?)
9. **Política de garantia** (12 meses padrão? varia por serviço?)
10. **Sistema de agendamento real** (hoje TPC faz manual via WhatsApp)
11. **Lista real de ECUs suportadas** por serviço de file service
12. **Tempo médio de entrega** por serviço (4h pra Stage 1? confirmar)

## Quando perguntar antes de fazer

- Mudar schema do DB (migrações são caras)
- Adicionar nova dependência externa pesada
- Mudar rota pública existente (breaks API)
- Tocar em webhook do Mercado Pago
- Lógica que altera saldo de pontos
- Adicionar role/permissão nova
- Tocar em real-time chat (Socket.IO)
- Mudar storage de arquivos (R2 paths, retenção)
- Implementar anti-pirataria

Pra resto, segue o que faz sentido. Lucas confia.

## Onde encontrar mais

- **Mapa do monorepo**: `INDEX.md`
- **Regras por escopo**: `.claude/rules/{api,frontend,db,testing,git}.md`
- **Specs de feature**: `specs/<feature>.md`
- **Preferências pessoais Lucas**: `CLAUDE.local.md` (gitignored, não compartilhado)
- **Setup pra dev**: `README.md`
