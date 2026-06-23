import { z } from 'zod'

/** Nome de exibição — usado no perfil próprio e na edição de membro. */
export const profileNameSchema = z.object({
  name: z.string().trim().min(1, 'O nome não pode ficar vazio.'),
})

/** Troca de senha: senha atual + nova + confirmação (devem coincidir). */
export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual.'),
    newPassword: z.string().min(6, 'A nova senha precisa ter ao menos 6 caracteres.'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
  })

/** Alíquota de imposto (org_settings.tax_rate) — 0 a 100. */
export const taxRateSchema = z.object({
  tax_rate: z.coerce.number().min(0, 'Mínimo 0.').max(100, 'Máximo 100.'),
})

/** Taxa de maquininha (org_settings.card_fee_rate) — 0 a 100. */
export const cardFeeRateSchema = z.object({
  card_fee_rate: z.coerce.number().min(0, 'Mínimo 0.').max(100, 'Máximo 100.'),
})

/** Dias para considerar um deal parado (org_settings.stale_deal_days) — inteiro ≥ 1. */
export const staleDealDaysSchema = z.object({
  stale_deal_days: z.coerce.number().int('Use um número inteiro.').min(1, 'Mínimo 1 dia.'),
})

/** Edição de nome de um membro da equipe — id valida o alvo. */
export const updateProfileNameSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, 'O nome não pode ficar vazio.'),
})

export type ProfileNameInput = z.infer<typeof profileNameSchema>
export type PasswordInput = z.infer<typeof passwordSchema>
export type TaxRateInput = z.infer<typeof taxRateSchema>
export type CardFeeRateInput = z.infer<typeof cardFeeRateSchema>
export type StaleDealDaysInput = z.infer<typeof staleDealDaysSchema>
export type UpdateProfileNameInput = z.infer<typeof updateProfileNameSchema>
