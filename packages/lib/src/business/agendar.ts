// Helpers de business pra agendamento presencial. Puros e testáveis.

// Feriados nacionais fixos BR (pulando Carnaval e Páscoa que variam ano a ano).
// TPC-DECISION #6 pode acrescentar feriados estaduais/locais. Datas no formato
// MM-DD pra reuso ano a ano.
export const FIXED_HOLIDAYS_BR: ReadonlyArray<string> = [
  '01-01', // Confraternização Universal
  '04-21', // Tiradentes
  '05-01', // Dia do Trabalho
  '09-07', // Independência
  '10-12', // Nossa Senhora Aparecida
  '11-02', // Finados
  '11-15', // Proclamação da República
  '12-25', // Natal
]

export const isFixedHoliday = (date: Date): boolean => {
  const mm = (date.getMonth() + 1).toString().padStart(2, '0')
  const dd = date.getDate().toString().padStart(2, '0')
  return FIXED_HOLIDAYS_BR.includes(`${mm}-${dd}`)
}

export const isSunday = (date: Date): boolean => date.getDay() === 0

// TPC trabalha seg-sáb (TPC-DECISION #6 pode mudar). Domingo + feriado fixo
// bloqueado pra agendamento. Sabado liberado por enquanto.
export const isBusinessDay = (date: Date): boolean =>
  !isSunday(date) && !isFixedHoliday(date)

export const isPastDate = (date: Date, now: Date = new Date()): boolean => {
  const a = startOfDay(date).getTime()
  const b = startOfDay(now).getTime()
  return a < b
}

// Retorna 00:00 do dia (sem mexer em fuso, just zera horas)
const startOfDay = (date: Date): Date => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export const addDays = (date: Date, days: number): Date => {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

// Calcula a data final pra serviço multi-dia. Pula domingos e feriados (carro
// fica na oficina mas não conta como dia de execução).
export const computeEndDate = (start: Date, durationDays: number): Date => {
  if (durationDays <= 1) return startOfDay(start)
  let remaining = durationDays - 1
  let cursor = startOfDay(start)
  while (remaining > 0) {
    cursor = addDays(cursor, 1)
    if (isBusinessDay(cursor)) remaining -= 1
  }
  return cursor
}

// Política de cancelamento de Solicitacao presencial (CLAUDE.md decisão).
//
// - >= 24h antes do agendamento: 100% volta pra available (cancelamento livre)
// - 2h-24h antes: 80% volta, 20% vira multa (DEBIT)
// - < 2h antes: 0% (rejeita, cliente fala com TPC pelo WhatsApp)
//
// Retorna null quando dentro da janela de 2h (caller dispara erro).
export const computeRefundPct = (
  scheduledAt: Date,
  arrivalSlot: 'manha' | 'tarde',
  now: Date = new Date(),
): number | null => {
  // Janela aproximada do slot: manha começa 08h, tarde começa 13h.
  // Cliente pode chegar até 12h (manha) ou 18h (tarde), mas usamos o início
  // pra ser conservador na multa.
  const startHour = arrivalSlot === 'manha' ? 8 : 13
  const scheduled = new Date(scheduledAt)
  scheduled.setHours(startHour, 0, 0, 0)

  const hoursLeft = (scheduled.getTime() - now.getTime()) / (1000 * 60 * 60)
  if (hoursLeft >= 24) return 100
  if (hoursLeft >= 2) return 80
  return null
}

// Gera protocolo TPC-{YYYY}-{NNNNN}. Sequência vem do count de Solicitacoes
// no ano + 1, no caller. Aqui é só formatter.
export const formatProtocol = (year: number, sequence: number): string => {
  return `TPC-${year}-${sequence.toString().padStart(5, '0')}`
}

// Pra UI: dado uma lista de motorTypes do serviço, decide se o carro do
// usuário é compatível. 'any' no serviço significa "todos os motores".
export const isServiceCompatibleWithCar = (
  serviceMotorTypes: ReadonlyArray<string>,
  carMotorType: string,
): boolean => {
  if (serviceMotorTypes.length === 0) return true
  if (serviceMotorTypes.includes('any')) return true
  return serviceMotorTypes.includes(carMotorType)
}
