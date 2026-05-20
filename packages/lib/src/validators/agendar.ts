import { z } from 'zod'

export const arrivalSlotSchema = z.enum(['manha', 'tarde'])
export type ArrivalSlot = z.infer<typeof arrivalSlotSchema>

// Mapeia o slot string do client pra enum do Prisma (MANHA/TARDE).
export const slotToEnum = (slot: ArrivalSlot): 'MANHA' | 'TARDE' =>
  slot === 'manha' ? 'MANHA' : 'TARDE'

export const slotFromEnum = (slot: 'MANHA' | 'TARDE'): ArrivalSlot =>
  slot === 'MANHA' ? 'manha' : 'tarde'

// Date apenas (sem hora) no formato ISO YYYY-MM-DD. Sempre interpretada em
// America/Sao_Paulo no backend.
const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')

export const solicitacaoCreateSchema = z.object({
  serviceId: z.string().uuid(),
  carId: z.string().uuid(),
  date: isoDateSchema,
  arrivalSlot: arrivalSlotSchema,
  observations: z.string().trim().max(500).optional(),
})
export type SolicitacaoCreateBody = z.infer<typeof solicitacaoCreateSchema>

export const solicitacaoCancelSchema = z.object({
  reason: z.string().trim().max(500).optional(),
})
export type SolicitacaoCancelBody = z.infer<typeof solicitacaoCancelSchema>
