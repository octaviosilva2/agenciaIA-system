'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { activitySchema } from '@/lib/validations/company'
import { diagnosticSchema } from '@/lib/validations/deal'
import type { ActionState } from '@/lib/actions/action-state'

function str(v: FormDataEntryValue | null): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t === '' ? null : t
}

/** Registra uma interação (nota/reunião/ligação…) na timeline do contato. */
export async function createActivity(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const companyId = str(formData.get('company_id'))
  const dealId = str(formData.get('deal_id'))
  const raw = {
    company_id: companyId,
    deal_id: dealId,
    type: str(formData.get('type')) ?? 'nota',
    content: str(formData.get('content')) ?? '',
  }

  const parsed = activitySchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      message: 'Verifique os campos.',
      errors: parsed.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('activities').insert({
    company_id: parsed.data.company_id,
    deal_id: parsed.data.deal_id ?? null,
    type: parsed.data.type,
    content: parsed.data.content,
  })
  if (error) return { success: false, message: `Erro ao salvar: ${error.message}` }

  if (companyId) revalidatePath(`/contatos/${companyId}`)
  if (dealId) revalidatePath(`/projetos/${dealId}`)
  return { success: true, message: 'Interação registrada.' }
}

/** Cria/registra um diagnóstico do contato. */
export async function createDiagnostic(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const companyId = str(formData.get('company_id'))
  const raw = {
    company_id: companyId,
    context: str(formData.get('context')),
    problems: str(formData.get('problems')),
    opportunities: str(formData.get('opportunities')),
    proposed_solution: str(formData.get('proposed_solution')),
    notes: str(formData.get('notes')),
  }

  const parsed = diagnosticSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      message: 'Verifique os campos.',
      errors: parsed.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('diagnostics').insert(parsed.data)
  if (error) return { success: false, message: `Erro ao salvar: ${error.message}` }

  if (companyId) revalidatePath(`/contatos/${companyId}`)
  return { success: true, message: 'Diagnóstico registrado.' }
}
