import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'

type ProjectStatus = Database['public']['Enums']['project_status']
type ContractKind = Database['public']['Enums']['contract_kind']
type ContractStatus = Database['public']['Enums']['contract_status']

/** Card da fase Implementação (deal fechado, organizado por project_status). */
export type ImplementationItem = {
  id: string // deal id (mantido para referência)
  projectId: string // link → /implementacao/[projectId] (tela operacional)
  project: string
  company: string
  status: ProjectStatus
  value: number | null
  dueDate: string | null
}

/** Linha da fase Manutenção (contrato ativo). */
export type MaintenanceItem = {
  id: string // contract id
  dealId: string | null // link ao projeto, quando houver
  company: string
  projectName: string | null
  kind: ContractKind
  status: ContractStatus
  monthlyValue: number | null
  nextContactDate: string | null
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

type RawCharge = { amount: number; kind: string; status: string }

/** Soma das cobranças de pagamento (setup/avulso, fora as canceladas). */
function paymentSum(charges: RawCharge[] | null | undefined): number {
  return (charges ?? [])
    .filter((c) => (c.kind === 'setup' || c.kind === 'avulso') && c.status !== 'cancelado')
    .reduce((s, c) => s + (c.amount ?? 0), 0)
}

type RawImplDeal = {
  id: string
  estimated_value: number | null
  company: { name: string } | { name: string }[] | null
  projects: {
    id: string
    name: string
    status: ProjectStatus
    total_value: number | null
    due_date: string | null
    charges: RawCharge[] | null
  }[]
}

/** Projetos em implementação: deals fechados, com o macro-status do projeto. */
export async function getImplementationBoard(): Promise<ImplementationItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('deals')
    .select(
      `
      id, estimated_value,
      company:companies ( name ),
      projects ( id, name, status, total_value, due_date, charges ( amount, kind, status ) )
    `,
    )
    .eq('stage', 'fechado')
    .is('archived_at', null)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Falha ao carregar implementação: ${error.message}`)

  const deals = (data ?? []) as unknown as RawImplDeal[]

  return deals
    .map((d): ImplementationItem | null => {
      const project = d.projects[0]
      if (!project) return null
      const charged = paymentSum(project.charges)
      return {
        id: d.id,
        projectId: project.id,
        project: project.name,
        company: one(d.company)?.name ?? '—',
        status: project.status,
        // Proposta → estimado → soma das cobranças (cobre projeto pago sem proposta).
        value: project.total_value ?? d.estimated_value ?? (charged > 0 ? charged : null),
        dueDate: project.due_date,
      }
    })
    .filter((x): x is ImplementationItem => x !== null)
}

type RawContract = {
  id: string
  kind: ContractKind
  status: ContractStatus
  monthly_value: number | null
  next_contact_date: string | null
  company: { name: string } | { name: string }[] | null
  project: { name: string; deal_id: string | null } | { name: string; deal_id: string | null }[] | null
}

/** Contratos de manutenção ativos. `archived` alterna a visão (ativos × arquivados). */
export async function getMaintenanceBoard(archived = false): Promise<MaintenanceItem[]> {
  const supabase = await createClient()
  let query = supabase
    .from('contracts')
    .select(
      `
      id, kind, status, monthly_value, next_contact_date,
      company:companies ( name ),
      project:projects ( name, deal_id )
    `,
    )
    .eq('status', 'ativo')

  query = archived ? query.not('archived_at', 'is', null) : query.is('archived_at', null)

  const { data, error } = await query.order('start_date', { ascending: false })

  if (error) throw new Error(`Falha ao carregar manutenção: ${error.message}`)

  const contracts = (data ?? []) as unknown as RawContract[]

  return contracts.map((ct) => {
    const project = one(ct.project)
    return {
      id: ct.id,
      dealId: project?.deal_id ?? null,
      company: one(ct.company)?.name ?? '—',
      projectName: project?.name ?? null,
      kind: ct.kind,
      status: ct.status,
      monthlyValue: ct.monthly_value,
      nextContactDate: ct.next_contact_date,
    }
  })
}
