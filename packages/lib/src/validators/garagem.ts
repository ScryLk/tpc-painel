import { z } from 'zod'

// Tipos de motor aceitos. Bate com Service.motorTypes pra cross-check de
// compatibilidade no catálogo.
export const motorTypeSchema = z.enum([
  'gasoline',
  'turbo',
  'diesel',
  'flex',
  'atmo',
  'hybrid',
])
export type MotorType = z.infer<typeof motorTypeSchema>

// Placa brasileira: Mercosul (LLLNLNN) ou antiga (LLLNNNN), sempre sem hífen
// e em uppercase. Regex permite ambos formatos sem ambiguidade.
const PLATE_REGEX = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/

export const plateSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(PLATE_REGEX, 'Placa inválida. Use Mercosul (ABC1D23) ou antiga (ABC1234).')

const MIN_YEAR = 1980
const currentYear = new Date().getFullYear()

export const createCarSchema = z.object({
  brand: z.string().trim().min(2).max(60),
  model: z.string().trim().min(2).max(60),
  year: z.number().int().min(MIN_YEAR).max(currentYear + 1),
  motorType: motorTypeSchema,
  plate: plateSchema,
  color: z.string().trim().min(2).max(40).optional(),
})

export type CreateCarBody = z.infer<typeof createCarSchema>

export const updateCarSchema = z
  .object({
    color: z.string().trim().min(2).max(40).optional(),
    plate: plateSchema.optional(),
  })
  .refine((data) => data.color !== undefined || data.plate !== undefined, {
    message: 'pelo menos um campo deve ser fornecido (color ou plate)',
  })

export type UpdateCarBody = z.infer<typeof updateCarSchema>

// Re-export pra preservar a superfície atual (`import { normalizePlate } from
// './garagem'`). A implementação canônica vive em `formatters` desde que foi
// generalizada pra outros contextos além de validação.
export { normalizePlate } from '../formatters/index'
