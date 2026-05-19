# Feature: File Service (remap por arquivo)

> Status: pronta pra implementar
> Versão: 1.0
> Atualizado: 2026-05-19
> Telas relacionadas: 13 (Catálogo Remap), 14a/b (Upload), 15a/b/c (Chat), 08e/f (Detalhe Remap)
> Wireframe: `tpc-painel-v11.zip`

---

## Contexto

Segunda linha de produto da TPC, paralela ao serviço presencial. Cliente envia arquivo da ECU (`.bin`, `.ori`, `.frf`…), TPC analisa e mapeia remotamente, devolve arquivo modificado pelo chat. Cliente grava na ECU com hardware próprio (KESS V2/V3, MPPS, FLEX, autotuner, OBDLink).

Mesma carteira de pontos do app presencial. Cliente pode ter saldo único e gastar em ambos os canais.

**Por que esse canal existe**:
- TPC já opera file service via WhatsApp informalmente
- Mercado escala geograficamente (Brasil inteiro vs só Panambi)
- Margens menores por unidade mas volume maior potencial
- Cliente típico: mecânicos, oficinas terceiras, tuners com hardware próprio

---

## Requisitos funcionais

### Catálogo
- [ ] Catálogo presencial e file service compartilham mesma tela, separados por tabs no topo
- [ ] Tab "Por arquivo" mostra 9 serviços padrão + 1 card de "Pedido personalizado" no topo
- [ ] Sem car selector (cliente envia arquivo, não importa qual carro físico)
- [ ] Card intro explicando o fluxo ("Envia teu arquivo. TPC mexe. Recebe de volta.")
- [ ] Toggles "Cabe no saldo / Compatível" ocultos (não aplicam)
- [ ] Filtros por categoria: Performance / Estética / Diagnóstico / Configuração

### Detalhe do serviço
- [ ] Mesma tela do presencial mas adaptada
- [ ] Em vez de "Pra qual carro?", mostra "ECUS SUPORTADAS" com chips das ECUs (Bosch MED17, Continental SIMOS, etc.)
- [ ] Procedimento técnico de 5 passos específicos do file service
- [ ] Requisitos mudam: hardware pra ler ECU, conhecimento técnico
- [ ] Stats e dyno chart mostram "ESTIMATIVA" (carro genérico, não há ACTIVE_CAR)
- [ ] Pedido custom não tem dyno chart, mostra card amarelo explicando orçamento

### Upload + solicitação
- [ ] Tela de upload com drop zone de arquivo (.bin, .ori, .frf, .kess, .fls · máx 16MB)
- [ ] Form técnico: ECU (livre), Hardware (chip select), Modo (OBD/Bench/Boot), Chassi, KM, Observações
- [ ] Cálculo SHA256 do arquivo no upload (integridade + dedup)
- [ ] Upload pra Cloudflare R2 com path `users/{userId}/orders/{orderId}/original.bin`
- [ ] CTA dinâmico: "Solicitar serviço · reservar X pts" (padrão) ou "Enviar pra análise" (custom)
- [ ] Pra serviço padrão: pontos vão pra `reserved` imediatamente
- [ ] Pra custom: NÃO debita nada agora, só salva pedido em estado `AWAITING_QUOTE`

### Chat real-time
- [ ] Socket.IO room por `remapOrderId`
- [ ] Mensagens com 3 tipos: customer / tpc-staff / system
- [ ] Anexos com card visual (nome + tamanho + botão baixar)
- [ ] Arquivos modificados (kind=MODIFIED) destacados visualmente em verde
- [ ] Status bar no topo com badge + protocol + pontos reservados
- [ ] Read receipts (TPC viu, cliente viu) - opcional MVP
- [ ] Typing indicator - opcional MVP
- [ ] Fallback long-polling se WebSocket falhar
- [ ] Reconnect automático em desconexão

### Fluxos de status

**Fluxo padrão (preço fixo)**:
```
ANALYZING → MAPPING → AWAITING_REVIEW → APPROVED
                           ↓
                    NEEDS_REVISION → MAPPING (volta)
```

**Fluxo custom (orçamento prévio)**:
```
AWAITING_QUOTE → QUOTE_SENT → [cliente aceita] → ANALYZING → ... (fluxo padrão)
                            ↘ [cliente recusa] → CANCELLED
```

### Aprovação e débito
- [ ] CTA sticky "Aprovar pedido · debitar X pts" quando arquivo MODIFIED chega
- [ ] Aprovação move pontos de `reserved` → `Transaction(DEBIT)` (débito final)
- [ ] Status vai pra `APPROVED`
- [ ] Cliente pode reportar problema (cria mensagem com flag `needs_revision`), TPC volta pra `MAPPING`
- [ ] TPC pode entregar até 3 revisões sem custo extra
- [ ] 4ª revisão = novo pedido com custo extra

### Cancelamento
- [ ] Em `AWAITING_QUOTE`: cliente pode cancelar a qualquer momento, sem custo (nada foi reservado)
- [ ] Em `ANALYZING`: cliente cancela, pontos voltam de `reserved` pra `available`
- [ ] Em `MAPPING`: cliente cancela, mas TPC pode cobrar tempo gasto (decisão manual)
- [ ] Em `AWAITING_REVIEW` ou depois: cliente não pode cancelar, só reportar problema

### Histórico de arquivos
- [ ] Histórico unifica presencial + file service + transações de pontos
- [ ] Pedidos com status `APPROVED` mostram card extra com botão "BAIXAR" do arquivo modificado
- [ ] Download gera signed URL do R2 com validade de 1h
- [ ] Pedidos em andamento (MAPPING, AWAITING_REVIEW) mostram link "ABRIR CHAT"
- [ ] Pedidos `AWAITING_QUOTE` e `QUOTE_SENT` aparecem com status amarelo pulsando

### Notificações
- [ ] WhatsApp pro cliente em cada mudança de status (configurável)
- [ ] Push no app em tempo real (PWA)
- [ ] Email com link do pedido em mudanças críticas (entrega, aprovação)
- [ ] TPC recebe notificação interna (Slack/Discord webhook) quando pedido novo entra
- [ ] Alerta de SLA: pedido sem resposta da TPC há 4h → escala pra alerta operacional

---

## Requisitos não-funcionais

- Mobile-first (390px wireframe)
- Upload com progress bar (cliente vê % do arquivo subindo)
- Chat latência <500ms em conexão razoável
- Socket.IO suporta ao menos 100 chats simultâneos
- Arquivo `.bin` típico tem 2-8MB, max 16MB
- Storage R2 ilimitado pra arquivos modificados (não expira)
- Webhook MP idempotente
- SHA256 valida integridade antes de processar
- Signed URLs sempre temporárias (1h validade)

---

## Decisões de design

### Por que pedido custom NÃO debita pontos agora
O fluxo principal (preço fixo) deve ser o caminho feliz. Cliente vê o serviço, vê o preço, paga (reserva), envia arquivo, recebe.

Mas pedido custom é diferente: cliente não sabe o preço antes da TPC olhar. Se cobrasse adiantado, cliente teria que comprar pontos sem saber se vale a pena. Atrito alto, reduz conversão.

Solução: orçamento prévio. Cliente envia, TPC analisa em 24h, manda preço. Cliente confirma e aí reserva pontos. Mais etapas mas reduz atrito psicológico.

### Por que arquivos modificados ficam pra sempre
Storage R2 custa USD 0.015/GB/mês. Arquivo `.bin` médio tem 5MB. 10.000 clientes × 5 arquivos = 50.000 arquivos × 5MB = 250GB = USD 3.75/mês.

Custo desprezível. Benefício alto:
- Cliente confia mais ("compra uma vez, tem pra sempre")
- Reduz reclamação "perdi o arquivo"
- Diferencial vs concorrência (algumas TPCs cobram pra reenviar)

### Por que SHA256
- Detecta duplicatas (cliente reenvia mesmo arquivo)
- Integridade (arquivo corrompido durante upload)
- Anti-pirataria primária (mesmo arquivo modificado vazando pra múltiplos clientes seria detectável)
- Audit log (TPC pode provar que entregou exatamente arquivo X em data Y)

### Por que NÃO implementar anti-pirataria no MVP
Cliente pode revender arquivo modificado pra amigos. Mercado de tuning brasileiro convive com isso. Investir em proteção (marca d'água, chassi lock) custa tempo e dinheiro sem ROI claro.

MVP aceita perda. Se vira problema (TPC vê arquivos vazando), implementa V2 com:
- Vinculação ao chassi informado no upload
- Marca d'água digital com hash do userId
- Limite de downloads
- Termos de uso explícitos

---

## Modelo de dados

Entidades novas em `packages/db/prisma/schema.prisma`:

```prisma
model RemapService {
  id          String   @id @default(uuid())
  slug        String   @unique  // 'r-s1t', 'r-pop', 'r-custom'
  name        String
  category    String   // 'Performance' | 'Estética' | 'Diagnóstico' | 'Configuração' | 'Custom'
  description String
  pts         Int      // 0 pra custom
  priceAvulso Int      // R$ * 100, 0 pra custom
  timeEstimate String  // '~ 4h'
  warranty    String
  icon        String
  isCustom    Boolean  @default(false)
  supports    String[] // ECUs suportadas: ['Bosch MED17.x', 'Continental SIMOS']
  active      Boolean  @default(true)
  sortOrder   Int      @default(0)
}

model RemapOrder {
  id              String   @id @default(uuid())
  protocol        String   @unique  // 'TPC-2026-04127'
  userId          String
  serviceId       String?  // null se for pedido custom
  carId           String?  // opcional, cliente pode informar
  status          RemapStatus
  isCustomQuote   Boolean  @default(false)

  // Reserva e débito
  pointsReserved  Int      @default(0)
  pointsDebited   Int?

  // Dados técnicos do upload
  ecuModel        String?
  hardwareUsed    String?
  readMode        String?  // 'OBD' | 'Bench' | 'Boot'
  vehicleVin      String?
  mileage         Int?
  description     String?

  // Timestamps
  createdAt       DateTime @default(now())
  quotedAt        DateTime?
  mappingStartedAt DateTime?
  deliveredAt     DateTime?
  approvedAt      DateTime?
  cancelledAt     DateTime?

  // Quote (pra customs)
  quotePoints     Int?     // TPC propõe X pontos
  quoteAccepted   Boolean?

  user      User           @relation(fields: [userId], references: [id])
  service   RemapService?  @relation(fields: [serviceId], references: [id])
  car       Car?           @relation(fields: [carId], references: [id])
  files     RemapFile[]
  messages  Message[]

  @@index([userId, createdAt(sort: Desc)])
  @@index([status])
}

enum RemapStatus {
  AWAITING_QUOTE
  QUOTE_SENT
  ANALYZING
  MAPPING
  AWAITING_REVIEW
  APPROVED
  NEEDS_REVISION
  CANCELLED
}

model RemapFile {
  id          String   @id @default(uuid())
  orderId     String
  uploadedBy  String   // userId (cliente ou tpc-staff)
  fileName    String
  fileSize    Int
  mimeType    String
  r2Key       String   // 'users/{userId}/orders/{orderId}/{kind}.bin'
  sha256      String   // pra dedup + integridade
  kind        FileKind
  createdAt   DateTime @default(now())

  order RemapOrder @relation(fields: [orderId], references: [id])
  messages Message[]

  @@index([orderId, kind])
  @@index([sha256])  // dedup
}

enum FileKind {
  ORIGINAL      // cliente enviou
  MODIFIED      // TPC entregou
  ATTACHMENT    // print, foto, doc complementar
  REPORT        // PDF de laudo
}

model Message {
  id          String   @id @default(uuid())
  orderId     String
  senderId    String
  senderType  String   // 'customer' | 'tpc-staff' | 'system'
  body        String   @db.Text
  fileId      String?  // anexo opcional
  readAt      DateTime?
  createdAt   DateTime @default(now())

  order RemapOrder  @relation(fields: [orderId], references: [id])
  file  RemapFile?  @relation(fields: [fileId], references: [id])

  @@index([orderId, createdAt])
}
```

---

## Endpoints

### `POST /remap-orders`
Cria novo pedido de file service. Body validado com Zod.

Body:
```ts
{
  serviceId: string,        // null pra custom
  isCustomQuote: boolean,
  technicalData: {
    ecuModel: string,
    hardwareUsed: string,
    readMode: 'OBD' | 'Bench' | 'Boot',
    vehicleVin: string,
    mileage: number,
    description: string,
  },
}
```

Cria `RemapOrder` em status `AWAITING_QUOTE` (custom) ou `ANALYZING` (padrão).
Se padrão, reserva pontos imediatamente.

### `POST /remap-orders/:id/files`
Upload de arquivo (multipart). Roda em background:
1. Calcula SHA256
2. Sobe pra R2 em path estruturado
3. Cria `RemapFile` no DB
4. Dispara mensagem de sistema no chat
5. Notifica TPC (interno)

Response: `{ fileId, url: '/files/:fileId/download' }`

### `GET /files/:fileId/download`
Retorna signed URL do R2 com validade 1h. Valida que user tem acesso ao arquivo (ownership).

### `POST /remap-orders/:id/quote`
Admin only. TPC manda orçamento pra pedido custom.

Body:
```ts
{
  pointsProposed: number,
  estimatedTime: string,
  description: string,
}
```

### `POST /remap-orders/:id/accept-quote`
Cliente aceita orçamento (custom). Reserva pontos, muda status pra `ANALYZING`.

### `POST /remap-orders/:id/approve`
Cliente aprova arquivo modificado. Move pontos de `reserved` pra `debited`.

### `POST /remap-orders/:id/messages`
Cria nova mensagem no chat. Body: `{ body: string, fileId?: string }`.

### `POST /remap-orders/:id/cancel`
Cancela pedido. Lógica varia por status (ver decisões).

### WebSocket `/chat`
- `connect`: autentica via JWT, junta sala por `remapOrderId`
- Eventos:
  - `message:new` (servidor → cliente): nova mensagem
  - `file:uploaded` (servidor → cliente): novo arquivo no chat
  - `status:changed` (servidor → cliente): mudança de status do pedido
  - `typing` (cliente → cliente, opcional): typing indicator

---

## Critérios de aceitação

### Catálogo Remap
- [ ] Tab "Por arquivo" mostra 9 serviços + custom no topo
- [ ] Cards sem badge de compatibilidade (sem ACTIVE_CAR)
- [ ] Custom no topo destacado em amarelo
- [ ] Toque em serviço leva pra `servico/[id]/page.tsx?canal=arquivo`

### Detalhe adaptado
- [ ] Hero performance/aesthetic/config conforme categoria
- [ ] Card "ECUS SUPORTADAS" no lugar de "PRA QUAL CARRO?"
- [ ] Procedimento técnico em 5 passos (não 4 do presencial)
- [ ] Requisitos: hardware, conhecimento técnico, backup
- [ ] CTA "Solicitar por arquivo · X pts" ou "Enviar pra análise" (custom)
- [ ] Custom oculta dyno chart e mostra aviso amarelo

### Upload
- [ ] Drop zone aceita .bin/.ori/.frf/.kess/.fls
- [ ] Validação de tamanho 16MB max
- [ ] Form técnico com 6 campos
- [ ] SHA256 calculado client-side antes do upload
- [ ] Progress bar durante upload
- [ ] Erro de upload retentado automaticamente
- [ ] Padrão: reserva pontos ao criar pedido
- [ ] Custom: NÃO reserva, status `AWAITING_QUOTE`

### Chat
- [ ] Mensagens persistem em DB e aparecem em real-time
- [ ] Bubbles distintas: cliente (vermelho à direita), TPC (cinza à esquerda), sistema (centralizado)
- [ ] Anexos baixáveis com clique
- [ ] Arquivo MODIFIED destacado em verde
- [ ] Status bar atualiza em real-time quando muda
- [ ] CTA sticky "Aprovar pedido" só aparece quando AWAITING_REVIEW
- [ ] Pedido custom mostra "Recusar / Aceitar" quando QUOTE_SENT

### Histórico
- [ ] Pedidos remap aparecem misturados com presencial
- [ ] Pedidos `APPROVED` têm card de download embutido
- [ ] Pedidos em andamento têm link "ABRIR CHAT"
- [ ] Footer informa que arquivos são pra sempre

---

## Out of scope (v1)

- Anti-pirataria (marca d'água, chassi lock, limite de downloads)
- Versionamento do arquivo modificado (cliente recebe v1, depois v2 após revisão)
- Streaming de upload (cliente envia em pedaços) — multipart simples no MVP
- Compartilhar arquivo modificado com outro cliente
- TPC adicionar tags/categorias no arquivo pra busca
- API pública pra mecânicos integrarem
- Dashboard métricas TPC (quantos pedidos/dia, tempo médio)

---

## Referências

- Wireframe: `tpc-painel-v11.zip`, artboards `13`, `14a/b`, `15a/b/c`, `08e/f`
- Constituição: `CLAUDE.md`
- Rules: `.claude/rules/api.md` (websocket + upload + signed URLs)
- Cloudflare R2: https://developers.cloudflare.com/r2/
- Socket.IO + Fastify: https://socket.io/docs/v4/server-installation/
