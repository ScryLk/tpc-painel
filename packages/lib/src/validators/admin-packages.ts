import { z } from 'zod'

const tierSchema = z
  .string()
  .trim()
  .min(2, 'Tier muito curto')
  .max(40, 'Tier muito longo')
  .regex(/^[a-z0-9-]+$/, 'Tier deve ser kebab-case lowercase')

const baseFields = {
  name: z.string().trim().min(2, 'Nome muito curto').max(120),
  points: z.number().int().min(1, 'Pontos deve ser ≥ 1').max(1_000_000),
  priceCents: z
    .number()
    .int()
    .min(1, 'Preço deve ser ≥ R$0,01')
    .max(1_000_000_000),
  bonusPoints: z.number().int().min(0).max(1_000_000),
  bonusPct: z.number().int().min(0).max(100),
  popular: z.boolean(),
  active: z.boolean(),
  sortOrder: z.number().int().min(0).max(10_000),
}

export const createPackageSchema = z.object({
  tier: tierSchema,
  ...baseFields,
})

export type CreatePackageBody = z.infer<typeof createPackageSchema>

// PATCH: campos opcionais, tier imutável. Pelo menos 1 campo obrigatório.
export const updatePackageSchema = z
  .object({
    name: baseFields.name.optional(),
    points: baseFields.points.optional(),
    priceCents: baseFields.priceCents.optional(),
    bonusPoints: baseFields.bonusPoints.optional(),
    bonusPct: baseFields.bonusPct.optional(),
    popular: baseFields.popular.optional(),
    active: baseFields.active.optional(),
    sortOrder: baseFields.sortOrder.optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'Pelo menos um campo deve ser enviado',
  })

export type UpdatePackageBody = z.infer<typeof updatePackageSchema>
