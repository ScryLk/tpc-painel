# Feature: Comprar Pontos

> Status: pronta pra implementar
> Versão: 1.0
> Atualizado: 2026-05-19
> Telas relacionadas: 05 (Comprar Pontos), 06a/b/c/d (Checkout)
> Wireframe: `tpc-painel-v7.zip` (artboards `comprar` e `checkout-*`)

---

## Contexto

Cliente quer recarregar pontos pra usar em serviços. Esta feature é o
**funil de aquisição financeira** do produto: todo dinheiro entra por aqui.

Modelo: voucher digital pré-pago com bônus por volume. Cliente compra
1 dos 4 pacotes fixos (Iniciante, Stage 1, Pro, VIP), paga via Pix ou
Cartão (1x ou 3x sem juros), pontos creditados na conta.

Decisão de design: NÃO existe pagamento avulso de serviço no app. App é
fluxo de pontos. Quem quer pagar avulso, fala no WhatsApp da TPC.

---

## Requisitos funcionais

- [ ] Exibir 4 pacotes em carrossel horizontal (swipe) + tabela comparativa
- [ ] Destacar pacote "MAIS ESCOLHIDO" (Stage 1, R$ 450) com borda vermelha
  e badge no topo
- [ ] Pacote pré-selecionado ao entrar é o destacado
- [ ] Bottom CTA dinâmico mostra preço do pacote selecionado em tempo real
- [ ] Trust signals: cadeado + bandeiras (Pix, Visa, Master, Elo)
- [ ] Link "Como funcionam os pontos?" abre modal com FAQ
- [ ] Tocar "PAGAR R$ X" leva pra tela de Checkout passando `packageId`
- [ ] Checkout: tabs Pix / Cartão (Pix default)
- [ ] Checkout Pix: gera código pix-copia-cola + QR alternativo + timer 30min
- [ ] Checkout Cartão: form com detecção visual de bandeira
- [ ] Cartão: parcelamento 1x/2x/3x sem juros (TPC absorve taxa) se preço ≥ R$ 400
- [ ] Cartão salvo: 1-click checkout pra recompras (tokenização Mercado Pago)
- [ ] CPF/CNPJ opcional pra nota fiscal (campo expansível)
- [ ] Pós-pagamento confirmado: cria `Purchase`, credita pontos em `PointsBalance.available`,
  registra `Transaction` tipo `CREDIT`
- [ ] Tela Sucesso: gauge com `+N pontos` + saldo novo + recibo mini +
  botão "Solicitar serviço agora" / "Voltar" / "Comprovante"
- [ ] WhatsApp notification automática pós-confirmação

## Requisitos não-funcionais

- Mobile-first (390px wireframe)
- Performance: First Contentful Paint < 1.5s em 3G
- Timer Pix de 30min: cliente vê count-down em tempo real (atualiza a cada 1s)
- Webhook Mercado Pago deve responder em <2s mesmo se crédito é async (job)
- Acessibilidade WCAG AA

---

## Decisões de design

Documentadas com "por quê" pra não rediscutir depois.

### Layout: cards horizontais + tabela
Cliente compara 4 pacotes lado a lado (swipe). Tabela embaixo dá visão
"tabular" pra quem prefere. Não usar só lista vertical: dilui hierarquia.
Não usar só tabela: perde drama visual.

### Pacote destacado: Stage 1, não Iniciante nem VIP
- Iniciante (R$100): muito barato, comunica "produto sem valor"
- VIP (R$1.600): muito caro, assusta novo
- Stage 1 (R$450): sweet spot. Cobre 1 Stage 1 completo, +10% bônus,
  valor médio. Cria narrativa "é o que faz sentido pra começar sério"

### Preço dual: avulso riscado + pontos
Comunica desconto embutido. Pontos viram "moeda com desconto", não
conversão direta R$1 = 1 pt. Exemplo: Stage 1 Turbo "R$ 700 ̶ → 500 pts (-29%)".

### Pix-copia-cola em destaque, QR menor
Cliente paga do PRÓPRIO celular. Não vai escanear QR de si mesmo.
Copia-cola → cola no app do banco → confirma. QR fica como alternativa
secundária pra quem tem 2 dispositivos.

### Cartão até 3x sem juros (TPC absorve taxa)
Aumenta conversão em pacotes altos (VIP R$1.600 vira 3x R$533).
Custo: ~3-4% da venda pra Mercado Pago. ROI positivo.
[TPC-DECISION]: TPC precisa confirmar que topa absorver.

### CPF/CNPJ opcional expansível
Cliente pessoa física raramente precisa. PJ que abate IR precisa.
Default fechado pra não poluir. Quem precisa, abre.

### Sem pagamento avulso pelo app
App é fluxo de pontos. Cliente que quer pagar avulso liga na TPC.
Manter foco.

---

## Modelo de dados

Entidades novas/afetadas em `packages/db/prisma/schema.prisma`:

```prisma
model Package {
  id          String   @id @default(uuid())
  tier        String   @unique  // 'iniciante' | 'stage1' | 'pro' | 'vip'
  name        String
  points      Int
  priceCents  Int      // R$ * 100 (evita float em moeda)
  bonusPoints Int      @default(0)
  bonusPct    Int      @default(0)
  popular     Boolean  @default(false)
  active      Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Purchase {
  id              String   @id @default(uuid())
  userId          String
  packageId       String
  mpTransactionId String   @unique  // dedup webhook MP
  mpPaymentMethod String   // 'pix' | 'credit_card'
  amountCents     Int
  installments    Int      @default(1)
  pointsCredited  Int
  status          String   // 'pending' | 'approved' | 'rejected' | 'refunded'
  cpfCnpj         String?  // opcional pra NF
  paidAt          DateTime?
  createdAt       DateTime @default(now())

  user    User    @relation(fields: [userId], references: [id])
  package Package @relation(fields: [packageId], references: [id])
  transactions Transaction[]

  @@index([userId, createdAt(sort: Desc)])
  @@index([status])
}

model SavedCard {
  id           String   @id @default(uuid())
  userId       String
  mpCardToken  String
  brand        String   // 'visa' | 'master' | 'elo' | 'amex'
  lastFour     String
  holderName   String
  expMonth     Int
  expYear      Int
  isDefault    Boolean  @default(false)
  createdAt    DateTime @default(now())
  deletedAt    DateTime?

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
}
```

`Transaction` (já existente) recebe linha tipo `CREDIT` ao confirmar:

```
{ type: 'CREDIT', amount: pointsCredited, relatedEntityType: 'Purchase', ... }
```

---

## Endpoints

### `GET /pacotes`
Lista pacotes ativos. Ordenados por `sortOrder`.

Response:
```json
[{ "id": "...", "tier": "stage1", "name": "Stage 1", "points": 500, ... }]
```

### `POST /checkout`
Cria preferência de pagamento no Mercado Pago.

Body (validado com Zod):
```ts
{
  packageId: string,
  method: 'pix' | 'card',
  installments?: 1 | 2 | 3,
  cardToken?: string,  // pra cartão salvo
  cpfCnpj?: string,
}
```

Response:
```json
{
  "preferenceId": "MP-...",
  "qrCode": "0002012658...",  // pix
  "qrCodeBase64": "...",
  "checkoutUrl": "https://...",  // pra cartão
  "expiresAt": "2026-05-19T13:30:00Z"
}
```

### `POST /webhooks/mercadopago`
Recebe notificação de pagamento. Valida HMAC. Idempotente.

Quando `status === 'approved'`:
1. Verifica se `mpTransactionId` já foi processado (idempotência)
2. Em transação:
   - Atualiza `Purchase.status = 'approved'`
   - Incrementa `PointsBalance.available += pointsCredited`
   - Cria `Transaction` tipo `CREDIT`
3. Dispara job `notify-whatsapp` + `notify-email` (com NF se CPF foi preenchido)
4. Retorna 200

### `GET /me/saldo`
Retorna saldo do usuário atual.

Response:
```json
{ "available": 1250, "reserved": 0, "total": 1250 }
```

### `GET /me/cartoes-salvos`
Lista cartões salvos do user (apenas brand + last4 + holder).

### `DELETE /me/cartoes-salvos/:id`
Soft delete cartão salvo.

---

## Critérios de aceitação

Cada um vira teste (unit + integration).

### Comprar Pontos (frontend)

- [ ] Cliente vê os 4 pacotes em ordem (Iniciante → VIP)
- [ ] Stage 1 vem destacado com border vermelha + badge "MAIS ESCOLHIDO"
- [ ] CTA inicial mostra "PAGAR R$ 450,00" (preço do Stage 1)
- [ ] Trocar pacote (swipe ou tap) atualiza CTA com novo valor
- [ ] Toque em "PAGAR R$ X" leva pra `/pontos/checkout?packageId=...`

### Checkout Pix

- [ ] Tela mostra código pix-copia-cola truncado + botão "Copiar"
- [ ] Botão "Copiar" copia código completo + mostra feedback "Copiado"
- [ ] Timer mostra 30:00 e decrementa a cada segundo
- [ ] Após 30:00 sem pagamento, timer mostra "Expirou" + botão "Gerar novo código"
- [ ] QR code aparece menor, abaixo do copia-cola

### Checkout Cartão

- [ ] Form: número, validade, CVV, nome
- [ ] Detecção de bandeira: 4xxx = Visa, 5xxx = Master, 6xxx = Elo
- [ ] Parcelamento aparece SÓ se `package.priceCents >= 40000`
- [ ] Cartão salvo: mostra "Final XXXX · trocar?" em vez de form completo

### Webhook MP

- [ ] Recebe payload, valida HMAC, retorna 200 em <2s
- [ ] `mpTransactionId` duplicado NÃO credita pontos 2 vezes
- [ ] Status `approved`: cria Transaction, incrementa `available`
- [ ] Status `rejected`: marca Purchase como rejected, NÃO credita
- [ ] Falha no DB: NÃO retorna 200 (MP reenvia webhook)

### Sucesso

- [ ] Cliente vê gauge "+550 pontos" com glow
- [ ] Saldo novo formatado: "1.800 pontos"
- [ ] Mini-recibo: pacote, valor, método
- [ ] Botões: "Solicitar serviço" / "Painel" / "Comprovante"
- [ ] WhatsApp message enviada em até 5s pós-confirmação

---

## Out of scope (v1)

Coisas que NÃO entram nessa versão:

- Valor personalizado de recarga (slider). Só pacotes fixos.
- Pacote presenteado (gift card). Só self-purchase.
- Cashback de pontos (devolver % de pontos como bônus em compras grandes).
- Aplicar cupom de desconto. Não há sistema de cupom ainda.
- Pagamento com saldo de outra carteira (Picpay, Mercado Pago saldo). Só Pix e cartão.
- Recorrência (assinatura mensal de pacote). Compra avulsa só.

---

## Referências

- Wireframe: `tpc-painel-v7.zip`, artboards `05 · Comprar pontos`,
  `06a/b/c/d · Checkout`
- Constituição: `CLAUDE.md`
- Rules relevantes: `.claude/rules/api.md`, `frontend.md`, `db.md`
- Mercado Pago docs: https://www.mercadopago.com.br/developers/pt
