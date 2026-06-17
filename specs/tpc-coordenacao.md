# O que precisamos da TPC pra colocar o app no ar

> Última atualização: 2026-06-17
> Use como pauta de conversa. Cada item: pergunta direta + por que precisa.

---

## 1. Identificação da empresa

Tudo que aparece nos termos de uso, nos recibos, e na conta de pagamento.

- **Razão social** (nome jurídico completo da empresa)
- **CNPJ**
- **Endereço fiscal** (logradouro + número + CEP)
- **Regime tributário** (Simples / Lucro Presumido / Real — quem faz a contabilidade sabe)

---

## 2. Conta pra receber dos clientes (Mercado Pago)

Vamos usar o **Mercado Pago** pra receber pagamento por Pix e cartão de crédito.

### A conta da TPC
- **A TPC já tem conta no Mercado Pago como empresa (PJ, com CNPJ)?**
  - Se sim, pegar os dados com quem gerencia.
  - Se não, precisa abrir antes do app rodar.

### Taxas que o Mercado Pago cobra

São cobradas em cima de cada venda. Valores típicos pra conta PJ com recebimento em **14 dias**:

| Forma de pagamento | Taxa do MP |
|---|---|
| Pix | ~0,99% |
| Cartão de débito | ~1,99% |
| Cartão de crédito à vista | ~4,98% |
| Cartão parcelado em 2x | ~5,49% |
| Cartão parcelado em 3x | ~5,99% |

Se quiser receber mais rápido (em 2 dias ou na hora), o MP cobra um adicional de antecipação. Os valores exatos a TPC consegue confirmar dentro da própria conta do MP.

### Decisão de negócio: 3x sem juros
Os concorrentes oferecem 3x sem juros. Pra dar a mesma coisa, a TPC absorve a taxa (~5,99% no parcelado em 3x — ou seja, em vez de receber R$100, recebe R$94 pra cada R$100 vendido). 

**A TPC topa absorver, ou prefere repassar pro cliente** (3x com juros do MP)?

---

## 3. Endereço da internet (domínio) e email oficial

- **A TPC já tem um domínio próprio**? (Tipo `tpcperformance.com.br`.) Se sim, qual?
- **A TPC já usa email com esse domínio**? (Tipo `contato@tpcperformance.com.br`.) Se sim, ótimo. Se não, precisa criar — o app vai mandar email automático pro cliente em vários momentos (confirmação de pedido, recuperação de senha, recibo).

---

## 4. Catálogo de serviços — preços reais

Hoje todos os preços estão simulados pra teste. Precisamos dos números reais pra começar.

**Para cada serviço presencial** (12 atualmente): Stage 1, Stage 2, Stage 3, Pop & Bang, Burble, Hardcut, Launch Control, Cold Start Delete, DPF Off, EGR Off, AdBlue Off, Diagnóstico:

- Preço em pontos (quanto o cliente "gasta" do saldo)
- Preço avulso de referência (quanto custaria comprando pontos pra fazer 1 vez só — usado pra mostrar a economia ao escolher pacote maior)
- Tempo de execução (1 dia? 2? leva a manhã toda?)
- Em quais motores funciona (lista de motorizações)
- Quanto de ganho em potência/torque (Stage 1 dá +X% por exemplo) — pra material de venda

**Para cada serviço por arquivo** (9 atualmente): Stage 1, Stage 2, Pop & Bang, Hardcut, Launch Control, DPF Off, EGR Off, AdBlue Off, Speed Limit Off + serviço Custom:

- Mesma informação acima
- **Tempo médio de entrega depois que o cliente manda o arquivo** (4h? 24h?)

**O painel admin permite criar serviços novos, editar os existentes, ou inativar a qualquer momento** — então a TPC tem autonomia total pra ajustar o catálogo conforme for entendendo o que vende mais.

---

## 5. Pacotes de pontos

A TPC vende pontos em pacotes. Hoje tem 4 pacotes simulados pra teste: Iniciante, Stage 1, Pro, VIP.

Perguntas:
- Quantos pacotes a TPC quer oferecer? (4 é só o exemplo — pode ter 3, 5, 10.)
- Pra cada pacote: nome, quantos pontos, quanto custa, quanto de bonus dar
- **Os pontos têm validade?** (Hoje não expira. TPC quer expirar em 6/12 meses?)

**O painel admin permite criar pacotes novos, editar valores e bonus, ou excluir os que não interessam mais** — TPC controla totalmente, sem precisar de dev.

---

## 6. Política de garantia e cancelamento

### Garantia
- Quanto tempo de garantia em cada serviço? (Padrão sugerido: 12 meses)
- Varia por tipo de serviço?
- O que cobre exatamente?

### Cancelamento de agendamento presencial
Como o cliente cancela um serviço agendado sem ir até a oficina? Proposta atual:
- **Mais de 24h antes**: sem multa
- **Entre 24h e 2h antes**: 20% de multa
- **Menos de 2h**: precisa aprovação manual da TPC

Confirmar percentuais e janelas.

---

## 7. Arquivos modificados — política

Quando o cliente compra um remap por arquivo, ele recebe o arquivo modificado pelo chat.

- **Esse arquivo fica disponível pra ele baixar pra sempre?** (Sugestão: sim, é simples de manter e o cliente valoriza muito.)
- **Alguma proteção pra evitar pirataria?** Hoje não tem nenhuma. Opções:
  - Aceitar a perda (mais simples)
  - Marca d'água no arquivo (linka o arquivo ao chassi do cliente — quem pirateou aparece)
  - Limite de downloads
- A TPC tem preferência?

---

## 8. Oficina física

- **Endereço completo** da oficina (Panambi/RS — logradouro + número + CEP)
- Tem outras unidades?
- **Horário de atendimento** real (seg-sex 8h-18h? abre sábado? até quando?)
- **Feriados que fecha** (nacionais todos? feriados de Panambi/RS específicos?)
- Como funciona o agendamento hoje? O app vai assumir, ou continua via WhatsApp em paralelo?

---

## 9. WhatsApp

O app pode disparar mensagens automáticas no WhatsApp (pedido confirmado, arquivo pronto, lembrete).

- **A TPC tem um WhatsApp Business?** Qual o número?
- Quer usar pra essas notificações automáticas? (Não é obrigatório no lançamento — pode entrar depois.)

---

## 10. Dados que o app coleta dos usuários

Lista do que cada cliente que se cadastra acaba registrando no sistema. Útil pra TPC saber o que tá no banco e o que aparece pro time no painel admin.

### Dados pessoais (cadastro)
- Nome completo
- Email
- Telefone
- CPF (pessoa física) ou CNPJ (pessoa jurídica)
- Foto de perfil (opcional, o cliente sobe)

### Endereço
- CEP, rua, número, complemento, bairro, cidade, estado

### Veículos cadastrados (até 3 por conta)
- Marca, modelo, ano
- Tipo de motor (motorização)
- Placa
- Cor (opcional)

### Pagamento
- Cartões salvos pro 1-click em recompras futuras
  - **O que fica armazenado**: bandeira (Visa/Master/etc), 4 últimos dígitos, nome do titular, mês/ano de validade
  - **O que NÃO fica armazenado**: o número completo do cartão e o CVV. Esses dados ficam apenas no Mercado Pago (é a regra de segurança PCI-DSS).
- Histórico completo de compras (valor, forma de pagamento, parcelamento, data)

### Atividade no app
- Histórico de agendamentos presenciais (qual serviço, qual carro, data, status)
- Histórico de pedidos por arquivo (qual serviço, dados técnicos do envio: modelo da ECU, hardware usado, tipo de leitura, chassi/VIN, KM)
- Arquivos enviados pelo cliente (.bin/.ori) e os modificados que a TPC entregou
- Conversas inteiras do chat de file service
- Saldo de pontos e todas as transações (crédito por compra, débito por serviço, reserva, etc)

### Preferências
- Consentimentos granulares de notificação:
  - Aceita email de marketing? (default: não)
  - Aceita WhatsApp de marketing? (default: não)
  - Aceita email transacional? (default: sim, pode desligar)
  - Aceita WhatsApp transacional? (default: sim, pode desligar)
  - Aceita push do app? (default: sim, pode desligar)

### O que o cliente pode fazer com os próprios dados (exigência da LGPD)
- Baixar um arquivo ZIP com tudo o que o sistema tem dele
- Pedir exclusão da conta (vira efetiva após 30 dias de carência — antes disso pode cancelar)
- Editar dados pessoais a qualquer momento
- Mudar consentimentos a qualquer momento

---

## 11. Quem usa o painel admin

O painel admin é o lado da TPC dentro do app. Por ele dá pra:

- Confirmar/cancelar agendamentos presenciais
- Conversar no chat de file service e entregar arquivo modificado
- Editar catálogo de serviços (criar, editar preço, ativar/desativar)
- Editar pacotes de pontos
- Responder leads que chegam pela landing
- Disparar campanhas de email pros clientes opt-in
- Ver e editar usuários cadastrados (resetar senha, mudar dados, etc)

Pergunta:
- **Lista de emails do time TPC** que precisa acessar:
  - Quem só responde leads/pedidos e mexe no catálogo (acesso "Staff")
  - Quem pode promover outros pra Staff (acesso "Admin")

---

## Sugestão de prioridade

**Resolver primeiro** (sem isso o app não funciona):
1. Identificação da empresa (§1)
2. Conta de pagamento PJ + decisão sobre 3x sem juros (§2)
3. Domínio + email próprio (§3)
4. Preços reais do catálogo e pacotes (§§4, 5)

**Resolver antes do lançamento**:
5. Política de garantia e cancelamento (§6)
6. Política de arquivos (§7)
7. Endereço e horário da oficina (§8)

**Pode entrar depois do lançamento**:
8. WhatsApp Business (§9)
9. Lista de acessos admin (§11) — vai sendo adicionado conforme o time TPC vai usando
