import { z } from 'zod'

// Body de campanha — campos comuns ao create e update. Validações são as
// mesmas em ambos, só varia obrigatoriedade.
const subject = z
  .string()
  .trim()
  .min(3, 'Assunto muito curto')
  .max(180, 'Assunto muito longo')

const title = z
  .string()
  .trim()
  .min(3, 'Título muito curto')
  .max(200, 'Título muito longo')

const body = z
  .string()
  .trim()
  .min(10, 'Corpo do email muito curto')
  .max(20_000, 'Corpo muito longo')

const ctaText = z.string().trim().min(1).max(80).nullable()

// URL absoluta. Aceita http/https; rejeita javascript:, etc.
const ctaUrl = z
  .string()
  .trim()
  .url('URL inválida')
  .max(500)
  .refine((u) => u.startsWith('http://') || u.startsWith('https://'), {
    message: 'URL deve começar com http:// ou https://',
  })
  .nullable()

// Cria sempre como DRAFT (status não é editável pelo client — é do server).
export const createMarketingCampaignSchema = z.object({
  subject,
  title,
  body,
  ctaText: ctaText.optional(),
  ctaUrl: ctaUrl.optional(),
})

export type CreateMarketingCampaignBody = z.infer<
  typeof createMarketingCampaignSchema
>

// PATCH: parcial. Só pode editar DRAFT (server gate). Pelo menos 1 campo.
export const updateMarketingCampaignSchema = z
  .object({
    subject: subject.optional(),
    title: title.optional(),
    body: body.optional(),
    ctaText: ctaText.optional(),
    ctaUrl: ctaUrl.optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'Pelo menos um campo deve ser enviado',
  })

export type UpdateMarketingCampaignBody = z.infer<
  typeof updateMarketingCampaignSchema
>
