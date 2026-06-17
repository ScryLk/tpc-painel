import { z } from 'zod'

// Algoritmo do dígito verificador do CPF (DV-1 e DV-2).
// Retorna true se os 11 dígitos formam um CPF válido.
export const isValidCpf = (raw: string): boolean => {
  const digits = raw.replace(/\D/g, '')
  if (digits.length !== 11) return false
  if (/^(\d)\1+$/.test(digits)) return false // todos iguais

  const calc = (slice: string, factor: number) => {
    let sum = 0
    for (const d of slice) sum += Number(d) * factor--
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }
  const dv1 = calc(digits.slice(0, 9), 10)
  if (dv1 !== Number(digits[9])) return false
  const dv2 = calc(digits.slice(0, 10), 11)
  return dv2 === Number(digits[10])
}

// Algoritmo do dígito verificador do CNPJ. 14 dígitos.
export const isValidCnpj = (raw: string): boolean => {
  const digits = raw.replace(/\D/g, '')
  if (digits.length !== 14) return false
  if (/^(\d)\1+$/.test(digits)) return false

  const calc = (slice: string, weights: number[]) => {
    const sum = slice.split('').reduce((acc, d, i) => acc + Number(d) * weights[i]!, 0)
    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const w2 = [6, ...w1]
  const dv1 = calc(digits.slice(0, 12), w1)
  if (dv1 !== Number(digits[12])) return false
  const dv2 = calc(digits.slice(0, 13), w2)
  return dv2 === Number(digits[13])
}

export const normalizeCpfCnpj = (raw: string): string => raw.replace(/\D/g, '')

// Formato visual progressivo: a cada dígito digitado, aplica máscara parcial.
// Até 11 dígitos vira CPF (000.000.000-00). 12+ vira CNPJ (00.000.000/0000-00).
export const formatCpfCnpj = (raw: string): string => {
  const d = normalizeCpfCnpj(raw).slice(0, 14)
  if (d.length <= 11) {
    // CPF parcial
    if (d.length <= 3) return d
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
  }
  // CNPJ parcial (12-14 dígitos)
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

const cpfCnpjSchema = z
  .string()
  .trim()
  .transform(normalizeCpfCnpj)
  .refine(
    (d) => d.length === 0 || isValidCpf(d) || isValidCnpj(d),
    { message: 'CPF ou CNPJ inválido' },
  )

const addressSchema = z.object({
  cep: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => v.length === 8, { message: 'CEP precisa ter 8 dígitos' }),
  street: z.string().trim().min(1).max(120),
  number: z.string().trim().min(1).max(20),
  complement: z.string().trim().max(60).optional(),
  neighborhood: z.string().trim().min(1).max(80),
  city: z.string().trim().min(1).max(80),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .length(2, 'UF deve ter 2 letras'),
})

export type Address = z.infer<typeof addressSchema>

// PATCH /me/profile body. Tudo opcional individualmente; address pode vir
// como null pra remover, ou objeto completo pra criar/atualizar.
export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    phone: z
      .string()
      .trim()
      .transform((v) => v.replace(/\s+/g, ''))
      .refine((v) => v.length === 0 || /^\+?\d{10,15}$/.test(v), {
        message: 'Telefone inválido. Use 10-15 dígitos (com ou sem +).',
      })
      .optional(),
    cpfCnpj: z.union([cpfCnpjSchema, z.literal('')]).optional(),
    address: z.union([addressSchema, z.null()]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'Pelo menos um campo precisa ser informado',
  })

export type UpdateProfileBody = z.infer<typeof updateProfileSchema>
