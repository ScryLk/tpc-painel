import { z } from 'zod'

export const paymentMethodSchema = z.enum(['pix', 'card'])
export type PaymentMethod = z.infer<typeof paymentMethodSchema>

export const installmentsSchema = z.union([z.literal(1), z.literal(2), z.literal(3)])
export type Installments = z.infer<typeof installmentsSchema>

export const cardBrandSchema = z.enum(['visa', 'master', 'elo', 'amex', 'other'])
export type CardBrand = z.infer<typeof cardBrandSchema>

// Snapshot enviado pelo client quando o cliente marca "salvar pra próxima compra".
// PAN e CVV nunca trafegam aqui: apenas dados que viram parte do display da
// lista de cartões salvos (last4, brand, holder, validade).
export const cardSnapshotSchema = z.object({
  brand: cardBrandSchema,
  lastFour: z.string().regex(/^\d{4}$/, 'lastFour must be 4 digits'),
  holderName: z.string().min(2).max(60),
  expMonth: z.number().int().min(1).max(12),
  expYear: z
    .number()
    .int()
    .min(new Date().getFullYear())
    .max(new Date().getFullYear() + 30),
})
export type CardSnapshot = z.infer<typeof cardSnapshotSchema>

// POST /checkout body
export const checkoutBodySchema = z
  .object({
    packageId: z.string().uuid(),
    method: paymentMethodSchema,
    installments: installmentsSchema.optional(),
    // Token de uso único emitido pelo MP.js (ou pelo mock client) durante o
    // submit do form de cartão. Obrigatório quando method=card e cliente NÃO
    // está usando um saved card já tokenizado.
    cardToken: z.string().min(1).optional(),
    // Se preenchido, o backend usa o mpCardToken permanente desse SavedCard
    // em vez de exigir cardToken novo (1-click checkout).
    savedCardId: z.string().uuid().optional(),
    // Persiste o cartão como SavedCard após aprovação. Snapshot vai junto.
    saveCard: z.boolean().optional(),
    card: cardSnapshotSchema.optional(),
    cpfCnpj: z
      .string()
      .regex(/^\d{11}$|^\d{14}$/, 'CPF (11 digits) or CNPJ (14 digits) without punctuation')
      .optional(),
  })
  .refine((data) => data.method === 'card' || data.installments === undefined, {
    message: 'installments só faz sentido com method=card',
    path: ['installments'],
  })
  .refine((data) => data.method === 'card' || data.saveCard !== true, {
    message: 'saveCard só faz sentido com method=card',
    path: ['saveCard'],
  })
  .refine(
    (data) =>
      data.method !== 'card' || data.cardToken !== undefined || data.savedCardId !== undefined,
    {
      message: 'cardToken ou savedCardId obrigatório quando method=card',
      path: ['cardToken'],
    },
  )
  .refine((data) => data.saveCard !== true || data.card !== undefined, {
    message: 'card snapshot obrigatório quando saveCard=true',
    path: ['card'],
  })

export type CheckoutBody = z.infer<typeof checkoutBodySchema>

// Mercado Pago webhook v2 payload (only the fields we care about)
export const mpWebhookPayloadSchema = z.object({
  id: z.union([z.number(), z.string()]),
  type: z.string().optional(),
  action: z.string().optional(),
  data: z.object({ id: z.string() }),
  date_created: z.string().optional(),
  user_id: z.union([z.number(), z.string()]).optional(),
  live_mode: z.boolean().optional(),
  api_version: z.string().optional(),
})

export type MpWebhookPayload = z.infer<typeof mpWebhookPayloadSchema>
