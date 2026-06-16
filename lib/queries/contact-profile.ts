import { createClient } from '@/lib/supabase/server'
import { deriveContactStatus, type ContactStatus } from '@/lib/rules/contact-status'
import type { DealStage } from '@/lib/rules/deal-stage'

export type ProfileDeal = {
  id: string
  title: string
  stage: DealStage
  estimatedValue: number | null
  nextAction: string | null
  lostReason: string | null
  closedAt: string | null
  projectId: string | null
  projectName: string | null
  projectStatus: string | null
}

export type ProfileActivity = {
  id: string
  type: string
  content: string
  occurredAt: string | null
}

export type ProfileDiagnostic = {
  id: string
  context: string | null
  problems: string | null
  opportunities: string | null
  proposedSolution: string | null
  notes: string | null
  createdAt: string | null
}

export type ProfileContract = {
  id: string
  name: string
  kind: string
  status: string
  monthlyValue: number | null
}

export type ContactProfile = {
  id: string
  name: string
  segment: string | null
  city: string | null
  contactName: string | null
  contactPhone: string | null
  contactEmail: string | null
  origin: string | null
  notes: string | null
  status: ContactStatus
  deals: ProfileDeal[]
  activities: ProfileActivity[]
  diagnostics: ProfileDiagnostic[]
  contracts: ProfileContract[]
}

const ACTIVE_STAGES: DealStage[] = [
  'prospect', 'lead', 'diagnostico', 'oportunidade', 'escopo', 'proposta', 'negociacao',
]

type Raw = {
  id: string
  name: string
  segment: string | null
  city: string | null
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  origin: string | null
  notes: string | null
  deals: {
    id: string
    title: string
    stage: DealStage
    estimated_value: number | null
    next_action: string | null
    lost_reason: string | null
    closed_at: string | null
    created_at: string
    projects: { id: string; name: string; status: string }[]
  }[]
  activities: { id: string; type: string; content: string; occurred_at: string | null }[]
  diagnostics: {
    id: string
    context: string | null
    problems: string | null
    opportunities: string | null
    proposed_solution: string | null
    notes: string | null
    created_at: string | null
  }[]
  contracts: { id: string; name: string; kind: string; status: string; monthly_value: number | null }[]
}

/** Carrega o perfil completo de um contato (header + 6 seções de 03-telas). */
export async function getContactProfile(id: string): Promise<ContactProfile | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('companies')
    .select(
      `
      id, name, segment, city, contact_name, contact_phone, contact_email, origin, notes,
      deals ( id, title, stage, estimated_value, next_action, lost_reason, closed_at, created_at,
               projects ( id, name, status ) ),
      activities ( id, type, content, occurred_at ),
      diagnostics ( id, context, problems, opportunities, proposed_solution, notes, created_at ),
      contracts ( id, name, kind, status, monthly_value )
    `,
    )
    .eq('id', id)
    .single()

  if (error || !data) return null
  const c = data as unknown as Raw

  const deals = [...c.deals].sort((a, b) => b.created_at.localeCompare(a.created_at))
  const projects = deals.flatMap((d) => d.projects)

  const status = deriveContactStatus(
    deals.map((d) => ({ stage: d.stage })),
    projects.map((p) => ({ status: p.status })),
    c.contracts.map((ct) => ({ status: ct.status })),
  )

  return {
    id: c.id,
    name: c.name,
    segment: c.segment,
    city: c.city,
    contactName: c.contact_name,
    contactPhone: c.contact_phone,
    contactEmail: c.contact_email,
    origin: c.origin,
    notes: c.notes,
    status,
    deals: deals.map((d) => {
      const p = d.projects[0] ?? null
      return {
        id: d.id,
        title: d.title,
        stage: d.stage,
        estimatedValue: d.estimated_value,
        nextAction: d.next_action,
        lostReason: d.lost_reason,
        closedAt: d.closed_at,
        projectId: p?.id ?? null,
        projectName: p?.name ?? null,
        projectStatus: p?.status ?? null,
      }
    }),
    activities: [...c.activities]
      .sort((a, b) => (b.occurred_at ?? '').localeCompare(a.occurred_at ?? ''))
      .map((a) => ({ id: a.id, type: a.type, content: a.content, occurredAt: a.occurred_at })),
    diagnostics: [...c.diagnostics]
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
      .map((d) => ({
        id: d.id,
        context: d.context,
        problems: d.problems,
        opportunities: d.opportunities,
        proposedSolution: d.proposed_solution,
        notes: d.notes,
        createdAt: d.created_at,
      })),
    contracts: c.contracts.map((ct) => ({
      id: ct.id,
      name: ct.name,
      kind: ct.kind,
      status: ct.status,
      monthlyValue: ct.monthly_value,
    })),
  }
}

/** O negócio ativo (no funil) do contato, se houver. */
export function activeDeal(profile: ContactProfile): ProfileDeal | null {
  return profile.deals.find((d) => ACTIVE_STAGES.includes(d.stage)) ?? null
}
