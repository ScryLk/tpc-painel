import { z } from 'zod'

export const leadStatusSchema = z.enum(['NEW', 'REPLIED', 'ARCHIVED'])
export type LeadStatus = z.infer<typeof leadStatusSchema>

// POST /leads (público, token-gated). Body que a landing externa envia.
//
// Phone/vehicle/year são opcionais porque a landing pode estar usando form
// curto (só nome + email + mensagem). Year vem como string porque inputs HTML
// padrão entregam string e não vale a pena coerc no schema (admin lê e pronto).
export const createLeadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Nome muito curto')
    .max(120, 'Nome muito longo'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(200, 'Email muito longo')
    .email('Email inválido'),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  vehicle: z.string().trim().max(80).optional().or(z.literal('')),
  year: z.string().trim().max(10).optional().or(z.literal('')),
  message: z
    .string()
    .trim()
    .min(5, 'Mensagem muito curta')
    .max(4000, 'Mensagem muito longa'),
})

export type CreateLeadBody = z.infer<typeof createLeadSchema>

// POST /admin/leads/:id/reply
export const replyToLeadSchema = z.object({
  message: z
    .string()
    .trim()
    .min(10, 'Resposta muito curta')
    .max(4000, 'Resposta muito longa'),
})

export type ReplyToLeadBody = z.infer<typeof replyToLeadSchema>

// GET /admin/leads query.
export const listLeadsQuerySchema = z.object({
  status: leadStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  cursor: z.string().uuid().optional(),
})

export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>
