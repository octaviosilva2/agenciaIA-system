'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { companySchema } from '@/lib/validations/company'
import type { ActionState } from '@/lib/actions/action-state'

/** Lê um campo de texto do FormData: string vazia → null. */
function field(fd: FormData, key: string): string | null {
  const v = fd.get(key)
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t === '' ? null : t
}

/**
 * Cria um novo contato (companies). Origem em texto livre.
 * Fluxo padrão: zod → Supabase server client → revalidatePath.
 */
export async function createContact(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const raw = {
    // name vai como string (mesmo vazia) para acionar a mensagem do zod
    name: typeof formData.get('name') === 'string' ? (formData.get('name') as string).trim() : '',
    segment: field(formData, 'segment'),
    city: field(formData, 'city'),
    contact_name: field(formData, 'contact_name'),
    contact_phone: field(formData, 'contact_phone'),
    contact_email: field(formData, 'contact_email'),
    origin: field(formData, 'origin'),
    notes: field(formData, 'notes'),
  }

  const parsed = companySchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      message: 'Verifique os campos destacados.',
      errors: parsed.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()
  const { data: company, error } = await supabase
    .from('companies')
    .insert({
      ...parsed.data,
      // string vazia de e-mail (caso do .or(literal(""))) vira null no banco
      contact_email: parsed.data.contact_email || null,
    })
    .select('id')
    .single()

  if (error || !company) {
    return { success: false, message: `Erro ao salvar: ${error?.message ?? ''}` }
  }

  // O contato entra direto no funil em Prospect (não existe estado "Contato" solto).
  const companyId = (company as { id: string }).id
  const { data: deal, error: dealErr } = await supabase
    .from('deals')
    .insert({
      company_id: companyId,
      title: parsed.data.name,
      stage: 'prospect',
    })
    .select('id')
    .single()

  if (dealErr || !deal) {
    return { success: false, message: `Contato criado, mas falhou ao abrir o negócio: ${dealErr?.message ?? ''}` }
  }

  await supabase
    .from('deal_stage_events')
    .insert({ deal_id: (deal as { id: string }).id, stage: 'prospect' })

  revalidatePath('/contatos')
  return { success: true, message: 'Contato criado em Prospect.' }
}
