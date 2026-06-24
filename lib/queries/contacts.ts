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
  currentDealId: string | null // deal mais recente (alvo da troca de estágio pelo badge)
  hasProject: boolean // o deal mais recente tem projeto vinculado (regras de transição)
  activeProject: string | null
  lastActivityAt: string | null
  // Campos completos para o dialog de edição (kebab).
  contactName: string | null
  contactPhone: string | null
  contactEmail: string | null
  origin: string | null
  notes: string | null
  // Lista de contatos (company_contacts) para o dialog de edição.
  contacts: { name: string; phone: string }[]
}

// Forma do retorno bruto do Supabase (client não tipado → cast local, sem `any`).
type RawDeal = { id: string; stage: DealStage; created_at: string }
type RawProject = { id: string; name: string; status: string; deal_id: string | null }
type RawContract = { status: string }
type RawActivity = { occurred_at: string | null }
type RawCompanyContact = { name: string; phone: string | null; position: number }
type RawCompany = {
  id: string
  name: string
  segment: string | null
  city: string | null
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  origin: string | null
  notes: string | null
  deals: RawDeal[]
  projects: RawProject[]
  contracts: RawContract[]
  activities: RawActivity[]
  company_contacts: RawCompanyContact[]
}

/**
 * Carrega os contatos com o estado derivado calculado por contato.
 * O estado é puro (lib/rules) — aqui só montamos os inputs a partir do banco.
 */
export async function getContacts(archived = false): Promise<ContactRow[]> {
  const supabase = await createClient()
  let query = supabase
    .from('companies')
    .select(
      `
      id, name, segment, city, contact_name, contact_phone, contact_email, origin, notes,
      deals ( id, stage, created_at ),
      projects ( id, name, status, deal_id ),
      contracts ( status ),
      activities ( occurred_at ),
      company_contacts ( name, phone, position )
    `,
    )

  // Visão ativa (archived_at IS NULL) vs. aba Arquivados (archived_at IS NOT NULL).
  query = archived ? query.not('archived_at', 'is', null) : query.is('archived_at', null)

  const { data, error } = await query.order('name', { ascending: true })

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
    const currentDeal = deals[0] ?? null
    const currentStage = currentDeal?.stage ?? null

    // Projeto vinculado ao deal mais recente — necessário às regras de transição.
    const hasProject = currentDeal
      ? c.projects.some((p) => p.deal_id === currentDeal.id)
      : false

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

    // Contatos ordenados por position; fallback para o par antigo da company.
    const contacts = [...(c.company_contacts ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((ct) => ({ name: ct.name, phone: ct.phone ?? '' }))
    if (contacts.length === 0 && c.contact_name) {
      contacts.push({ name: c.contact_name, phone: c.contact_phone ?? '' })
    }

    return {
      id: c.id,
      name: c.name,
      segment: c.segment,
      city: c.city,
      status,
      currentStage,
      currentDealId: currentDeal?.id ?? null,
      hasProject,
      activeProject,
      lastActivityAt,
      contactName: c.contact_name,
      contactPhone: c.contact_phone,
      contactEmail: c.contact_email,
      origin: c.origin,
      notes: c.notes,
      contacts,
    }
  })
}
