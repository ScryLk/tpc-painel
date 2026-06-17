import { z } from 'zod'

export const userRoleSchema = z.enum(['CUSTOMER', 'STAFF', 'ADMIN'])
export type UserRole = z.infer<typeof userRoleSchema>

// CPF (11 dígitos) ou CNPJ (14). Aceita formatado ou só dígitos no input,
// normalizamos pra só dígitos antes do .min/.max.
const cpfCnpjValidator = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ''))
  .refine((v) => v.length === 11 || v.length === 14, {
    message: 'CPF deve ter 11 dígitos ou CNPJ 14 dígitos',
  })

// GET /admin/users query.
export const listUsersQuerySchema = z.object({
  // Busca livre por nome, email ou CPF/CNPJ (ILIKE em qualquer um).
  q: z.string().trim().max(120).optional(),
  role: userRoleSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().uuid().optional(),
  // Por default lista só ativos. Admin pode incluir deletados pra audit.
  includeDeleted: z
    .union([z.literal('true'), z.literal('false'), z.boolean()])
    .optional()
    .transform((v) => v === true || v === 'true'),
})

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>

// PATCH /admin/users/:id (body parcial — só envia o que muda).
export const updateUserAdminSchema = z
  .object({
    name: z.string().trim().min(2, 'Nome muito curto').max(200).optional(),
    phone: z
      .string()
      .trim()
      .max(40)
      .nullable()
      .optional()
      .transform((v) => (v === '' ? null : v)),
    cpfCnpj: cpfCnpjValidator
      .nullable()
      .optional()
      .or(z.literal('').transform(() => null)),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.phone !== undefined ||
      data.cpfCnpj !== undefined,
    { message: 'Pelo menos um campo deve ser enviado' },
  )

export type UpdateUserAdminBody = z.infer<typeof updateUserAdminSchema>

// PATCH /admin/users/:id/role (admin-only).
export const updateUserRoleSchema = z.object({
  role: userRoleSchema,
})

export type UpdateUserRoleBody = z.infer<typeof updateUserRoleSchema>
