'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionState } from '@/lib/actions/action-state'

function revalidateContract(id: string) {
  revalidatePath('/manutencao')
  revalidatePath(`/manutencao/${id}`)
}

/** Arquiva um contrato de manutenção (some do board ativo; reversível). */
export async function archiveContract(id: string): Promise<ActionState> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('contracts')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { success: false, message: `Erro ao arquivar: ${error.message}` }
  revalidateContract(id)
  return { success: true, message: 'Manutenção arquivada.' }
}

/** Reativa (desarquiva) um contrato de manutenção. */
export async function unarchiveContract(id: string): Promise<ActionState> {
  const supabase = await createClient()
  const { error } = await supabase.from('contracts').update({ archived_at: null }).eq('id', id)
  if (error) return { success: false, message: `Erro ao reativar: ${error.message}` }
  revalidateContract(id)
  return { success: true, message: 'Manutenção reativada.' }
}

/**
 * Exclui um contrato PERMANENTEMENTE. Apaga as tarefas de manutenção vinculadas;
 * as cobranças (charges) ficam preservadas no Financeiro com `contract_id` nulo.
 */
export async function deleteContract(id: string): Promise<ActionState> {
  const supabase = await createClient()
  await supabase.from('tasks').delete().eq('contract_id', id)
  const { error } = await supabase.from('contracts').delete().eq('id', id)
  if (error) return { success: false, message: `Erro ao excluir: ${error.message}` }
  revalidatePath('/manutencao')
  return { success: true, message: 'Manutenção excluída permanentemente.' }
}
