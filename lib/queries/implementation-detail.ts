import { createClient } from '@/lib/supabase/server'
import { getProjectScope, type ProjectScope } from '@/lib/queries/opportunity-detail'
import type { TaskItem } from '@/components/tasks/tasks-kanban'

/** Dados da tela de implementação: escopo/status/prazo (reusa getProjectScope) + tarefas reais. */
export type ImplementationDetailData = ProjectScope & { tasks: TaskItem[] }

type RawTask = {
  id: string
  title: string
  description: string | null
  status: TaskItem['status']
  priority: TaskItem['priority']
  due_date: string | null
  recurrence: 'none' | 'monthly'
  recurrence_day: number | null
}

/**
 * Carrega a tela operacional do projeto pelo projectId: escopo/status/prazo (via
 * getProjectScope) + as tarefas reais da implementação (tasks com project_id,
 * area 'operacional'). Tarefas arquivadas ficam de fora (implementação não arquiva).
 */
export async function getImplementationDetail(
  projectId: string,
): Promise<ImplementationDetailData | null> {
  const scope = await getProjectScope(projectId)
  if (!scope) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, description, status, priority, due_date, recurrence, recurrence_day, archived_at')
    .eq('project_id', projectId)
    .is('archived_at', null)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Falha ao carregar tarefas: ${error.message}`)

  const tasks: TaskItem[] = ((data ?? []) as RawTask[]).map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    dueDate: t.due_date,
    recurrence: t.recurrence,
    recurrenceDay: t.recurrence_day,
  }))

  return { ...scope, tasks }
}
