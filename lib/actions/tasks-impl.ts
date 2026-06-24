'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionState } from '@/lib/actions/action-state'
import type { TaskInput } from '@/lib/actions/tasks'
import type { Database } from '@/lib/supabase/types'

type TaskStatus = Database['public']['Enums']['task_status']

/**
 * CRUD das tarefas de IMPLEMENTAÇÃO (tabela tasks, area 'operacional', vinculadas
 * por project_id). Nomes e arquivo separados das tarefas de manutenção (contract_id)
 * e das de gestão (tasks-board). Sem recorrência mensal (isso é da manutenção).
 */

/** Cria uma tarefa de implementação vinculada ao projeto. */
export async function createImplementationTask(
  projectId: string,
  input: TaskInput,
): Promise<ActionState & { id?: string }> {
  if (!input.title.trim()) return { success: false, message: 'Informe um título.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: input.title.trim(),
      description: input.description,
      status: input.status,
      priority: input.priority,
      area: 'operacional',
      project_id: projectId,
      due_date: input.dueDate,
      recurrence: 'none',
      recurrence_day: null,
    })
    .select('id')
    .single()

  if (error || !data) return { success: false, message: `Erro ao criar tarefa: ${error?.message ?? ''}` }

  revalidatePath(`/implementacao/${projectId}`)
  return { success: true, message: 'Tarefa criada.', id: (data as { id: string }).id }
}

/** Edita uma tarefa de implementação. */
export async function updateImplementationTask(
  projectId: string,
  id: string,
  input: TaskInput,
): Promise<ActionState> {
  if (!input.title.trim()) return { success: false, message: 'Informe um título.' }

  const supabase = await createClient()
  // Preserva a data de conclusão existente; só marca/limpa na transição de status.
  const { data: prev } = await supabase.from('tasks').select('completed_at').eq('id', id).single()
  const prevCompleted = (prev as { completed_at: string | null } | null)?.completed_at ?? null

  const { error } = await supabase
    .from('tasks')
    .update({
      title: input.title.trim(),
      description: input.description,
      status: input.status,
      priority: input.priority,
      due_date: input.dueDate,
      completed_at: input.status === 'done' ? (prevCompleted ?? new Date().toISOString()) : null,
    })
    .eq('id', id)

  if (error) return { success: false, message: `Erro ao salvar tarefa: ${error.message}` }

  revalidatePath(`/implementacao/${projectId}`)
  return { success: true, message: 'Tarefa atualizada.' }
}

/** Move uma tarefa de implementação de coluna (status). Datas a conclusão ao entrar em 'done'. */
export async function moveImplementationTask(
  projectId: string,
  id: string,
  status: TaskStatus,
): Promise<ActionState> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ status, completed_at: status === 'done' ? new Date().toISOString() : null })
    .eq('id', id)
  if (error) return { success: false, message: `Erro ao mover tarefa: ${error.message}` }

  revalidatePath(`/implementacao/${projectId}`)
  return { success: true, message: 'Tarefa movida.' }
}

/** Exclui uma tarefa de implementação. */
export async function deleteImplementationTask(
  projectId: string,
  id: string,
): Promise<ActionState> {
  const supabase = await createClient()
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) return { success: false, message: `Erro ao excluir tarefa: ${error.message}` }

  revalidatePath(`/implementacao/${projectId}`)
  return { success: true, message: 'Tarefa excluída.' }
}
