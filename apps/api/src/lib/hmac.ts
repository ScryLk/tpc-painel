import { createHmac, timingSafeEqual } from 'node:crypto'

// Mercado Pago v2 webhook signature.
// Header `x-signature` chega como `ts=<ts>,v1=<hash>`. O hash e HMAC-SHA256
// sobre a string `id:<dataId>;request-id:<requestId>;ts:<ts>;` com o secret
// da preference. Doc:
// https://www.mercadopago.com.br/developers/en/docs/your-integrations/notifications/webhooks

interface ParsedSignature {
  ts: string
  v1: string
}

export const parseSignatureHeader = (header: string): ParsedSignature | null => {
  const parts: Record<string, string> = {}
  for (const piece of header.split(',')) {
    const [k, v] = piece.split('=')
    if (k && v) parts[k.trim()] = v.trim()
  }
  if (!parts.ts || !parts.v1) return null
  return { ts: parts.ts, v1: parts.v1 }
}

interface VerifyInput {
  secret: string
  signatureHeader: string
  requestId: string
  dataId: string
}

export const verifyMercadoPagoSignature = ({
  secret,
  signatureHeader,
  requestId,
  dataId,
}: VerifyInput): boolean => {
  const parsed = parseSignatureHeader(signatureHeader)
  if (!parsed) return false

  const manifest = `id:${dataId};request-id:${requestId};ts:${parsed.ts};`
  const expected = createHmac('sha256', secret).update(manifest).digest('hex')

  const expectedBuf = Buffer.from(expected, 'hex')
  const actualBuf = Buffer.from(parsed.v1, 'hex')
  if (expectedBuf.length !== actualBuf.length) return false
  return timingSafeEqual(expectedBuf, actualBuf)
}

// Helper inverso usado pelos testes pra gerar headers válidos.
export const signMercadoPagoPayload = ({
  secret,
  ts,
  requestId,
  dataId,
}: {
  secret: string
  ts: string
  requestId: string
  dataId: string
}): string => {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
  const hash = createHmac('sha256', secret).update(manifest).digest('hex')
  return `ts=${ts},v1=${hash}`
}
