'use server'

import { revalidatePath } from 'next/cache'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { nextMonthlyDueDate } from '@/lib/rules/task-recurrence'
import type { ActionState } from '@/lib/actions/action-state'
import type { Database } from '@/lib/supabase/types'

type TaskStatus = Database['public']['Enums']['task_status']
type TaskPriority = Database['public']['Enums']['task_priority']
type TaskRecurrence = Database['public']['Enums']['task_recurrence']

/** Campos editáveis de uma tarefa vindos do dialog (espelha TaskDraft do client). */
export type TaskInput = {
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  dueDate: string | null
  recurrence: TaskRecurrence
  recurrenceDay: number | null
}

type SupabaseServer = Awaited<ReturnType<typeof createClient>>

/**
 * Gera a PRÓXIMA ocorrência de uma tarefa mensal ao concluí-la: nova tarefa em
 * 'todo' (a fazer), vencendo no próximo dia configurado. A concluída fica no
 * histórico. Só é chamada na transição para 'done'.
 */
async function spawnNextOccurrence(
  supabase: SupabaseServer,
  contractId: string,
  src: { title: string; description: string | null; priority: TaskPriority; dueDate: string | null; recurrenceDay: number },
) {
  const base = src.dueDate ?? format(new Date(), 'yyyy-MM-dd')
  const nextDue = nextMonthlyDueDate(base, src.recurrenceDay)
  await supabase.from('tasks').insert({
    title: src.title,
    description: src.description,
    priority: src.priority,
    area: 'operacional',
    contract_id: contractId,
    status: 'todo',
    due_date: nextDue,
    recurrence: 'monthly',
    recurrence_day: src.recurrenceDay,
  })
}

/** Cria uma tarefa de manutenção vinculada ao contrato. */
export async function createMaintenanceTask(
  contractId: string,
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
      contract_id: contractId,
      due_date: input.dueDate,
      recurrence: input.recurrence,
      recurrence_day: input.recurrence === 'monthly' ? input.recurrenceDay : null,
    })
    .select('id')
    .single()

  if (error || !data) return { success: false, message: `Erro ao criar tarefa: ${error?.message ?? ''}` }

  revalidatePath(`/manutencao/${contractId}`)
  return { success: true, message: 'Tarefa criada.', id: (data as { id: string }).id }
}

/** Edita uma tarefa de manutenção; gera a próxima ocorrência se virar concluída. */
export async function updateMaintenanceTask(
  contractId: string,
  id: string,
  input: TaskInput,
): Promise<ActionState> {
  if (!input.title.trim()) return { success: false, message: 'Informe um título.' }

  const supabase = await createClient()
  const { data: prev } = await supabase.from('tasks').select('status').eq('id', id).single()
  const wasDone = (prev as { status: TaskStatus } | null)?.status === 'done'

  const { error } = await supabase
    .from('tasks')
    .update({
      title: input.title.trim(),
      description: input.description,
      status: input.status,
      priority: input.priority,
      due_date: input.dueDate,
      recurrence: input.recurrence,
      recurrence_day: input.recurrence === 'monthly' ? input.recurrenceDay : null,
    })
    .eq('id', id)

  if (error) return { success: false, message: `Erro ao salvar tarefa: ${error.message}` }

  if (!wasDone && input.status === 'done' && input.recurrence === 'monthly' && input.recurrenceDay) {
    await spawnNextOccurrence(supabase, contractId, {
      title: input.title.trim(),
      description: input.description,
      priority: input.priority,
      dueDate: input.dueDate,
      recurrenceDay: input.recurrenceDay,
    })
  }

  revalidatePath(`/manutencao/${contractId}`)
  return { success: true, message: 'Tarefa atualizada.' }
}

/** Move uma tarefa de coluna (status); gera a próxima ocorrência se virar concluída. */
export async function moveMaintenanceTask(
  contractId: string,
  id: string,
  status: TaskStatus,
): Promise<ActionState> {
  const supabase = await createClient()
  const { data: task } = await supabase
    .from('tasks')
    .select('status, title, description, priority, due_date, recurrence, recurrence_day')
    .eq('id', id)
    .single()

  const t = task as {
    status: TaskStatus
    title: string
    description: string | null
    priority: TaskPriority
    due_date: string | null
    recurrence: TaskRecurrence
    recurrence_day: number | null
  } | null
  const wasDone = t?.status === 'done'

  const { error } = await supabase.from('tasks').update({ status }).eq('id', id)
  if (error) return { success: false, message: `Erro ao mover tarefa: ${error.message}` }

  if (t && !wasDone && status === 'done' && t.recurrence === 'monthly' && t.recurrence_day) {
    await spawnNextOccurrence(supabase, contractId, {
      title: t.title,
      description: t.description,
      priority: t.priority,
      dueDate: t.due_date,
      recurrenceDay: t.recurrence_day,
    })
  }

  revalidatePath(`/manutencao/${contractId}`)
  return { success: true, message: 'Tarefa movida.' }
}

/** Exclui uma tarefa de manutenção. */
export async function deleteMaintenanceTask(contractId: string, id: string): Promise<ActionState> {
  const supabase = await createClient()
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) return { success: false, message: `Erro ao excluir tarefa: ${error.message}` }

  revalidatePath(`/manutencao/${contractId}`)
  return { success: true, message: 'Tarefa excluída.' }
}

/** Arquiva uma tarefa de manutenção (some do kanban ativo; reversível). */
export async function archiveMaintenanceTask(contractId: string, id: string): Promise<ActionState> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { success: false, message: `Erro ao arquivar tarefa: ${error.message}` }

  revalidatePath(`/manutencao/${contractId}`)
  return { success: true, message: 'Tarefa arquivada.' }
}

/** Reativa (desarquiva) uma tarefa de manutenção. */
export async function unarchiveMaintenanceTask(contractId: string, id: string): Promise<ActionState> {
  const supabase = await createClient()
  const { error } = await supabase.from('tasks').update({ archived_at: null }).eq('id', id)
  if (error) return { success: false, message: `Erro ao reativar tarefa: ${error.message}` }

  revalidatePath(`/manutencao/${contractId}`)
  return { success: true, message: 'Tarefa reativada.' }
}
