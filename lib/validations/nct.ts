import { z } from "zod"

export const narrativeSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  purpose: z.string().optional().nullable(),
  dri_id: z.string().uuid().optional().nullable(),
  status: z.enum(["ativa", "concluida", "arquivada"]).default("ativa"),
})

export type NarrativeInput = z.infer<typeof narrativeSchema>

export const commitmentSchema = z.object({
  narrative_id: z.string().uuid("ID da narrativa é obrigatório"),
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional().nullable(),
  type: z.enum(["think_it", "build_it", "launch_it", "quantitativo"]),
  status: z.enum(["em_andamento", "cumprido", "nao_cumprido"]).default("em_andamento"),
  progress: z.coerce.number().int().min(0).max(100).default(0),
  confidence: z.enum(["baixa", "media", "alta"]).default("media"),
  dri_id: z.string().uuid().optional().nullable(),
  metric_target: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.type === 'quantitativo' && (!data.metric_target || data.metric_target.trim() === '')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Meta quantitativa é obrigatória para este tipo", path: ["metric_target"] })
  }
})

export type CommitmentInput = z.infer<typeof commitmentSchema>

export const checkinSchema = z.object({
  commitment_id: z.string().uuid(),
  progress: z.coerce.number().int().min(0).max(100),
  confidence: z.enum(["baixa", "media", "alta"]),
  comment: z.string().optional().nullable(),
  author_id: z.string().uuid().optional().nullable(),
})

export type CheckinInput = z.infer<typeof checkinSchema>
