import { describe, expect, it } from 'vitest'

import {
  parseSignatureHeader,
  signMercadoPagoPayload,
  verifyMercadoPagoSignature,
} from './hmac.js'

describe('parseSignatureHeader', () => {
  it('parses ts and v1 fields', () => {
    expect(parseSignatureHeader('ts=1700000000,v1=abcdef')).toEqual({
      ts: '1700000000',
      v1: 'abcdef',
    })
  })

  it('returns null when ts is missing', () => {
    expect(parseSignatureHeader('v1=abcdef')).toBeNull()
  })

  it('returns null when v1 is missing', () => {
    expect(parseSignatureHeader('ts=1700000000')).toBeNull()
  })

  it('ignores unknown fields', () => {
    expect(parseSignatureHeader('ts=1,v1=a,foo=bar')).toEqual({ ts: '1', v1: 'a' })
  })
})

describe('verifyMercadoPagoSignature', () => {
  const secret = 'super-secret'
  const ts = '1700000000'
  const requestId = 'req-123'
  const dataId = 'mp-payment-9999'

  it('verifies a freshly signed payload', () => {
    const header = signMercadoPagoPayload({ secret, ts, requestId, dataId })
    expect(
      verifyMercadoPagoSignature({ secret, signatureHeader: header, requestId, dataId }),
    ).toBe(true)
  })

  it('rejects when secret is wrong', () => {
    const header = signMercadoPagoPayload({ secret, ts, requestId, dataId })
    expect(
      verifyMercadoPagoSignature({
        secret: 'other-secret',
        signatureHeader: header,
        requestId,
        dataId,
      }),
    ).toBe(false)
  })

  it('rejects when request-id was tampered with', () => {
    const header = signMercadoPagoPayload({ secret, ts, requestId, dataId })
    expect(
      verifyMercadoPagoSignature({
        secret,
        signatureHeader: header,
        requestId: 'different-req',
        dataId,
      }),
    ).toBe(false)
  })

  it('rejects when data id was tampered with', () => {
    const header = signMercadoPagoPayload({ secret, ts, requestId, dataId })
    expect(
      verifyMercadoPagoSignature({
        secret,
        signatureHeader: header,
        requestId,
        dataId: 'different-payment',
      }),
    ).toBe(false)
  })

  it('rejects malformed header', () => {
    expect(
      verifyMercadoPagoSignature({
        secret,
        signatureHeader: 'garbage',
        requestId,
        dataId,
      }),
    ).toBe(false)
  })
})
