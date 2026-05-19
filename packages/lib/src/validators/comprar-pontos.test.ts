import { describe, expect, it } from 'vitest'

import { checkoutBodySchema } from './comprar-pontos.js'

const validUuid = '11111111-2222-3333-4444-555555555555'
const otherUuid = '22222222-3333-4444-5555-666666666666'

const cardSnapshot = {
  brand: 'visa' as const,
  lastFour: '4242',
  holderName: 'Rafael Mendes',
  expMonth: 8,
  expYear: new Date().getFullYear() + 2,
}

describe('checkoutBodySchema', () => {
  it('accepts a pix payload without installments', () => {
    const parsed = checkoutBodySchema.parse({ packageId: validUuid, method: 'pix' })
    expect(parsed.method).toBe('pix')
  })

  it('accepts a card payload with token and installments', () => {
    const parsed = checkoutBodySchema.parse({
      packageId: validUuid,
      method: 'card',
      cardToken: 'mock-tok-1',
      installments: 3,
    })
    expect(parsed.installments).toBe(3)
    expect(parsed.cardToken).toBe('mock-tok-1')
  })

  it('accepts a card payload using savedCardId (1-click)', () => {
    const parsed = checkoutBodySchema.parse({
      packageId: validUuid,
      method: 'card',
      savedCardId: otherUuid,
    })
    expect(parsed.savedCardId).toBe(otherUuid)
  })

  it('rejects card method without cardToken or savedCardId', () => {
    const result = checkoutBodySchema.safeParse({ packageId: validUuid, method: 'card' })
    expect(result.success).toBe(false)
  })

  it('rejects installments when method is pix', () => {
    const result = checkoutBodySchema.safeParse({
      packageId: validUuid,
      method: 'pix',
      installments: 3,
    })
    expect(result.success).toBe(false)
  })

  it('rejects installments outside 1-3', () => {
    const result = checkoutBodySchema.safeParse({
      packageId: validUuid,
      method: 'card',
      cardToken: 'mock-tok-1',
      installments: 4,
    })
    expect(result.success).toBe(false)
  })

  it('rejects saveCard when method is pix', () => {
    const result = checkoutBodySchema.safeParse({
      packageId: validUuid,
      method: 'pix',
      saveCard: true,
    })
    expect(result.success).toBe(false)
  })

  it('rejects saveCard=true without card snapshot', () => {
    const result = checkoutBodySchema.safeParse({
      packageId: validUuid,
      method: 'card',
      cardToken: 'mock-tok-1',
      saveCard: true,
    })
    expect(result.success).toBe(false)
  })

  it('accepts saveCard=true when card snapshot is provided', () => {
    const parsed = checkoutBodySchema.parse({
      packageId: validUuid,
      method: 'card',
      cardToken: 'mock-tok-1',
      saveCard: true,
      card: cardSnapshot,
    })
    expect(parsed.saveCard).toBe(true)
    expect(parsed.card?.lastFour).toBe('4242')
  })

  it('rejects card snapshot with non-numeric lastFour', () => {
    const result = checkoutBodySchema.safeParse({
      packageId: validUuid,
      method: 'card',
      cardToken: 'mock-tok-1',
      saveCard: true,
      card: { ...cardSnapshot, lastFour: '42aa' },
    })
    expect(result.success).toBe(false)
  })

  it('rejects card snapshot with expired year', () => {
    const result = checkoutBodySchema.safeParse({
      packageId: validUuid,
      method: 'card',
      cardToken: 'mock-tok-1',
      saveCard: true,
      card: { ...cardSnapshot, expYear: new Date().getFullYear() - 1 },
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid uuid', () => {
    const result = checkoutBodySchema.safeParse({ packageId: 'not-a-uuid', method: 'pix' })
    expect(result.success).toBe(false)
  })

  it('rejects malformed cpfCnpj', () => {
    const result = checkoutBodySchema.safeParse({
      packageId: validUuid,
      method: 'pix',
      cpfCnpj: '123.456.789-00',
    })
    expect(result.success).toBe(false)
  })

  it('accepts a 11-digit cpf without punctuation', () => {
    const parsed = checkoutBodySchema.parse({
      packageId: validUuid,
      method: 'pix',
      cpfCnpj: '12345678900',
    })
    expect(parsed.cpfCnpj).toBe('12345678900')
  })

  it('accepts a 14-digit cnpj without punctuation', () => {
    const parsed = checkoutBodySchema.parse({
      packageId: validUuid,
      method: 'pix',
      cpfCnpj: '12345678000190',
    })
    expect(parsed.cpfCnpj).toBe('12345678000190')
  })
})
