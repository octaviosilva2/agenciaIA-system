'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { STRATEGY_CONTENT_SCHEMAS } from '@/lib/validations/strategy'
import type { ActionState } from '@/lib/actions/action-state'
import type { StrategyBlock } from '@/lib/queries/strategy'

/**
 * Atualiza SÓ o `content` de um bloco estratégico existente (não cria nem
 * exclui — os 5 blocos são fixos). Valida o shape do content conforme o kind
 * (zod) antes de persistir. O filtro por kind trava o UPDATE no bloco certo.
 */
export async function updateStrategyBlock(block: StrategyBlock): Promise<ActionState> {
  const schema = STRATEGY_CONTENT_SCHEMAS[block.kind]
  const parsed = schema.safeParse(block.content)
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Conteúdo inválido.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('strategy_blocks')
    .update({ content: parsed.data, updated_at: new Date().toISOString() })
    .eq('id', block.id)
    .eq('kind', block.kind)

  if (error) return { success: false, message: `Erro: ${error.message}` }

  revalidatePath('/estrategia')
  return { success: true, message: 'Bloco atualizado.' }
}
