import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'

type Enums = Database['public']['Enums']

// =====================================================================
// Tipo (contrato da UI) — movido de lib/mock/tasks.ts, mesmo nome e shape.
// É a MESMA entidade `tasks` da Implementação/Manutenção; aqui o board global
// expõe mais campos no card (assignee, impacto×esforço, vínculos).
// =====================================================================

/** Tarefa do board global (subconjunto da tabela `tasks`). */
export type ManagedTask = {
  id: string
  title: string
  description: string | null
  status: Enums['task_status']
  priority: Enums['task_priority']
  area: Enums['task_area']
  assignee_id: string | null
  project_id: string | null
  deal_id: string | null
  company_id: string | null
  commitment_id: string | null
  due_date: string | null // ISO yyyy-MM-dd
  impact: Enums['level_scale'] | null
  effort: Enums['level_scale'] | null
}

/** Filtros do board (todos opcionais; ausente = sem filtro naquele eixo). */
export type ManagedTaskFilters = {
  projectId?: string | null
  commitmentId?: string | null
  area?: Enums['task_area'] | null
  assigneeId?: string | null
  priority?: Enums['task_priority'] | null
}

const TASK_COLS =
  'id, title, description, status, priority, area, assignee_id, project_id, deal_id, company_id, commitment_id, due_date, impact, effort'

/**
 * Tarefas do board global (tela /tarefas) — só as ativas (não arquivadas).
 * Aceita filtros por projeto/compromisso/área/pessoa/prioridade; também serve
 * o recorte por compromisso no detalhe do NCT (filtro `commitmentId`).
 */
export async function getManagedTasks(filters: ManagedTaskFilters = {}): Promise<ManagedTask[]> {
  const supabase = await createClient()
  let query = supabase.from('tasks').select(TASK_COLS).is('archived_at', null)

  if (filters.projectId) query = query.eq('project_id', filters.projectId)
  if (filters.commitmentId) query = query.eq('commitment_id', filters.commitmentId)
  if (filters.area) query = query.eq('area', filters.area)
  if (filters.assigneeId) query = query.eq('assignee_id', filters.assigneeId)
  if (filters.priority) query = query.eq('priority', filters.priority)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw new Error(`Falha ao carregar tarefas: ${error.message}`)

  return (data ?? []) as ManagedTask[]
}

/**
 * Rótulos de projeto (id → nome) de TODOS os projetos. Alimenta os chips dos
 * cards e os selects de filtro/atribuição (substitui o PROJECT_LABELS do mock,
 * que era fixo — agora vem do join `projects.name`).
 */
export async function getProjectLabels(): Promise<Record<string, string>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('id, name')
    .order('name', { ascending: true })

  if (error) throw new Error(`Falha ao carregar projetos: ${error.message}`)

  const labels: Record<string, string> = {}
  for (const p of (data ?? []) as { id: string; name: string }[]) labels[p.id] = p.name
  return labels
}
