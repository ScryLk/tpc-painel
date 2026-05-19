# Feature: Agendar (serviço presencial)

> Status: pronta pra implementar
> Versão: 1.0
> Atualizado: 2026-05-19
> Telas relacionadas: 09a (form padrão), 09b (form multi-dia · Stage 3), 09c (sucesso aguardando)
> Wireframe: `tpc-painel-v11.zip`

---

## Contexto

Cliente seleciona serviço presencial (Stage 1, Pop & Bang, etc.) no Catálogo,
toca em "Solicitar serviço · X pts" no Detalhe, cai aqui. Escolhe data e
período de chegada, deixa observações, confirma. Pontos vão pra `reserved`
até TPC confirmar via WhatsApp em até 2h.

Modelo: cliente leva o carro na oficina TPC de Panambi. TPC executa. Cliente busca.

---

## Requisitos funcionais

### Form de agendamento
- [ ] Resumo do serviço no topo (ícone, nome, carro do cliente, pontos a debitar)
- [ ] Card de local: "TPC Performance · Panambi" com endereço + botão "VER MAPA"
- [ ] Calendar mensal (May 2026 como mês inicial) com navegação ‹ ›
- [ ] Estados visuais do calendar:
  - Dia selecionado: sólido vermelho
  - Hoje (não selecionado): bg vermelho sutil + border + bolinha
  - Indisponível (ocupado): cinza com line-through
  - Fechado (fim de semana, feriado): cinza com listras diagonais
  - Passado: cinza fade
- [ ] Multi-dia (Stage 3): seleciona dia 1, sistema bloqueia dia+1 automaticamente
  - Visual: dia 1 vermelho sólido, dia 2 com border dashed vermelha
  - Banner "Carro fica na TPC do dia X ao Y"
- [ ] Slots de chegada: Manhã (08:00-12:00) / Tarde (13:00-18:00) como radio
- [ ] Nota: "TPC confirma horário exato no WhatsApp"
- [ ] Textarea de observações (opcional, 500 chars máx)
- [ ] Box informativo: "Pontos ficam reservados até TPC confirmar"

### Política de cancelamento
- [ ] 3 janelas:
  - **>24h antes**: cancelamento livre, pontos voltam 100%
  - **24h-2h antes**: cancela com multa, perde 20% dos pontos
  - **<2h antes**: só aprovação manual TPC
- [ ] Visível no form (3 rows com bolinhas coloridas) e no Success
- [ ] Datas/horários calculados dinamicamente a partir da data selecionada

### CTA
- [ ] Botão "Confirmar · reservar X pts · DD/MM"
- [ ] Sub-texto: "PONTOS FICAM RESERVADOS ATÉ TPC CONFIRMAR"
- [ ] Ao confirmar:
  - Move pontos de `available` pra `reserved`
  - Cria `Solicitacao` em status `PENDENTE`
  - Dispara WhatsApp pra TPC
  - Navega pra tela Success

### Success
- [ ] Ícone de ampulheta (amarelo) — NÃO checkmark verde
- [ ] Badge "AGUARDANDO CONFIRMAÇÃO" pulsando amarelo
- [ ] Headline "Solicitação enviada"
- [ ] Texto: "TPC vai chamar no WhatsApp em até 2 horas"
- [ ] Card de detalhes:
  - Serviço, Data, Chegada (slot), Local, Pontos reservados
  - Footer com Protocolo TPC-2026-XXXXX
- [ ] Card verde: "Cancelamento grátis até DD/MM HH:MM · pontos voltam 100%"
- [ ] Botões: "Falar no WhatsApp agora" / "Adicionar ao calendário" / "Painel"

### Estado pós-confirmação
- [ ] Quando TPC confirma (admin tool ou WhatsApp), status vira `CONFIRMADA`
- [ ] Push pro cliente: "Teu agendamento foi confirmado pra DD/MM"
- [ ] Status no Histórico vira verde
- [ ] Dashboard mostra card "Próximo serviço" com countdown

### Estado pós-execução
- [ ] Quando serviço termina (TPC marca como concluído), status vira `CONCLUIDA`
- [ ] Pontos saem de `reserved` → `Transaction(DEBIT)` (débito final)
- [ ] Cliente recebe NF por email (se tem CPF cadastrado)
- [ ] Garantia inicia (12 meses padrão pra Stage 1)

### Reserva expira
- [ ] Job `expire-reservation.ts` roda a cada hora
- [ ] Solicitações em `PENDENTE` há mais de 24h SEM confirmação TPC:
  - Status vira `CANCELADA`
  - Pontos voltam de `reserved` → `available`
  - Cliente recebe email "Reserva expirou, pode tentar de novo"

---

## Requisitos não-funcionais

- Calendar performante (renderiza 31 dias sem lag)
- Slot manhã/tarde mais granular em V2 (slots de 30min)
- Mobile-first, scroll suave
- Datas em fuso `America/Sao_Paulo`
- Calendar não navega pra meses passados
- Calendar permite até 3 meses no futuro

---

## Decisões de design

### Por que slot manhã/tarde, não horário exato
TPC ainda agenda manualmente. Sistema com horários específicos exigiria:
- Backend de capacidade (quantos serviços por slot)
- Bloqueio em tempo real
- Sincronização com agenda interna TPC

MVP: cliente escolhe período, TPC confirma horário no WhatsApp. Em V2,
quando TPC tiver capacidade pra mais clientes, evolui pra slots por hora.

### Por que pontos ficam reservados (não debitados)
TPC pode negar o pedido (data lotada, problema técnico do carro do cliente,
etc.). Se debitasse adiantado, cliente teria que pedir estorno.

Modelo de reserva é padrão da indústria (Airbnb, iFood) e reduz fricção.

### Por que política de cancelamento em 3 janelas
- **>24h**: zero atrito, cliente cancela e tenta de novo
- **24h-2h**: multa simbólica de 20% pra reduzir cancelamento de última hora
- **<2h**: TPC já se preparou, justa cobrança ou negociação

Total grátis até <24h respeita LGPD (cliente tem direito a desistência).
Multa pequena é compatível com prática de mercado (barbeiros, médicos, etc.).

### Por que Success mostra "AGUARDANDO" e não "CONFIRMADO"
Cliente solicitou, TPC não confirmou ainda. Status real é pendente.
Mostrar "Pedido confirmado!" no Success seria mentira.

Cor amarela + ampulheta comunica "está em processamento". Quando TPC confirmar
(via push/WhatsApp), cliente vê status mudar. Honestidade reduz reclamação.

### Por que multi-dia trava o calendar automaticamente
Stage 3 dura 2 dias. Cliente que seleciona um sábado precisa saber que o carro
fica até domingo (mas TPC não trabalha aos domingos → conflito).

Auto-bloqueio: cliente seleciona dia 18 (sexta), sistema reserva dia 18 + 19.
Se 19 for fim de semana/feriado, sistema avisa "Não dá pra começar sexta, fim
de semana atrapalha".

---

## Modelo de dados

`Solicitacao` em `packages/db/prisma/schema.prisma`:

```prisma
model Solicitacao {
  id              String   @id @default(uuid())
  protocol        String   @unique  // 'TPC-2026-04127'
  userId          String
  serviceId       String
  carId           String
  status          SolicitacaoStatus

  // Reserva e débito
  pointsReserved  Int
  pointsDebited   Int?

  // Data e local
  scheduledDate   DateTime  // dia inicial (multi-dia conta scheduledDate + serviceDuration)
  endDate         DateTime? // pra multi-dia
  arrivalSlot     String    // 'manha' | 'tarde'
  observations    String?   @db.Text

  // Timestamps
  createdAt       DateTime @default(now())
  confirmedAt     DateTime?
  startedAt       DateTime?
  completedAt     DateTime?
  cancelledAt     DateTime?

  // Cancelamento
  cancelReason    String?
  refundPct       Int?      // 100, 80, ou 0 conforme janela

  user    User    @relation(fields: [userId], references: [id])
  service Service @relation(fields: [serviceId], references: [id])
  car     Car     @relation(fields: [carId], references: [id])

  @@index([userId, createdAt(sort: Desc)])
  @@index([status])
  @@index([scheduledDate])
}

enum SolicitacaoStatus {
  PENDENTE     // aguardando TPC confirmar
  CONFIRMADA   // TPC confirmou data
  EM_EXEC      // carro tá na oficina, em execução
  CONCLUIDA    // serviço terminou, pontos debitados
  CANCELADA    // cancelada (com ou sem multa)
}
```

---

## Endpoints

### `POST /solicitacoes`
Cria solicitação de serviço presencial. Body validado com Zod.

```ts
{
  serviceId: string,
  carId: string,
  date: string,              // ISO 8601, ex: '2026-05-18'
  arrivalSlot: 'manha' | 'tarde',
  observations?: string,
}
```

Lógica:
1. Validar carro pertence ao user e é compatível com serviço
2. Validar data não é passada nem feriado/fim de semana
3. Validar saldo `available >= service.pts`
4. Em transação:
   - Mover pts de `available` pra `reserved`
   - Criar `Reservation`
   - Criar `Solicitacao` em status `PENDENTE`
   - Criar `Transaction(RESERVE)`
5. Disparar WhatsApp pra TPC (job assíncrono)
6. Retornar Solicitacao com protocol gerado

### `POST /solicitacoes/:id/cancel`
Cancela solicitação. Calcula refund baseado em janela:

```ts
{
  reason?: string,
}
```

Lógica:
1. Buscar Solicitacao
2. Calcular horas até `scheduledDate`
3. Determinar `refundPct`:
   - `>= 24h`: 100% (vol pra available)
   - `2h-24h`: 80% (perde 20% como multa)
   - `< 2h`: 0% (rejeita cancelamento, retorna erro · cliente fala com TPC)
4. Em transação:
   - Mover `refundPct%` de `reserved` pra `available`
   - Restante (multa) move pra `Transaction(DEBIT)` com motivo 'multa cancelamento'
   - Status vira `CANCELADA`
5. Notificar TPC

### `POST /admin/solicitacoes/:id/confirm`
Admin only. TPC confirma agendamento.
- Status: `PENDENTE` → `CONFIRMADA`
- Push pro cliente

### `POST /admin/solicitacoes/:id/complete`
Admin only. TPC marca como concluído (carro saiu da oficina).
- Status: `CONFIRMADA` → `CONCLUIDA`
- Move `reserved` → `Transaction(DEBIT)` (débito final)
- Inicia garantia (se serviço tem garantia)
- Dispara emissão de NF + email pro cliente

### `GET /me/solicitacoes`
Lista solicitações do user (paginada por created_at desc).

### `GET /solicitacoes/:id`
Detalhe da solicitação.

---

## Critérios de aceitação

### Form
- [ ] Calendar renderiza maio 2026 com offset correto (sexta na col 5)
- [ ] Dia 18 selecionado por default no wireframe
- [ ] Dia 19 com border dashed quando Stage 3 (multi-dia)
- [ ] Dias 1, 10 (feriados), 3, 10, 17, 24, 31 (domingos) com listras
- [ ] Dia 13 (hoje) com border + dot
- [ ] Toggle Manhã/Tarde funcional (Manhã default)
- [ ] Textarea com counter 0/500
- [ ] Política de cancelamento em 3 rows coloridos (verde/amarelo/vermelho)
- [ ] CTA mostra "Reservar 500 pts · 18/05"

### Success
- [ ] Ícone ampulheta amarelo com glow
- [ ] Badge "AGUARDANDO CONFIRMAÇÃO" pulsando
- [ ] H1 "Solicitação enviada" (não "Pedido confirmado")
- [ ] Card de detalhes com 5 rows (Serviço/Data/Chegada/Local/Pts reservados)
- [ ] Protocolo TPC-2026-04127 visível
- [ ] Card verde com "Cancelamento grátis até dia 17/05 às 08:30"
- [ ] 3 botões: WhatsApp / Calendário / Painel

### Cancelamento
- [ ] Cliente cancela >24h antes → pontos voltam 100% pra available
- [ ] Cliente cancela 2h-24h antes → 80% volta, 20% vai pra DEBIT como multa
- [ ] Cliente tenta cancelar <2h antes → erro "Fale com a TPC pelo WhatsApp"
- [ ] Status no Histórico atualiza visualmente

### Reserva expira
- [ ] Solicitacao em `PENDENTE` há 25h roda no job → fica `CANCELADA`
- [ ] Pontos voltam pro available
- [ ] Email pro cliente "Reserva expirou"

---

## Out of scope (v1)

- Slots por hora (08:00, 09:00, 10:00…)
- Selecionar oficina (TPC tem 1 só por enquanto)
- Re-agendamento (cancelar e criar novo na hora)
- Pagar multa antecipadamente pra ter mais flexibilidade
- Lista de espera (cliente entra fila se data lotada)
- Lembretes automáticos D-1 e D-0
- Avaliação pós-serviço

---

## Referências

- Wireframe: `tpc-painel-v11.zip`, artboards `09a/b/c`
- Constituição: `CLAUDE.md`
- Rules: `.claude/rules/api.md` (transações, idempotência)
- LGPD: cancelamento >24h = direito de desistência respeitado
