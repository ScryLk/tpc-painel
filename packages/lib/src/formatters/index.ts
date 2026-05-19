// Formatters retornam strings já localizadas em pt-BR.

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const points = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
})

const dateBR = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const dateTimeBR = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export const formatBRL = (cents: number): string => brl.format(cents / 100)

export const formatPoints = (value: number): string => points.format(value)

export const formatDateBR = (date: Date | string): string =>
  dateBR.format(typeof date === 'string' ? new Date(date) : date)

export const formatDateTimeBR = (date: Date | string): string =>
  dateTimeBR.format(typeof date === 'string' ? new Date(date) : date)

// Format remaining time as MM:SS (used in checkout pix timer).
export const formatCountdown = (seconds: number): string => {
  const safe = Math.max(0, Math.floor(seconds))
  const mins = Math.floor(safe / 60)
  const secs = safe % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
