import { z } from 'zod'

// Modo de leitura da ECU pelo hardware do cliente.
export const readModeSchema = z.enum(['OBD', 'Bench', 'Boot'])
export type ReadMode = z.infer<typeof readModeSchema>

// Status do RemapOrder. Bate com enum Prisma RemapOrderStatus.
export const remapStatusSchema = z.enum([
  'AWAITING_QUOTE',
  'QUOTE_SENT',
  'ANALYZING',
  'MAPPING',
  'AWAITING_REVIEW',
  'APPROVED',
  'NEEDS_REVISION',
  'CANCELLED',
])
export type RemapStatus = z.infer<typeof remapStatusSchema>

// Dados técnicos do upload. Todos opcionais individualmente; o backend pode
// exigir alguns conforme o status (ex: ecuModel obrigatório quando sai de
// AWAITING_QUOTE pra ANALYZING).
export const remapTechnicalDataSchema = z.object({
  ecuModel: z.string().trim().min(1).max(80).optional(),
  hardwareUsed: z.string().trim().min(1).max(80).optional(),
  readMode: readModeSchema.optional(),
  vehicleVin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-HJ-NPR-Z0-9]{17}$/, 'VIN inválido. 17 chars, sem I/O/Q.')
    .optional(),
  mileage: z.number().int().min(0).max(2_000_000).optional(),
  description: z.string().trim().max(2000).optional(),
})

export type RemapTechnicalData = z.infer<typeof remapTechnicalDataSchema>

// POST /remap-orders body.
//
// carId é sempre obrigatório: file service amarra o pedido a um carro do user
// (compatibilidade, garantia, status visual na garagem, anti-pirataria futura).
// Fluxo padrão: serviceId obrigatório, isCustomQuote=false, reserva pts ao criar.
// Fluxo custom: serviceId opcional (cliente pode passar `null` ou omitir),
// isCustomQuote=true, status inicial AWAITING_QUOTE sem reservar pts.
export const createRemapOrderSchema = z
  .object({
    serviceId: z.string().uuid().nullable().optional(),
    carId: z.string().uuid({ message: 'Cadastre um carro antes de abrir pedido' }),
    isCustomQuote: z.boolean().default(false),
    technicalData: remapTechnicalDataSchema.default({}),
  })
  .refine(
    (data) => data.isCustomQuote || Boolean(data.serviceId),
    {
      message: 'serviceId obrigatório quando isCustomQuote=false',
      path: ['serviceId'],
    },
  )
  .refine(
    (data) => data.isCustomQuote || (data.technicalData.description?.length ?? 0) === 0
      ? true
      : true, // descrição sempre permitida
    { message: 'descrição opcional', path: ['technicalData', 'description'] },
  )

export type CreateRemapOrderBody = z.infer<typeof createRemapOrderSchema>

// Admin envia orçamento pra pedido custom.
export const remapQuoteSchema = z.object({
  pointsProposed: z.number().int().positive().max(50_000),
  description: z.string().trim().max(2000).optional(),
})

export type RemapQuoteBody = z.infer<typeof remapQuoteSchema>

// Cliente aceita ou recusa orçamento.
export const acceptQuoteSchema = z.object({
  accept: z.boolean(),
})

export type AcceptQuoteBody = z.infer<typeof acceptQuoteSchema>

// Cancelamento de RemapOrder. Lógica de saldo varia por status no backend.
export const cancelRemapOrderSchema = z.object({
  reason: z.string().trim().max(500).optional(),
})

export type CancelRemapOrderBody = z.infer<typeof cancelRemapOrderSchema>
