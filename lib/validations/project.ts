import { z } from "zod"

export const projectSchema = z.object({
  company_id: z.string().uuid(),
  deal_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1, "Nome do projeto é obrigatório"),
  status: z.enum(["a_iniciar", "briefing", "desenvolvimento", "revisao", "entregue"]).default("a_iniciar"),
  custom_stages: z.array(z.object({
    id: z.string(),
    name: z.string(),
    done: z.boolean()
  })).optional().nullable(),
  scope_items: z.array(z.object({
    id: z.string(),
    title: z.string(),
    contracted: z.boolean(),
    delivered: z.boolean()
  })).default([]),
  total_value: z.coerce.number().optional().nullable(),
  start_date: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  owner_id: z.string().uuid().optional().nullable(),
  drive_url: z.string().url("URL inválida").optional().nullable().or(z.literal("")),
  notes: z.string().optional().nullable(),
})

export type ProjectInput = z.infer<typeof projectSchema>

export const taskSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional().nullable(),
  status: z.enum(["analisar", "todo", "doing", "impedimento", "done"]).default("todo"),
  priority: z.enum(["urgente", "proximo", "futuro"]).default("proximo"),
  area: z.enum(["gestao", "comercial", "operacional", "financeiro", "sistema"]),
  assignee_id: z.string().uuid().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
  deal_id: z.string().uuid().optional().nullable(),
  company_id: z.string().uuid().optional().nullable(),
  commitment_id: z.string().uuid().optional().nullable(),
  due_date: z.string().optional().nullable(),
  impact: z.enum(["baixo", "medio", "alto"]).optional().nullable(),
  effort: z.enum(["baixo", "medio", "alto"]).optional().nullable(),
})

export type TaskInput = z.infer<typeof taskSchema>
