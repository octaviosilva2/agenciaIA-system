import { createClient } from '@/lib/supabase/server'

/** Perfil do próprio usuário logado (Perfil + Segurança). */
export type OwnProfile = { id: string; name: string; email: string }

/** Parâmetros de organização — uma linha única (Financeiro + CRM). */
export type OrgSettingsRow = { tax_rate: number; stale_deal_days: number }

/** Membro da equipe (seção Equipe). */
export type TeamProfile = { id: string; name: string; email: string; active: boolean }

/**
 * Perfil do usuário logado. Se não existir (usuário criado antes do schema),
 * cria a linha automaticamente com o email como nome inicial.
 */
export async function getOwnProfile(user: { id: string; email: string }): Promise<OwnProfile> {
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('profiles')
    .select('id,name,email')
    .eq('id', user.id)
    .maybeSingle()

  if (existing) return existing as OwnProfile

  // Cria o perfil se não existir (sem trigger no Auth)
  const name = user.email.split('@')[0] ?? 'Usuário'
  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: user.id, email: user.email, name, active: true })
    .select('id,name,email')
    .single()

  if (error || !data) {
    throw new Error(`Falha ao criar perfil: ${error?.message ?? 'erro desconhecido'}`)
  }
  return data as OwnProfile
}

/**
 * Parâmetros da organização. A linha sempre existe (seed 0006);
 * ausência é bug → lança. Uma chamada serve Financeiro e CRM.
 */
export async function getOrgSettings(): Promise<OrgSettingsRow> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('org_settings')
    .select('tax_rate,stale_deal_days')
    .single()

  if (error || !data) {
    throw new Error(`Falha ao carregar configurações: ${error?.message ?? 'org_settings ausente'}`)
  }
  return data as OrgSettingsRow
}

/** Lista de membros da equipe, ordenada por nome. Lista vazia é válida. */
export async function getProfiles(): Promise<TeamProfile[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id,name,email,active')
    .order('name', { ascending: true })

  if (error) throw new Error(`Falha ao carregar equipe: ${error.message}`)
  return (data ?? []) as TeamProfile[]
}
