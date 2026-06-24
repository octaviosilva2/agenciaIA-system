'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { activitySchema } from '@/lib/validations/company'
import { diagnosticSchema } from '@/lib/validations/deal'
import { paymentInstantFromYmd, spYmdFromISO } from '@/lib/date-range'
import type { ActionState } from '@/lib/actions/action-state'

function str(v: FormDataEntryValue | null): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t === '' ? null : t
}

/**
 * Resolve o instante de uma interação a partir da data ('yyyy-MM-dd') escolhida no
 * form. Se for hoje (ou vazia), usa o agora — preserva a HORA real na timeline.
 * Se for uma data passada (retroativa), fixa meio-dia para não cruzar o fuso.
 */
function resolveOccurredAt(ymd: string | null): string | undefined {
  if (!ymd) return undefined
  const todayYmd = spYmdFromISO(new Date().toISOString())
  return ymd === todayYmd ? new Date().toISOString() : paymentInstantFromYmd(ymd)
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
    occurred_at: resolveOccurredAt(str(formData.get('occurred_at'))),
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
    // Omitido (undefined) → DB usa o default now(); preenchido em lançamento retroativo.
    occurred_at: parsed.data.occurred_at,
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
  // Diagnóstico agora é um único campo de texto, gravado em diagnostics.notes.
  const raw = {
    company_id: companyId,
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
