import { randomUUID } from 'node:crypto'

import { env } from './env.js'

// Resultado normalizado pra uso interno. Real SDK + mock retornam o mesmo shape.

export interface PixPaymentResult {
  mpPaymentId: string
  qrCode: string
  qrCodeBase64: string
  expiresAt: string
  amountCents: number
}

export interface CardPreferenceResult {
  mpPaymentId: string
  checkoutUrl: string
  expiresAt: string
  amountCents: number
}

interface CreatePixInput {
  amountCents: number
  description: string
  externalReference: string
  payerEmail: string
  cpfCnpj?: string | null
}

interface CreateCardInput extends CreatePixInput {
  installments: number
  cardToken?: string
}

const expiresIn30Min = (): string => new Date(Date.now() + 30 * 60_000).toISOString()

// MP-shaped mock payloads. Deterministic enough pra dev/test mas com id unico
// pra simular comportamento real (idempotencia em webhook via mpPaymentId).
const mockPixPayment = (input: CreatePixInput): PixPaymentResult => {
  const mpPaymentId = `mock-pay-${randomUUID()}`
  return {
    mpPaymentId,
    qrCode: `00020126580014BR.GOV.BCB.PIX0136${mpPaymentId}52040000530398654${(input.amountCents / 100).toFixed(2)}5802BR5913TPC Performance6008Panambi62${mpPaymentId.length.toString().padStart(2, '0')}${mpPaymentId}6304MOCK`,
    qrCodeBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    expiresAt: expiresIn30Min(),
    amountCents: input.amountCents,
  }
}

const mockCardPreference = (input: CreateCardInput): CardPreferenceResult => {
  const mpPaymentId = `mock-pref-${randomUUID()}`
  return {
    mpPaymentId,
    checkoutUrl: `https://mock.mercadopago.com.br/checkout/v1/redirect?pref_id=${mpPaymentId}`,
    expiresAt: expiresIn30Min(),
    amountCents: input.amountCents,
  }
}

export const createPixPayment = async (input: CreatePixInput): Promise<PixPaymentResult> => {
  if (env.MP_MOCK || !env.MP_ACCESS_TOKEN) {
    return mockPixPayment(input)
  }
  // TODO: real Mercado Pago SDK call. Wire when TPC fornece access token de
  // produção. Manter o mesmo shape de retorno.
  // const client = new MercadoPagoConfig({ accessToken: env.MP_ACCESS_TOKEN })
  // const payment = new Payment(client)
  // const res = await payment.create({ body: { ... } })
  // return { mpPaymentId: String(res.id), qrCode: res.point_of_interaction.transaction_data.qr_code, ... }
  throw new Error('Real Mercado Pago integration not implemented yet. Set MP_MOCK=true.')
}

export const createCardPreference = async (
  input: CreateCardInput,
): Promise<CardPreferenceResult> => {
  if (env.MP_MOCK || !env.MP_ACCESS_TOKEN) {
    return mockCardPreference(input)
  }
  throw new Error('Real Mercado Pago integration not implemented yet. Set MP_MOCK=true.')
}

// Status do payment no MP. Usado pelo webhook handler pra decidir se credita.
export interface MpPaymentStatus {
  id: string
  status: 'pending' | 'approved' | 'rejected' | 'refunded' | 'cancelled' | 'in_process'
  externalReference: string | null
  amountCents: number
  paymentMethod: string
  installments: number
}

// Em modo mock devolvemos approved direto pra fluxo de dev fluir sem precisar
// pagar de verdade. Em prod busca via SDK.
export const getMpPayment = async (id: string): Promise<MpPaymentStatus> => {
  if (env.MP_MOCK || !env.MP_ACCESS_TOKEN) {
    return {
      id,
      status: 'approved',
      externalReference: null, // injetado pelo caller (Purchase.id) via external_reference
      amountCents: 0,
      paymentMethod: id.startsWith('mock-pay-') ? 'pix' : 'credit_card',
      installments: 1,
    }
  }
  throw new Error('Real Mercado Pago integration not implemented yet. Set MP_MOCK=true.')
}
