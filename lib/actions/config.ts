'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionState } from '@/lib/actions/action-state'
import {
  passwordSchema,
  profileNameSchema,
  staleDealDaysSchema,
  taxRateSchema,
  updateProfileNameSchema,
} from '@/lib/validations/config'

/** Achata os erros de campo do zod (flatten) para o formato de ActionState. */
type FieldErrors = Record<string, string[]>

/**
 * Atualiza o nome de exibição do PRÓPRIO usuário logado.
 * userId vem sempre do servidor (auth.getUser()), nunca do formData.
 */
export async function updateOwnProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = profileNameSchema.safeParse({ name: formData.get('name') })
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors as FieldErrors
    return { success: false, message: 'O nome não pode ficar vazio.', errors }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'Sessão expirada.' }

  const { error } = await supabase
    .from('profiles')
    .update({ name: parsed.data.name })
    .eq('id', user.id)
  if (error) return { success: false, message: 'Não foi possível salvar o nome.' }

  revalidatePath('/config')
  return { success: true, message: 'Nome atualizado.' }
}

/**
 * Troca a senha do usuário logado.
 * Reautentica com a senha atual antes de trocar (impede troca por sessão sequestrada).
 * Usa updateUser (anon key, própria sessão) — nunca admin/service_role.
 */
export async function updatePassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  })
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors as FieldErrors
    return { success: false, message: 'Verifique os campos de senha.', errors }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return { success: false, message: 'Sessão expirada.' }

  // Reautenticação: confirma a senha atual com o email do usuário logado.
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  })
  if (signInError) return { success: false, message: 'Senha atual incorreta.' }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword })
  if (error) return { success: false, message: 'Não foi possível alterar a senha.' }

  // Sem revalidatePath — não há dado de banco refletido na tela.
  return { success: true, message: 'Senha alterada.' }
}

/**
 * Busca o id da linha única de org_settings (singleton).
 * Mais explícito e seguro do que filtro frágil no update.
 */
async function getOrgSettingsId(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string | null> {
  const { data, error } = await supabase.from('org_settings').select('id').single()
  if (error || !data) return null
  return (data as { id: string }).id
}

/** Atualiza a alíquota de imposto (org_settings.tax_rate). */
export async function updateTaxRate(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = taxRateSchema.safeParse({ tax_rate: formData.get('tax_rate') })
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors as FieldErrors
    return { success: false, message: 'Alíquota inválida.', errors }
  }

  const supabase = await createClient()
  const id = await getOrgSettingsId(supabase)
  if (!id) return { success: false, message: 'Não foi possível salvar a alíquota.' }

  const { error } = await supabase
    .from('org_settings')
    .update({ tax_rate: parsed.data.tax_rate })
    .eq('id', id)
  if (error) return { success: false, message: 'Não foi possível salvar a alíquota.' }

  revalidatePath('/config')
  return { success: true, message: 'Alíquota salva.' }
}

/** Atualiza o prazo de deal parado (org_settings.stale_deal_days). */
export async function updateStaleDealDays(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = staleDealDaysSchema.safeParse({
    stale_deal_days: formData.get('stale_deal_days'),
  })
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors as FieldErrors
    return { success: false, message: 'Valor inválido.', errors }
  }

  const supabase = await createClient()
  const id = await getOrgSettingsId(supabase)
  if (!id) return { success: false, message: 'Não foi possível salvar o parâmetro.' }

  const { error } = await supabase
    .from('org_settings')
    .update({ stale_deal_days: parsed.data.stale_deal_days })
    .eq('id', id)
  if (error) return { success: false, message: 'Não foi possível salvar o parâmetro.' }

  revalidatePath('/config')
  return { success: true, message: 'Parâmetro salvo.' }
}

/**
 * Ativa/inativa um membro (profiles.active). Argumentos posicionais
 * (padrão setContractStatus). `active` é o NOVO valor desejado.
 * Auto-inativação NÃO é bloqueada no servidor nesta versão (só na UI) — limitação conhecida.
 */
export async function toggleProfileActive(
  id: string,
  active: boolean,
): Promise<ActionState> {
  const supabase = await createClient()
  const { error } = await supabase.from('profiles').update({ active }).eq('id', id)
  if (error) return { success: false, message: 'Não foi possível atualizar o membro.' }

  revalidatePath('/config')
  return { success: true, message: active ? 'Membro ativado.' : 'Membro desativado.' }
}

/** Edita o nome de um membro da equipe (profiles.name). Nome vazio é bloqueado. */
export async function updateProfileName(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateProfileNameSchema.safeParse({
    id: formData.get('id'),
    name: formData.get('name'),
  })
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors as FieldErrors
    return { success: false, message: 'O nome não pode ficar vazio.', errors }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ name: parsed.data.name })
    .eq('id', parsed.data.id)
  if (error) return { success: false, message: 'Não foi possível salvar o nome.' }

  revalidatePath('/config')
  return { success: true, message: 'Nome atualizado.' }
}
