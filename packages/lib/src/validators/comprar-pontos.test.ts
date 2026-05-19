import { describe, expect, it } from 'vitest'

import { checkoutBodySchema } from './comprar-pontos.js'

const validUuid = '11111111-2222-3333-4444-555555555555'

describe('checkoutBodySchema', () => {
  it('accepts a pix payload without installments', () => {
    const parsed = checkoutBodySchema.parse({ packageId: validUuid, method: 'pix' })
    expect(parsed.method).toBe('pix')
  })

  it('accepts a card payload with valid installments', () => {
    const parsed = checkoutBodySchema.parse({
      packageId: validUuid,
      method: 'card',
      installments: 3,
    })
    expect(parsed.installments).toBe(3)
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
      installments: 4,
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
