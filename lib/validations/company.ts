import { z } from "zod"

export const companySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  segment: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  contact_name: z.string().optional().nullable(),
  contact_phone: z.string().optional().nullable(),
  contact_email: z.string().email("E-mail inválido").optional().nullable().or(z.literal("")),
  origin: z.string().optional().nullable(),
  owner_id: z.string().uuid("ID de proprietário inválido").optional().nullable(),
  notes: z.string().optional().nullable(),
})

export type CompanyInput = z.infer<typeof companySchema>

export const activitySchema = z.object({
  company_id: z.string().uuid(),
  deal_id: z.string().uuid().optional().nullable(),
  type: z.enum(["nota", "reuniao", "ligacao", "email", "whatsapp", "outro"]),
  content: z.string().min(1, "Conteúdo é obrigatório"),
  occurred_at: z.string().datetime().optional(),
})

export type ActivityInput = z.infer<typeof activitySchema>
