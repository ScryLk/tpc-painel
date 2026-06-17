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

// Normaliza placa removendo separadores e uppercasing. Pra exibição (placa
// vermelha estilizada) e antes de submit. Validação completa (regex Mercosul
// vs antiga) vive nos validators do back; aqui é só limpeza de input.
export const normalizePlate = (raw: string): string =>
  raw.replace(/[^A-Z0-9]/gi, '').toUpperCase()

// Tira tudo que não for dígito (preserva o + opcional do internacional).
export const normalizePhone = (raw: string): string => {
  const trimmed = raw.trim()
  const hasPlus = trimmed.startsWith('+')
  const digits = trimmed.replace(/\D/g, '')
  return hasPlus ? `+${digits}` : digits
}

// Formato BR progressivo. Aceita 10 (fixo) ou 11 (móvel) dígitos com DDD.
// 13 com prefixo 55. Retorna parcialmente formatado conforme usuário digita.
//   55 -> "(55) "
//   5599 -> "(55) 99"
//   559991 -> "(55) 9 9991"
//   55999913335 -> "(55) 9 9991-3335"
//   559991333502 -> "(55) 9 9133-3502"
export const formatPhoneBR = (raw: string): string => {
  const cleaned = raw.replace(/\D/g, '').slice(0, 13)
  // Tira o "55" do prefixo internacional pra exibir só o DDD+número.
  const local = cleaned.startsWith('55') && cleaned.length > 11
    ? cleaned.slice(2)
    : cleaned
  if (local.length === 0) return ''
  if (local.length <= 2) return `(${local}`
  const ddd = local.slice(0, 2)
  const rest = local.slice(2)
  if (rest.length === 0) return `(${ddd}) `
  if (rest.length <= 4) return `(${ddd}) ${rest}`
  // Mobile (11): "9 XXXX-XXXX"; landline (10): "XXXX-XXXX"
  if (rest.length === 9 && rest[0] === '9') {
    // 9 XXXX-XXXX
    return `(${ddd}) ${rest[0]} ${rest.slice(1, 5)}-${rest.slice(5)}`
  }
  if (rest.length <= 8) {
    return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`
  }
  // 9 dígitos sem começar com 9, ou >8 sem casar: fallback "X XXXX-XXXX"
  return `(${ddd}) ${rest[0]} ${rest.slice(1, 5)}-${rest.slice(5)}`
}
