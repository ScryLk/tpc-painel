# Feature: Campanhas de marketing (admin)

> Status: Fase 1 implementada (2026-05-26). Fase 2/3 pendentes.
> Versão: 0.2
> Atualizado: 2026-05-26
> Telas: `/admin/marketing` (lista), `/admin/marketing/[id]` (compose + preview)
> Depende de: sistema de emails (pronto), painel admin (existe scaffold em `apps/api/src/routes/admin`)

## Fase 1 — implementado

- Schema: `MarketingCampaign`, `MarketingCampaignDelivery`, enums
  `CampaignStatus`, `DeliveryStatus` (db push aplicado; setup formal de
  migrations pendente)
- Validators: `createMarketingCampaignSchema`, `updateMarketingCampaignSchema`
  em `@tpc/lib/validators`
- Template: `MarketingCustom.tsx` (title + body em parágrafos + CTA opcional)
- API endpoints sob `/admin/marketing-campaigns`: list, get, post, patch
  (DRAFT only), delete (DRAFT only), audience-count, test-send, send
- Job: `send-marketing-campaign` (fan-out com throttling 150ms entre
  enqueues pra respeitar Resend rate-limit free tier)
- Job processor de email atualiza `MarketingCampaignDelivery.status` →
  SENT/FAILED com resendId pra cruzar com webhooks (Fase 2)
- Frontend: lista de campanhas + compose com preview live

---

## Contexto

Hoje o TPC tem 4 emails transacionais wirados (orderCreated, fileDelivered,
paymentApproved, pixQrCreated) e 1 template de marketing (servicesShowcase)
disparável só pelo endpoint dev. Pra TPC poder fazer marketing real (anúncio
de novo serviço, promoção de pacote, newsletter mensal), precisa de uma
ferramenta de campanha onde staff:

1. Escreve o conteúdo do email (assunto, título, corpo, CTA)
2. Pré-visualiza
3. Define audiência (todos opt-in, segmento por atividade, etc.)
4. Dispara
5. Acompanha entrega (quantos enviados, abriram, clicaram)

Objetivo: TPC controla campanhas sem precisar de dev. LGPD compliance
embutido (só envia pra opt-in, unsubscribe em todo email).

---

## Requisitos funcionais

### Composição da campanha
- [ ] Campos: assunto, título grande, corpo (markdown ou HTML simples),
      texto do CTA, URL do CTA
- [ ] Preview do email renderizado dentro do layout padrão TPC (mesmo
      header + footer dos transacionais)
- [ ] Salvar como rascunho (status DRAFT) — não envia
- [ ] Validação: campos obrigatórios + URL válido

### Audiência
- [ ] Default: todos users com `Consent.marketingEmail = true`
- [ ] Filtros opcionais (Fase 2):
  - Comprou nos últimos N dias
  - Tem saldo > X pts
  - Já fez pedido presencial / file service
  - Adicionado depois de uma data específica

### Envio
- [ ] Botão "Enviar campanha" com confirmação dupla (modal "Tem certeza?
      Vai enviar pra N pessoas")
- [ ] Estimativa de destinatários antes de enviar
- [ ] "Test send" pro admin logado antes do envio real
- [ ] Fan-out via BullMQ: 1 job por user (ou batches de 50) — não bloqueia
      a UI, processa em background
- [ ] Rate limit no Resend: 10 req/s no plano grátis, batches respeitam

### Tracking
- [ ] Status da campanha: DRAFT / SENDING / SENT / FAILED
- [ ] `MarketingCampaignDelivery` log: campaignId, userId, sentAt, status
      (queued/delivered/failed/bounced/opened/clicked)
- [ ] Resend webhooks (open, click, bounce) atualizam o delivery row
- [ ] Dashboard simples: total enviado, taxa de entrega, taxa de abertura,
      taxa de clique

### LGPD
- [ ] Só envia se `Consent.marketingEmail = true` (já garantido pelo helper
      `queueMarketingEmail`)
- [ ] Link de unsubscribe em todo email (já tá no footer base)
- [ ] Log de envio mantido por 2 anos pra eventual auditoria ANPD
- [ ] Quando user revoga consent, futuros emails param (mas log do passado
      fica)

---

## Modelo de dados

```prisma
model MarketingCampaign {
  id            String    @id @default(uuid())
  subject       String
  title         String
  body          String    @db.Text  // markdown
  ctaText       String?
  ctaUrl        String?
  status        CampaignStatus @default(DRAFT)
  audienceFilter Json?    // futuro: filtros estruturados
  estimatedReach Int?
  createdById   String   // User.id do admin
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  sentAt        DateTime?

  createdBy     User      @relation(fields: [createdById], references: [id])
  deliveries    MarketingCampaignDelivery[]
}

enum CampaignStatus {
  DRAFT
  SENDING
  SENT
  FAILED
}

model MarketingCampaignDelivery {
  id          String   @id @default(uuid())
  campaignId  String
  userId      String
  status      DeliveryStatus @default(QUEUED)
  queuedAt    DateTime @default(now())
  sentAt      DateTime?
  openedAt    DateTime?
  clickedAt   DateTime?
  failureReason String?
  resendId    String?  // pra cruzar com webhooks Resend

  campaign    MarketingCampaign @relation(fields: [campaignId], references: [id])
  user        User              @relation(fields: [userId], references: [id])

  @@unique([campaignId, userId])
  @@index([userId])
}

enum DeliveryStatus {
  QUEUED
  SENT
  DELIVERED
  OPENED
  CLICKED
  BOUNCED
  FAILED
}
```

---

## API surface

Tudo sob `/admin/marketing-campaigns` com preHandler `requireRole('tpc-staff')`.

- `POST /admin/marketing-campaigns` — cria DRAFT
- `GET  /admin/marketing-campaigns` — lista (paginado)
- `GET  /admin/marketing-campaigns/:id` — detalhe + stats
- `PATCH /admin/marketing-campaigns/:id` — edita DRAFT (bloqueia se já SENT)
- `DELETE /admin/marketing-campaigns/:id` — apaga DRAFT (soft delete)
- `GET  /admin/marketing-campaigns/:id/audience-count` — estimativa de
  recipientes baseada nos filtros atuais
- `POST /admin/marketing-campaigns/:id/test-send` — envia preview pro admin
- `POST /admin/marketing-campaigns/:id/send` — fan-out real
- `GET  /admin/marketing-campaigns/:id/deliveries?status=...` — log

Webhook do Resend: `POST /webhooks/resend` (HMAC validado) atualiza
`MarketingCampaignDelivery.status` baseado em `event.type`
(`email.delivered`, `email.opened`, etc.)

---

## Frontend

Rota: `/admin/marketing` dentro de `apps/web/app/(admin)/`.

Telas:
- **Lista**: tabela de campanhas com status, sent count, taxa abertura
- **Compose**: form com subject/title/body (markdown), preview ao vivo,
  botão "Salvar rascunho" + "Enviar test pra mim" + "Disparar campanha"
- **Stats**: gráfico simples + tabela de deliveries

Decisão de editor:
- MVP: textarea + markdown render simples (react-markdown)
- V2 (se TPC pedir): rich editor tipo Tiptap

---

## Template novo

`apps/api/src/emails/templates/Custom.tsx` — aceita props `{ title, body,
ctaText?, ctaUrl?, customerName, siteUrl, preferencesUrl }`. Renderiza
markdown no corpo (sanitizado). Reusa `EmailLayout`, `EmailButton`.

---

## Fases sugeridas

**Fase 1 (MVP funcional, ~2-3 dias):**
- Schema (campaign + delivery)
- API: criar, listar, enviar (sem filtros, manda pra todos opt-in)
- Frontend: form simples + lista + botão enviar
- Template Custom com markdown
- Test send pro admin

**Fase 2 (analytics + UX):**
- Webhooks Resend (open, click, bounce)
- Stats dashboard
- Preview ao vivo durante composição

**Fase 3 (segmentação):**
- Filtros de audiência (saldo, atividade, idade da conta)
- A/B testing
- Agendamento (`sendAt` futuro)

---

## Decisões pendentes

- [ ] Plano do Resend (free = 100/dia, paid = milhares). Limita audiência
      inicial até decisão.
- [ ] Quem tem permissão de enviar? Toda staff ou só admin específico?
- [ ] Idioma do editor: markdown puro ou WYSIWYG?
- [ ] Permitir upload de imagem inline? (R2 + signed URL ou inline base64)

---

## Não escopo

- Templates pré-prontos no editor (Fase 4)
- Personalização por user (variáveis tipo `{{nome}}`) — Fase 2
- Listas separadas tipo Mailchimp — não justifica MVP
- SMS / WhatsApp campaign — sistema atualmente só email, WhatsApp Business
  pode entrar depois
