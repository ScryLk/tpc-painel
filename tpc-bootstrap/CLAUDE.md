# TPC Painel — Constituição

Documento curto. Regras de ouro. Quando em dúvida, lê isso primeiro.

## O que é

App de carteira pré-paga pra serviços de remap automotivo da TPC Performance.
Cliente compra pacotes de pontos com desconto progressivo, depois resgata em
serviços (Stage 1/2/3, DPF off, Pop & Bang, etc.) executados na oficina física.

Modelo de negócio: voucher digital pré-pago. Cliente nunca paga avulso pelo app
(apenas referência de "economia"). O app é fluxo de pontos.

## Stack — não negociar sem discussão

- **Monorepo**: pnpm workspaces + Turborepo
- **Backend**: Node + Fastify 5
- **DB**: PostgreSQL 16 + Prisma 6 + Redis 7 (jobs, cache)
- **Frontend web**: Next.js 15 App Router + Tailwind v4
- **Auth**: Clerk
- **Pagamento**: Mercado Pago (Pix + Cartão até 3x sem juros)
- **Storage**: Cloudflare R2
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
Saldo = available + reserved. Reservation expira em 24h se TPC não confirmar.
Job `expire-reservation.ts` é crítico. Testar bem.

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

## Decisões já tomadas (não rediscutir sem motivo forte)

- **Painel admin TPC**: rota dentro de `apps/web/(admin)/`, NÃO app separado
- **Mobile**: PWA no MVP. Expo só depois
- **Pacotes**: Iniciante 100/R$100, Stage 1 500/R$450, Pro 1000/R$850, VIP 2000/R$1600
- **VIP custo/pt**: inconsistência conhecida (R$0,80 vs R$0,74 do Pro), validar com TPC
- **Pagamento avulso (sem pontos)**: NÃO existe no app. Só ponto
- **Diagnóstico**: sempre grátis no app
- **Política de cancelamento**: 24h livre / 24h-2h com 20% multa / <2h aprovação manual
- **Saldo reservado**: clienta vê separado de disponível
- **Cartão salvo**: tokenização Mercado Pago (1-click em recompras)
- **Notificações**: WhatsApp + email (NF) + push in-app

## Decisões pendentes (validar com TPC antes de codar a parte afetada)

Marcadas como `[TPC-DECISION]` no código quando aparecer:

- **Preços avulso reais por serviço** (catálogo usa placeholders)
- **Percentuais reais de ganho por serviço/carro** (Stage 1/2/3 etc)
- **CNPJ da TPC** (necessário pra receber pelo Mercado Pago como PJ + emitir NF)
- **Sistema de agendamento real** (hoje é manual via WhatsApp; calendar do app é otimista)
- **WhatsApp Business API** ativa (Twilio, Z-API, ou Cloud API direto)
- **Endereço(s) da(s) oficina(s)** da TPC
- **Horário de funcionamento + feriados**

## Quando perguntar antes de fazer

- Mudar schema do DB (migrações são caras)
- Adicionar nova dependência externa pesada
- Mudar rota pública existente (breaks API)
- Tocar em webhook do Mercado Pago
- Lógica que altera saldo de pontos
- Adicionar role/permissão nova

Pra resto, segue o que faz sentido. Lucas confia.

## Onde encontrar mais

- **Mapa do monorepo**: `INDEX.md`
- **Regras por escopo**: `.claude/rules/{api,frontend,db,testing,git}.md`
- **Specs de feature**: `specs/<feature>.md`
- **Preferências pessoais Lucas**: `CLAUDE.local.md` (gitignored, não compartilhado)
- **Setup pra dev**: `README.md`
