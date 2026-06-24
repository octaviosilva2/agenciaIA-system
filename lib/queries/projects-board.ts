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

/** Projeto elegível para receber um contrato de manutenção (tela /manutencao). */
export type ContractProjectOption = {
  projectId: string
  dealId: string | null
  projectName: string
  company: string
}

type RawEligibleProject = {
  id: string
  name: string
  deal_id: string | null
  company: { name: string } | { name: string }[] | null
  deal: { stage: string } | { stage: string }[] | null
  contracts: { status: string; archived_at: string | null }[] | null
}

/**
 * Projetos de negócios fechados que ainda NÃO têm contrato de manutenção ativo.
 * Alimenta o "Nova manutenção" — selecionar o projeto e criar o contrato.
 */
export async function getProjectsForContract(): Promise<ContractProjectOption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select(
      `
      id, name, deal_id,
      company:companies ( name ),
      deal:deals ( stage ),
      contracts ( status, archived_at )
    `,
    )
    .order('name', { ascending: true })

  if (error) throw new Error(`Falha ao carregar projetos: ${error.message}`)

  const projects = (data ?? []) as unknown as RawEligibleProject[]

  return projects
    .filter((p) => {
      const closed = one(p.deal)?.stage === 'fechado'
      const hasActive = (p.contracts ?? []).some(
        (c) => c.status === 'ativo' && c.archived_at == null,
      )
      return closed && !hasActive
    })
    .map((p) => ({
      projectId: p.id,
      dealId: p.deal_id,
      projectName: p.name,
      company: one(p.company)?.name ?? '—',
    }))
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

/** Visões da tela de Manutenção: status (ativo/inativo) ou a lixeira (arquivados). */
export type MaintenanceView = 'ativos' | 'inativos' | 'arquivados'

/**
 * Contratos de manutenção por visão.
 * - `ativos`/`inativos`: filtram por status (ativo/encerrado), fora da lixeira.
 * - `arquivados`: a lixeira reversível (archived_at not null), de qualquer status.
 */
export async function getMaintenanceBoard(
  view: MaintenanceView = 'ativos',
): Promise<MaintenanceItem[]> {
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

  if (view === 'arquivados') {
    query = query.not('archived_at', 'is', null)
  } else {
    query = query.is('archived_at', null).eq('status', view === 'ativos' ? 'ativo' : 'encerrado')
  }

  // Fila de contatos: ordena por próximo contato (mais cedo/atrasado primeiro);
  // contratos sem data definida vão para o fim.
  const { data, error } = await query.order('next_contact_date', {
    ascending: true,
    nullsFirst: false,
  })

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
