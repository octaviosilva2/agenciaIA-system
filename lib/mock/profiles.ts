/**
 * Perfis MOCK (tabela `profiles`) — modo UI-first, sem backend.
 *
 * Usados como DRI/responsável e para os avatares de iniciais nas telas de Gestão
 * (NCT, Tarefas). Nada persiste. Quando o backend chegar, estes tipos viram o
 * contrato que as queries devem respeitar (nomes em snake_case, igual ao schema).
 */

import type { Database } from '@/lib/supabase/types'

/** Subconjunto da tabela `profiles` que a UI de Gestão consome. */
export type Profile = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'id' | 'name' | 'email' | 'active'
>

// IDs fixos para os mocks de NCT/Tarefas referenciarem os mesmos perfis.
export const PROFILE_OCTAVIO = 'p0000000-0000-0000-0000-000000000001'
export const PROFILE_KAUAN = 'p0000000-0000-0000-0000-000000000002'
export const PROFILE_CAIO = 'p0000000-0000-0000-0000-000000000003'
export const PROFILE_MARINA = 'p0000000-0000-0000-0000-000000000004'

/** Equipe mock — base para selects de DRI/responsável e avatares. */
export const MOCK_PROFILES: Profile[] = [
  { id: PROFILE_OCTAVIO, name: 'Octavio Silva', email: 'octavio@agencia.com', active: true },
  { id: PROFILE_KAUAN, name: 'Kauan Costa', email: 'kauan@agencia.com', active: true },
  { id: PROFILE_CAIO, name: 'Caio Ribeiro', email: 'caio@agencia.com', active: true },
  { id: PROFILE_MARINA, name: 'Marina Souza', email: 'marina@agencia.com', active: true },
]

/** Acha um perfil pelo id (ou undefined). Helper de exibição. */
export function findProfile(id: string | null | undefined): Profile | undefined {
  if (!id) return undefined
  return MOCK_PROFILES.find((p) => p.id === id)
}

/** Iniciais (até 2 letras) a partir do nome — para o Avatar (design system §5.5). */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}
