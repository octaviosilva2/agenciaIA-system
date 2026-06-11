import { z } from "zod"

export const dealSchema = z.object({
  company_id: z.string().uuid("ID do contato é obrigatório"),
  title: z.string().min(1, "Título é obrigatório"),
  stage: z.enum([
    "prospect", "lead", "diagnostico", "oportunidade", "escopo",
    "proposta", "negociacao", "fechado", "perdido",
    "reativar_futuramente", "desqualificado"
  ]).default("prospect"),
  estimated_value: z.coerce.number().optional().nullable(),
  budget: z.string().optional().nullable(),
  urgency: z.enum(["baixa", "media", "alta"]).optional().nullable(),
  decision_maker: z.string().optional().nullable(),
  next_action: z.string().optional().nullable(),
  next_action_date: z.string().optional().nullable(),
  owner_id: z.string().uuid().optional().nullable(),
  has_maintenance: z.boolean().optional().nullable(),
  lost_reason: z.string().optional().nullable(),
  closed_at: z.string().datetime().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.stage === 'perdido' && (!data.lost_reason || data.lost_reason.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Motivo da perda é obrigatório",
      path: ["lost_reason"]
    })
  }
  if (data.stage === 'fechado' && data.has_maintenance == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "É necessário informar se possui manutenção",
      path: ["has_maintenance"]
    })
  }
})

export type DealInput = z.infer<typeof dealSchema>

export const diagnosticSchema = z.object({
  company_id: z.string().uuid(),
  deal_id: z.string().uuid().optional().nullable(),
  context: z.string().optional().nullable(),
  problems: z.string().optional().nullable(),
  opportunities: z.string().optional().nullable(),
  proposed_solution: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export type DiagnosticInput = z.infer<typeof diagnosticSchema>
