import { z } from 'zod'

export const paymentMethodSchema = z.enum(['pix', 'card'])
export type PaymentMethod = z.infer<typeof paymentMethodSchema>

export const installmentsSchema = z.union([z.literal(1), z.literal(2), z.literal(3)])
export type Installments = z.infer<typeof installmentsSchema>

// POST /checkout body
export const checkoutBodySchema = z
  .object({
    packageId: z.string().uuid(),
    method: paymentMethodSchema,
    installments: installmentsSchema.optional(),
    cardToken: z.string().min(1).optional(),
    cpfCnpj: z
      .string()
      .regex(/^\d{11}$|^\d{14}$/, 'CPF (11 digits) or CNPJ (14 digits) without punctuation')
      .optional(),
  })
  .refine(
    (data) => data.method === 'card' || data.installments === undefined,
    { message: 'installments só faz sentido com method=card', path: ['installments'] },
  )

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
