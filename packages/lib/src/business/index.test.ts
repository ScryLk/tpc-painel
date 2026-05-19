import { describe, expect, it } from 'vitest'

import {
  canInstall,
  fitsBalance,
  installmentValueCents,
  pricePerPointCents,
  totalCreditedPoints,
} from './index.js'

describe('totalCreditedPoints', () => {
  it('sums points and bonusPoints', () => {
    expect(totalCreditedPoints({ points: 500, bonusPoints: 50, priceCents: 45000 })).toBe(550)
  })

  it('returns base points when bonus is zero', () => {
    expect(totalCreditedPoints({ points: 100, bonusPoints: 0, priceCents: 10000 })).toBe(100)
  })
})

describe('pricePerPointCents', () => {
  it('returns the unit cost of a point in cents', () => {
    expect(pricePerPointCents({ points: 500, bonusPoints: 0, priceCents: 45000 })).toBe(90)
  })

  it('returns 0 when points is 0 to avoid division by zero', () => {
    expect(pricePerPointCents({ points: 0, bonusPoints: 0, priceCents: 0 })).toBe(0)
  })
})

describe('canInstall', () => {
  it('allows 1x always', () => {
    expect(canInstall({ points: 100, bonusPoints: 0, priceCents: 10000 }, 1)).toBe(true)
  })

  it('blocks 2x and 3x below R$ 400', () => {
    const pkg = { points: 100, bonusPoints: 0, priceCents: 10000 }
    expect(canInstall(pkg, 2)).toBe(false)
    expect(canInstall(pkg, 3)).toBe(false)
  })

  it('allows up to 3x at R$ 400+', () => {
    const pkg = { points: 500, bonusPoints: 50, priceCents: 45000 }
    expect(canInstall(pkg, 2)).toBe(true)
    expect(canInstall(pkg, 3)).toBe(true)
  })

  it('rejects values outside 1-3', () => {
    const pkg = { points: 2000, bonusPoints: 400, priceCents: 160000 }
    expect(canInstall(pkg, 0)).toBe(false)
    expect(canInstall(pkg, 4)).toBe(false)
  })
})

describe('installmentValueCents', () => {
  it('splits price evenly', () => {
    expect(installmentValueCents(45000, 3)).toBe(15000)
  })

  it('rounds to nearest cent for non-divisible values', () => {
    expect(installmentValueCents(10000, 3)).toBe(3333)
  })

  it('throws when n < 1', () => {
    expect(() => installmentValueCents(10000, 0)).toThrow()
  })
})

describe('fitsBalance', () => {
  it('returns true when available equals cost exactly', () => {
    expect(fitsBalance(500, { available: 500, reserved: 0 })).toBe(true)
  })

  it('returns true when available exceeds cost', () => {
    expect(fitsBalance(300, { available: 500, reserved: 100 })).toBe(true)
  })

  it('returns false when available is below cost (reserved does not count)', () => {
    expect(fitsBalance(500, { available: 400, reserved: 200 })).toBe(false)
  })
})
