import { describe, expect, it } from 'vitest'

import {
  acceptQuoteSchema,
  createRemapOrderSchema,
  remapQuoteSchema,
  remapTechnicalDataSchema,
} from './file-service.js'

const validUuid = '11111111-2222-3333-4444-555555555555'
const validCarId = '22222222-3333-4444-5555-666666666666'
const validVin = '1HGCM82633A123459' // 17 chars sem I/O/Q

describe('remapTechnicalDataSchema', () => {
  it('aceita vazio', () => {
    expect(remapTechnicalDataSchema.parse({}).description).toBeUndefined()
  })

  it('uppercase + valida VIN 17 chars', () => {
    const parsed = remapTechnicalDataSchema.parse({ vehicleVin: validVin.toLowerCase() })
    expect(parsed.vehicleVin).toBe(validVin)
  })

  it('rejeita VIN com I/O/Q', () => {
    expect(
      remapTechnicalDataSchema.safeParse({ vehicleVin: '1HGIM82633A123459' }).success,
    ).toBe(false)
  })

  it('rejeita VIN com tamanho errado', () => {
    expect(
      remapTechnicalDataSchema.safeParse({ vehicleVin: '1HGCM82633A' }).success,
    ).toBe(false)
  })

  it('aceita readMode válido', () => {
    expect(remapTechnicalDataSchema.parse({ readMode: 'OBD' }).readMode).toBe('OBD')
    expect(remapTechnicalDataSchema.parse({ readMode: 'Bench' }).readMode).toBe('Bench')
    expect(remapTechnicalDataSchema.parse({ readMode: 'Boot' }).readMode).toBe('Boot')
  })

  it('rejeita readMode desconhecido', () => {
    expect(remapTechnicalDataSchema.safeParse({ readMode: 'JTAG' as never }).success).toBe(false)
  })

  it('mileage não-negativo, dentro do limite', () => {
    expect(remapTechnicalDataSchema.safeParse({ mileage: -10 }).success).toBe(false)
    expect(remapTechnicalDataSchema.parse({ mileage: 50_000 }).mileage).toBe(50_000)
  })

  it('description truncada em 2000 chars no schema', () => {
    expect(
      remapTechnicalDataSchema.safeParse({ description: 'a'.repeat(2001) }).success,
    ).toBe(false)
  })
})

describe('createRemapOrderSchema', () => {
  it('fluxo padrão exige serviceId', () => {
    const parsed = createRemapOrderSchema.parse({
      serviceId: validUuid,
      carId: validCarId,
      isCustomQuote: false,
      technicalData: {},
    })
    expect(parsed.serviceId).toBe(validUuid)
    expect(parsed.carId).toBe(validCarId)
    expect(parsed.isCustomQuote).toBe(false)
  })

  it('fluxo padrão sem serviceId rejeita', () => {
    const result = createRemapOrderSchema.safeParse({
      carId: validCarId,
      isCustomQuote: false,
      technicalData: {},
    })
    expect(result.success).toBe(false)
  })

  it('fluxo custom aceita sem serviceId', () => {
    const parsed = createRemapOrderSchema.parse({
      carId: validCarId,
      isCustomQuote: true,
      technicalData: { description: 'Quero algo específico pra meu motor' },
    })
    expect(parsed.serviceId).toBeUndefined()
    expect(parsed.isCustomQuote).toBe(true)
  })

  it('fluxo custom com serviceId também aceita', () => {
    const parsed = createRemapOrderSchema.parse({
      serviceId: validUuid,
      carId: validCarId,
      isCustomQuote: true,
      technicalData: {},
    })
    expect(parsed.serviceId).toBe(validUuid)
  })

  it('serviceId null é equivalente a omitido em custom', () => {
    const parsed = createRemapOrderSchema.parse({
      serviceId: null,
      carId: validCarId,
      isCustomQuote: true,
      technicalData: {},
    })
    expect(parsed.serviceId).toBeNull()
  })

  it('default isCustomQuote=false', () => {
    const parsed = createRemapOrderSchema.parse({
      serviceId: validUuid,
      carId: validCarId,
      technicalData: {},
    })
    expect(parsed.isCustomQuote).toBe(false)
  })

  it('rejeita sem carId (padrão)', () => {
    const result = createRemapOrderSchema.safeParse({
      serviceId: validUuid,
      isCustomQuote: false,
      technicalData: {},
    })
    expect(result.success).toBe(false)
  })

  it('rejeita sem carId (custom)', () => {
    const result = createRemapOrderSchema.safeParse({
      isCustomQuote: true,
      technicalData: { description: 'Sem carro' },
    })
    expect(result.success).toBe(false)
  })

  it('rejeita carId não-uuid', () => {
    const result = createRemapOrderSchema.safeParse({
      serviceId: validUuid,
      carId: 'not-a-uuid',
      isCustomQuote: false,
      technicalData: {},
    })
    expect(result.success).toBe(false)
  })
})

describe('remapQuoteSchema', () => {
  it('aceita orçamento positivo', () => {
    expect(remapQuoteSchema.parse({ pointsProposed: 350 }).pointsProposed).toBe(350)
  })

  it('rejeita 0 ou negativo', () => {
    expect(remapQuoteSchema.safeParse({ pointsProposed: 0 }).success).toBe(false)
    expect(remapQuoteSchema.safeParse({ pointsProposed: -1 }).success).toBe(false)
  })

  it('rejeita não-inteiro', () => {
    expect(remapQuoteSchema.safeParse({ pointsProposed: 100.5 }).success).toBe(false)
  })

  it('rejeita acima de 50k', () => {
    expect(remapQuoteSchema.safeParse({ pointsProposed: 50_001 }).success).toBe(false)
  })
})

describe('acceptQuoteSchema', () => {
  it('aceita true', () => {
    expect(acceptQuoteSchema.parse({ accept: true }).accept).toBe(true)
  })

  it('aceita false (recusa)', () => {
    expect(acceptQuoteSchema.parse({ accept: false }).accept).toBe(false)
  })

  it('rejeita string', () => {
    expect(acceptQuoteSchema.safeParse({ accept: 'yes' }).success).toBe(false)
  })
})
