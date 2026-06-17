import { z } from 'zod'

export const serviceCategorySchema = z.enum([
  'PERFORMANCE',
  'AESTHETIC',
  'CONFIG',
])
export type ServiceCategoryEnum = z.infer<typeof serviceCategorySchema>

const slugSchema = z
  .string()
  .trim()
  .min(2, 'Slug muito curto')
  .max(60, 'Slug muito longo')
  .regex(
    /^[a-z0-9-]+$/,
    'Slug deve ser kebab-case (letras minúsculas, dígitos e hífen)',
  )

const motorTypesSchema = z.array(z.string().trim().min(1).max(60)).max(50)
const supportsSchema = z.array(z.string().trim().min(1).max(60)).max(50)

// ----------------------------------------------------------------------------
// Service (presencial)
// ----------------------------------------------------------------------------

const baseServiceFields = {
  name: z.string().trim().min(2, 'Nome muito curto').max(120),
  description: z.string().trim().min(2, 'Descrição muito curta').max(2000),
  category: serviceCategorySchema,
  pts: z.number().int().min(1, 'Pts deve ser ≥ 1').max(1_000_000),
  priceAvulsoCents: z.number().int().min(0).max(1_000_000_000),
  motorTypes: motorTypesSchema,
  durationDays: z.number().int().min(1).max(30),
  popular: z.boolean(),
  active: z.boolean(),
  sortOrder: z.number().int().min(0).max(10_000),
}

export const createServiceSchema = z.object({
  slug: slugSchema,
  ...baseServiceFields,
})

export type CreateServiceBody = z.infer<typeof createServiceSchema>

// PATCH: todos os campos opcionais. Slug imutável (NÃO inclui).
// O .refine garante que pelo menos UM campo veio (evita PATCH no-op).
export const updateServiceSchema = z
  .object({
    name: baseServiceFields.name.optional(),
    description: baseServiceFields.description.optional(),
    category: baseServiceFields.category.optional(),
    pts: baseServiceFields.pts.optional(),
    priceAvulsoCents: baseServiceFields.priceAvulsoCents.optional(),
    motorTypes: baseServiceFields.motorTypes.optional(),
    durationDays: baseServiceFields.durationDays.optional(),
    popular: baseServiceFields.popular.optional(),
    active: baseServiceFields.active.optional(),
    sortOrder: baseServiceFields.sortOrder.optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'Pelo menos um campo deve ser enviado',
  })

export type UpdateServiceBody = z.infer<typeof updateServiceSchema>

// ----------------------------------------------------------------------------
// RemapService (por arquivo)
// ----------------------------------------------------------------------------

const baseRemapServiceFields = {
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(2).max(2000),
  // Category é string livre no schema atual ('Performance' | 'Aesthetic' |
  // 'Config' | 'Custom'). Aceita qualquer string trimmed, max 60.
  category: z.string().trim().min(1).max(60).nullable(),
  pts: z.number().int().min(1).max(1_000_000),
  priceAvulsoCents: z.number().int().min(0).max(1_000_000_000),
  supports: supportsSchema,
  isCustom: z.boolean(),
  active: z.boolean(),
  sortOrder: z.number().int().min(0).max(10_000),
}

export const createRemapServiceSchema = z.object({
  slug: slugSchema,
  ...baseRemapServiceFields,
})

export type CreateRemapServiceBody = z.infer<typeof createRemapServiceSchema>

export const updateRemapServiceSchema = z
  .object({
    name: baseRemapServiceFields.name.optional(),
    description: baseRemapServiceFields.description.optional(),
    category: baseRemapServiceFields.category.optional(),
    pts: baseRemapServiceFields.pts.optional(),
    priceAvulsoCents: baseRemapServiceFields.priceAvulsoCents.optional(),
    supports: baseRemapServiceFields.supports.optional(),
    isCustom: baseRemapServiceFields.isCustom.optional(),
    active: baseRemapServiceFields.active.optional(),
    sortOrder: baseRemapServiceFields.sortOrder.optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'Pelo menos um campo deve ser enviado',
  })

export type UpdateRemapServiceBody = z.infer<typeof updateRemapServiceSchema>
