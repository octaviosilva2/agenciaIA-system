'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionState } from '@/lib/actions/action-state'
import type { ManagedTask } from '@/lib/queries/tasks'
import type { Database } from '@/lib/supabase/types'

type TaskStatus = Database['public']['Enums']['task_status']

/**
 * Campos do board global (tudo da ManagedTask, menos o id).
 * ⚠️ Arquivo SEPARADO de lib/actions/tasks.ts (aquele é 100% manutenção: exige
 * contractId e fixa area='operacional', revalida /manutencao). Aqui a área é
 * livre e o vínculo é projeto/compromisso. Nomes de função distintos de propósito.
 */
export type ManagedTaskInput = Omit<ManagedTask, 'id'>

const TASK_COLS =
  'id, title, description, status, priority, area, assignee_id, project_id, deal_id, company_id, commitment_id, due_date, impact, effort'

/** Monta o payload de insert/update a partir do input do dialog. */
function toRow(input: ManagedTaskInput) {
  return {
    title: input.title.trim(),
    description: input.description,
    status: input.status,
    priority: input.priority,
    area: input.area,
    assignee_id: input.assignee_id,
    project_id: input.project_id,
    deal_id: input.deal_id,
    company_id: input.company_id,
    commitment_id: input.commitment_id,
    due_date: input.due_date,
    impact: input.impact,
    effort: input.effort,
  }
}

/** Revalida o board e, quando a tarefa é vinculada, o detalhe do compromisso. */
function revalidate(commitmentId: string | null | undefined) {
  revalidatePath('/tarefas')
  if (commitmentId) revalidatePath(`/nct/${commitmentId}`)
}

/** Cria uma tarefa no board global; devolve a linha persistida (com id real). */
export async function createManagedTask(
  input: ManagedTaskInput,
): Promise<ActionState & { task?: ManagedTask }> {
  if (!input.title.trim()) return { success: false, message: 'Informe um título.' }

  const supabase = await createClient()
  const { data, error } = await supabase.from('tasks').insert(toRow(input)).select(TASK_COLS).single()

  if (error || !data) {
    return { success: false, message: `Erro ao criar tarefa: ${error?.message ?? ''}` }
  }

  revalidate(input.commitment_id)
  return { success: true, message: 'Tarefa criada.', task: data as ManagedTask }
}

/** Atualiza uma tarefa do board global. */
export async function updateManagedTask(id: string, input: ManagedTaskInput): Promise<ActionState> {
  if (!input.title.trim()) return { success: false, message: 'Informe um título.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ ...toRow(input), updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { success: false, message: `Erro ao salvar tarefa: ${error.message}` }

  revalidate(input.commitment_id)
  return { success: true, message: 'Tarefa atualizada.' }
}

/** Move uma tarefa de coluna (muda só o status). */
export async function moveManagedTask(
  id: string,
  status: TaskStatus,
  commitmentId?: string | null,
): Promise<ActionState> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { success: false, message: `Erro ao mover tarefa: ${error.message}` }

  revalidate(commitmentId)
  return { success: true, message: 'Tarefa movida.' }
}

/** Exclui uma tarefa do board global. */
export async function deleteManagedTask(
  id: string,
  commitmentId?: string | null,
): Promise<ActionState> {
  const supabase = await createClient()
  const { error } = await supabase.from('tasks').delete().eq('id', id)

  if (error) return { success: false, message: `Erro ao excluir tarefa: ${error.message}` }

  revalidate(commitmentId)
  return { success: true, message: 'Tarefa excluída.' }
}
