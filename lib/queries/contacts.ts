import { createClient } from '@/lib/supabase/server'
import { deriveContactStatus, type ContactStatus } from '@/lib/rules/contact-status'
import type { Database } from '@/lib/supabase/types'

type DealStage = Database['public']['Enums']['deal_stage']

/** Estágios ativos do funil (negócio ainda em andamento). */
const ACTIVE_STAGES: DealStage[] = [
  'prospect',
  'lead',
  'diagnostico',
  'oportunidade',
  'escopo',
  'proposta',
  'negociacao',
]

/** Linha da lista de contatos consumida por components/contacts/contacts-view. */
export type ContactRow = {
  id: string
  name: string
  segment: string | null
  city: string | null
  status: ContactStatus // estado derivado (lib/rules/contact-status)
  currentStage: DealStage | null // estágio do deal mais recente (ativo OU terminal)
  activeProject: string | null
  lastActivityAt: string | null
}

// Forma do retorno bruto do Supabase (client não tipado → cast local, sem `any`).
type RawDeal = { id: string; stage: DealStage; created_at: string }
type RawProject = { id: string; name: string; status: string; deal_id: string | null }
type RawContract = { status: string }
type RawActivity = { occurred_at: string | null }
type RawCompany = {
  id: string
  name: string
  segment: string | null
  city: string | null
  deals: RawDeal[]
  projects: RawProject[]
  contracts: RawContract[]
  activities: RawActivity[]
}

/**
 * Carrega os contatos com o estado derivado calculado por contato.
 * O estado é puro (lib/rules) — aqui só montamos os inputs a partir do banco.
 */
export async function getContacts(): Promise<ContactRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('companies')
    .select(
      `
      id, name, segment, city,
      deals ( id, stage, created_at ),
      projects ( id, name, status, deal_id ),
      contracts ( status ),
      activities ( occurred_at )
    `,
    )
    .order('name', { ascending: true })

  if (error) {
    throw new Error(`Falha ao carregar contatos: ${error.message}`)
  }

  const companies = (data ?? []) as RawCompany[]

  return companies.map((c) => {
    // deriveContactStatus assume deals[0] = mais recente.
    const deals = [...c.deals].sort((a, b) => b.created_at.localeCompare(a.created_at))

    const status = deriveContactStatus(
      deals.map((d) => ({ stage: d.stage })),
      c.projects.map((p) => ({ status: p.status })),
      c.contracts.map((ct) => ({ status: ct.status })),
    )

    // Estágio atual = estágio do deal mais recente (ativo OU terminal).
    const currentStage = deals[0]?.stage ?? null

    // Negócio ativo: o deal mais recente que ainda está no funil.
    const activeDeal = deals.find((d) => ACTIVE_STAGES.includes(d.stage)) ?? null

    // Projeto ativo: o vinculado ao deal ativo; senão, um projeto ainda não entregue.
    let activeProject: string | null = null
    if (activeDeal) {
      activeProject = c.projects.find((p) => p.deal_id === activeDeal.id)?.name ?? null
    }
    if (!activeProject) {
      activeProject = c.projects.find((p) => p.status !== 'entregue')?.name ?? null
    }

    const lastActivityAt = c.activities.reduce<string | null>((latest, a) => {
      if (!a.occurred_at) return latest
      return !latest || a.occurred_at > latest ? a.occurred_at : latest
    }, null)

    return {
      id: c.id,
      name: c.name,
      segment: c.segment,
      city: c.city,
      status,
      currentStage,
      activeProject,
      lastActivityAt,
    }
  })
}
