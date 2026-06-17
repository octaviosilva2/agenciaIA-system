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

function revalidateContact(id: string) {
  revalidatePath('/contatos')
  revalidatePath(`/contatos/${id}`)
}

/** Arquiva um contato (some das listas ativas; reversível). */
export async function archiveContact(id: string): Promise<ActionState> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('companies')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { success: false, message: `Erro ao arquivar: ${error.message}` }
  revalidateContact(id)
  return { success: true, message: 'Contato arquivado.' }
}

/** Reativa (desarquiva) um contato. */
export async function unarchiveContact(id: string): Promise<ActionState> {
  const supabase = await createClient()
  const { error } = await supabase.from('companies').update({ archived_at: null }).eq('id', id)
  if (error) return { success: false, message: `Erro ao reativar: ${error.message}` }
  revalidateContact(id)
  return { success: true, message: 'Contato reativado.' }
}

/**
 * Exclui um contato PERMANENTEMENTE. Cascata do banco apaga deals, projetos,
 * contratos, cobranças, tarefas, diagnósticos e interações vinculados.
 */
export async function deleteContact(id: string): Promise<ActionState> {
  const supabase = await createClient()
  const { error } = await supabase.from('companies').delete().eq('id', id)
  if (error) return { success: false, message: `Erro ao excluir: ${error.message}` }
  revalidatePath('/contatos')
  return { success: true, message: 'Contato excluído permanentemente.' }
}

/** Edita os dados de um contato (mesmo schema do cadastro). */
export async function updateContact(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = formData.get('id')
  if (typeof id !== 'string' || !id) return { success: false, message: 'Contato inválido.' }

  const raw = {
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
  const { error } = await supabase
    .from('companies')
    .update({
      name: parsed.data.name,
      segment: parsed.data.segment,
      city: parsed.data.city,
      contact_name: parsed.data.contact_name,
      contact_phone: parsed.data.contact_phone,
      contact_email: parsed.data.contact_email || null,
      origin: parsed.data.origin,
      notes: parsed.data.notes,
    })
    .eq('id', id)

  if (error) return { success: false, message: `Erro ao salvar: ${error.message}` }
  revalidateContact(id)
  return { success: true, message: 'Contato atualizado.' }
}
