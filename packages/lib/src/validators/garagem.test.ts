import { describe, expect, it } from 'vitest'

import { createCarSchema, normalizePlate, plateSchema, updateCarSchema } from './garagem.js'

describe('plateSchema', () => {
  it('accepts Mercosul plate ABC1D23', () => {
    const parsed = plateSchema.parse('ABC1D23')
    expect(parsed).toBe('ABC1D23')
  })

  it('accepts antiga plate ABC1234', () => {
    const parsed = plateSchema.parse('ABC1234')
    expect(parsed).toBe('ABC1234')
  })

  it('uppercases and trims', () => {
    const parsed = plateSchema.parse('  abc1d23  ')
    expect(parsed).toBe('ABC1D23')
  })

  it('rejects 6-character plate', () => {
    expect(plateSchema.safeParse('ABC123').success).toBe(false)
  })

  it('rejects 8-character plate', () => {
    expect(plateSchema.safeParse('ABCD1234').success).toBe(false)
  })

  it('rejects plates with hyphen', () => {
    expect(plateSchema.safeParse('ABC-1234').success).toBe(false)
  })

  it('rejects plates starting with digits', () => {
    expect(plateSchema.safeParse('1AB1234').success).toBe(false)
  })
})

describe('normalizePlate', () => {
  it('strips hyphens and spaces', () => {
    expect(normalizePlate('ABC-1D23')).toBe('ABC1D23')
    expect(normalizePlate('abc 1 d 23')).toBe('ABC1D23')
  })
})

describe('createCarSchema', () => {
  const base = {
    brand: 'BMW',
    model: 'M340i',
    year: 2022,
    motorType: 'turbo' as const,
    plate: 'BMW1M40',
    color: 'Cinza',
  }

  it('accepts a full payload', () => {
    const parsed = createCarSchema.parse(base)
    expect(parsed.brand).toBe('BMW')
    expect(parsed.year).toBe(2022)
  })

  it('makes color optional', () => {
    const { color: _color, ...rest } = base
    const parsed = createCarSchema.parse(rest)
    expect(parsed.color).toBeUndefined()
  })

  it('rejects year below 1980', () => {
    expect(createCarSchema.safeParse({ ...base, year: 1970 }).success).toBe(false)
  })

  it('rejects year far in the future', () => {
    const future = new Date().getFullYear() + 5
    expect(createCarSchema.safeParse({ ...base, year: future }).success).toBe(false)
  })

  it('rejects invalid motorType', () => {
    expect(
      createCarSchema.safeParse({ ...base, motorType: 'eletrico' as never }).success,
    ).toBe(false)
  })

  it('rejects short brand', () => {
    expect(createCarSchema.safeParse({ ...base, brand: 'B' }).success).toBe(false)
  })
})

describe('updateCarSchema', () => {
  it('accepts color only', () => {
    expect(updateCarSchema.parse({ color: 'Preto' }).color).toBe('Preto')
  })

  it('accepts plate only', () => {
    expect(updateCarSchema.parse({ plate: 'XYZ9A88' }).plate).toBe('XYZ9A88')
  })

  it('rejects empty payload', () => {
    expect(updateCarSchema.safeParse({}).success).toBe(false)
  })

  it('rejects invalid plate', () => {
    expect(updateCarSchema.safeParse({ plate: 'invalido' }).success).toBe(false)
  })
})
