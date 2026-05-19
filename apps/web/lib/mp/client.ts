import type { CardBrand } from '@tpc/lib/validators'

// Detecção de bandeira pelo BIN. Suficiente pra exibir o ícone enquanto o
// usuário digita. A bandeira real é confirmada pelo Mercado Pago no submit.
export const detectBrand = (digits: string): CardBrand => {
  const d = digits.replace(/\D/g, '')
  if (!d) return 'other'
  if (d.startsWith('4')) return 'visa'
  if (/^5[1-5]/.test(d) || /^2[2-7]/.test(d)) return 'master'
  if (
    /^4011|^431274|^438935|^451416|^457393|^4576|^4720|^504175|^5067|^509|^627780|^636297|^636368|^65003|^65041/.test(
      d,
    )
  ) {
    return 'elo'
  }
  if (/^3[47]/.test(d)) return 'amex'
  return 'other'
}

export const formatCardNumber = (raw: string): string => {
  const d = raw.replace(/\D/g, '').slice(0, 19)
  return d.replace(/(.{4})/g, '$1 ').trim()
}

export const formatExpiry = (raw: string): string => {
  const d = raw.replace(/\D/g, '').slice(0, 4)
  if (d.length <= 2) return d
  return `${d.slice(0, 2)}/${d.slice(2)}`
}

export interface TokenizeInput {
  cardNumber: string
  expMonth: number
  expYear: number
  cvv: string
  holderName: string
}

export interface TokenizeResult {
  token: string
  brand: CardBrand
  lastFour: string
}

// Mock de tokenização. Quando TPC fornecer MP credentials, trocar por chamada
// real ao SDK MP.js (window.Mercadopago.createCardToken). Mesmo shape.
export const tokenizeCard = async (input: TokenizeInput): Promise<TokenizeResult> => {
  const digits = input.cardNumber.replace(/\D/g, '')
  if (digits.length < 13 || digits.length > 19) {
    throw new Error('Número de cartão inválido')
  }
  if (input.cvv.length < 3 || input.cvv.length > 4) {
    throw new Error('CVV inválido')
  }
  const brand = detectBrand(digits)
  const lastFour = digits.slice(-4)
  // Token "estável" no mock: hash simples dos últimos 4 + mês. Em prod o MP
  // gera token único de uso único.
  const token = `mock-tok-${brand}-${lastFour}-${Date.now().toString(36)}`
  return { token, brand, lastFour }
}
