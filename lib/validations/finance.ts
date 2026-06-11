import { z } from "zod"

export const contractSchema = z.object({
  company_id: z.string().uuid(),
  project_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1, "Nome do contrato é obrigatório"),
  kind: z.enum(["mensal", "avulso"]),
  status: z.enum(["ativo", "encerrado"]).default("ativo"),
  monthly_value: z.coerce.number().optional().nullable(),
  min_months: z.coerce.number().int().min(1).optional().nullable(),
  billing_day: z.coerce.number().int().min(1).max(28).optional().nullable(),
  start_date: z.string().min(1, "Data de início é obrigatória"),
  sla: z.string().optional().nullable(),
  next_contact_date: z.string().optional().nullable(),
  contact_frequency_days: z.coerce.number().int().min(1).optional().nullable(),
  notes: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.kind === 'mensal') {
    if (data.monthly_value == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Valor mensal é obrigatório para contrato mensal", path: ["monthly_value"] })
    }
    if (data.min_months == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Mínimo de meses é obrigatório para contrato mensal", path: ["min_months"] })
    }
    if (data.billing_day == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Dia de cobrança é obrigatório para contrato mensal", path: ["billing_day"] })
    }
  }
})

export type ContractInput = z.infer<typeof contractSchema>

export const chargeSchema = z.object({
  company_id: z.string().uuid().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
  contract_id: z.string().uuid().optional().nullable(),
  description: z.string().min(1, "Descrição é obrigatória"),
  kind: z.enum(["setup", "recorrencia", "avulso"]),
  amount: z.coerce.number().min(0.01, "Valor inválido"),
  due_date: z.string().min(1, "Data de vencimento é obrigatória"),
  status: z.enum(["pendente", "pago", "cancelado"]).default("pendente"),
  method: z.enum(["pix", "boleto", "cartao", "transferencia", "outro"]).optional().nullable(),
  paid_at: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.status === 'pago' && !data.paid_at) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Data de pagamento é obrigatória quando status é pago", path: ["paid_at"] })
  }
  if (data.status !== 'pago' && data.paid_at) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Data de pagamento deve ser nula se não estiver pago", path: ["paid_at"] })
  }
})

export type ChargeInput = z.infer<typeof chargeSchema>

export const accountPayableSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória"),
  category: z.enum(["infra", "freela", "ferramentas", "imposto", "outro"]),
  amount: z.coerce.number().min(0.01, "Valor inválido"),
  due_date: z.string().min(1, "Data de vencimento é obrigatória"),
  status: z.enum(["pendente", "pago", "cancelado"]).default("pendente"),
  paid_at: z.string().datetime().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
  supplier: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export type AccountPayableInput = z.infer<typeof accountPayableSchema>
