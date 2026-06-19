import { createClient } from '@/lib/supabase/server'
import type { DealStage } from '@/lib/rules/deal-stage'
import type { Database } from '@/lib/supabase/types'

type ProjectStatus = Database['public']['Enums']['project_status']
type ContractKind = Database['public']['Enums']['contract_kind']
type ContractStatus = Database['public']['Enums']['contract_status']
type ChargeKind = Database['public']['Enums']['charge_kind']
type ChargeStatus = Database['public']['Enums']['charge_status']
type ChargeMethod = Database['public']['Enums']['charge_method']

/** Cobrança (parcela) vinculada ao projeto. */
export type ChargeRow = {
  id: string
  description: string
  kind: ChargeKind
  amount: number
  dueDate: string
  status: ChargeStatus
  method: ChargeMethod | null
  hours: number | null // serviços avulsos (manutenção por hora)
  contractId: string | null // distingue avulso de fechamento (null) de avulso de manutenção
}

export type ScopeStatus = 'pendente' | 'em_andamento' | 'entregue'
export type ScopeItem = { id: string; title: string; description: string; status: ScopeStatus }

/** Normaliza item de escopo do banco (suporta formato antigo contracted/delivered). */
function normalizeScopeItem(raw: unknown): ScopeItem {
  if (!raw || typeof raw !== 'object') {
    return { id: '', title: '', description: '', status: 'pendente' }
  }
  const r = raw as Record<string, unknown>
  if (typeof r.status === 'string') {
    const validStatus = ['pendente', 'em_andamento', 'entregue'].includes(r.status)
    return {
      id: String(r.id ?? ''),
      title: String(r.title ?? ''),
      description: String(r.description ?? ''),
      status: validStatus ? (r.status as ScopeStatus) : 'pendente',
    }
  }
  // Formato antigo: contracted/delivered
  return {
    id: String(r.id ?? ''),
    title: String(r.title ?? ''),
    description: '',
    status: r.delivered === true ? 'entregue' : 'pendente',
  }
}

/** Etapa interna customizável da implementação (jsonb projects.custom_stages). */
export type CustomStage = { id: string; name: string; done: boolean }

export type OpportunityActivity = {
  id: string
  type: string
  content: string
  occurredAt: string | null
}

/** Contrato de manutenção vinculado ao projeto (quando existe). */
export type MaintenanceContract = {
  id: string
  kind: ContractKind
  status: ContractStatus
  monthlyValue: number | null
  hourlyRate: number | null // preço/hora (contrato avulso)
  minMonths: number | null
  startDate: string
  nextContactDate: string | null
  billingDay: number | null
  sla: string | null
}

export type OpportunityDetail = {
  dealId: string
  projectId: string | null
  project: string
  stage: DealStage
  archived: boolean
  isClosed: boolean // deal fechado → libera Implementação/Manutenção
  estimatedValue: number | null
  totalValue: number | null // valor da proposta (projects.total_value)
  hasMaintenance: boolean | null
  companyId: string
  company: string
  driveUrl: string | null
  notes: string | null
  scopeItems: ScopeItem[]
  // Prazos e implementação (do projeto)
  startDate: string | null
  dueDate: string | null
  projectStatus: ProjectStatus | null
  customStages: CustomStage[] | null
  // Manutenção
  contract: MaintenanceContract | null
  // Pagamento (cobranças de fechamento: setup/avulso) e entradas de manutenção (recorrencia)
  paymentCharges: ChargeRow[]
  maintenanceCharges: ChargeRow[]
  activities: OpportunityActivity[]
}

type RawContract = {
  id: string
  kind: ContractKind
  status: ContractStatus
  monthly_value: number | null
  hourly_rate: number | null
  min_months: number | null
  start_date: string
  next_contact_date: string | null
  billing_day: number | null
  sla: string | null
}

type RawCharge = {
  id: string
  description: string
  kind: ChargeKind
  amount: number
  due_date: string
  status: ChargeStatus
  method: ChargeMethod | null
  hours: number | null
  contract_id: string | null
}

type RawProject = {
  id: string
  name: string
  total_value: number | null
  drive_url: string | null
  notes: string | null
  scope_items: ScopeItem[] | null
  status: ProjectStatus
  start_date: string | null
  due_date: string | null
  custom_stages: CustomStage[] | null
  contracts: RawContract[] | null
  charges: RawCharge[] | null
}

type Raw = {
  id: string
  title: string
  stage: DealStage
  estimated_value: number | null
  has_maintenance: boolean | null
  archived_at: string | null
  company: { id: string; name: string } | { id: string; name: string }[] | null
  projects: RawProject[]
  activities: { id: string; type: string; content: string; occurred_at: string | null }[]
}

function one<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

/** Carrega a tela canônica do projeto (detalhe único, usado no Comercial e no Operacional). */
export async function getOpportunityDetail(dealId: string): Promise<OpportunityDetail | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('deals')
    .select(
      `
      id, title, stage, estimated_value, has_maintenance, archived_at,
      company:companies ( id, name ),
      projects (
        id, name, total_value, drive_url, notes, scope_items,
        status, start_date, due_date, custom_stages,
        contracts ( id, kind, status, monthly_value, hourly_rate, min_months, start_date, next_contact_date, billing_day, sla ),
        charges ( id, description, kind, amount, due_date, status, method, hours, contract_id )
      ),
      activities ( id, type, content, occurred_at )
    `,
    )
    .eq('id', dealId)
    .single()

  if (error || !data) return null
  const d = data as unknown as Raw
  const company = one(d.company)
  const project = d.projects[0] ?? null

  // Cobranças do projeto, separadas por finalidade e ordenadas por vencimento.
  const allCharges: ChargeRow[] = (project?.charges ?? [])
    .map((c) => ({
      id: c.id,
      description: c.description,
      kind: c.kind,
      amount: c.amount,
      dueDate: c.due_date,
      status: c.status,
      method: c.method,
      hours: c.hours,
      contractId: c.contract_id,
    }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  // Pagamento de fechamento: setup, ou avulso SEM contrato (não é manutenção).
  const paymentCharges = allCharges.filter(
    (c) => c.kind === 'setup' || (c.kind === 'avulso' && c.contractId == null),
  )
  // Manutenção: recorrências (mensal) ou serviços avulsos vinculados a um contrato.
  const maintenanceCharges = allCharges.filter(
    (c) => c.kind === 'recorrencia' || (c.kind === 'avulso' && c.contractId != null),
  )

  // Contrato de manutenção: prioriza o ativo; senão, o primeiro existente.
  const rawContract =
    project?.contracts?.find((c) => c.status === 'ativo') ?? project?.contracts?.[0] ?? null
  const contract: MaintenanceContract | null = rawContract
    ? {
        id: rawContract.id,
        kind: rawContract.kind,
        status: rawContract.status,
        monthlyValue: rawContract.monthly_value,
        hourlyRate: rawContract.hourly_rate,
        minMonths: rawContract.min_months,
        startDate: rawContract.start_date,
        nextContactDate: rawContract.next_contact_date,
        billingDay: rawContract.billing_day,
        sla: rawContract.sla,
      }
    : null

  return {
    dealId: d.id,
    projectId: project?.id ?? null,
    project: project?.name ?? d.title,
    stage: d.stage,
    archived: d.archived_at != null,
    isClosed: d.stage === 'fechado',
    estimatedValue: d.estimated_value,
    totalValue: project?.total_value ?? null,
    hasMaintenance: d.has_maintenance,
    companyId: company?.id ?? '',
    company: company?.name ?? '—',
    driveUrl: project?.drive_url ?? null,
    notes: project?.notes ?? null,
    scopeItems: (project?.scope_items as unknown[] ?? []).map(normalizeScopeItem),
    startDate: project?.start_date ?? null,
    dueDate: project?.due_date ?? null,
    projectStatus: project?.status ?? null,
    customStages: project?.custom_stages ?? null,
    contract,
    paymentCharges,
    maintenanceCharges,
    activities: [...d.activities]
      .sort((a, b) => (b.occurred_at ?? '').localeCompare(a.occurred_at ?? ''))
      .map((a) => ({ id: a.id, type: a.type, content: a.content, occurredAt: a.occurred_at })),
  }
}

export type ProjectScope = {
  dealId: string
  projectId: string
  projectName: string
  company: string
  companyId: string
  status: ProjectStatus
  progress: number
  dueDate: string | null
  scopeItems: ScopeItem[]
}

/**
 * Busca todos os campos necessários para a tela de implementação pelo projectId.
 */
export async function getProjectScope(projectId: string): Promise<ProjectScope | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select(
      `deal_id, name, status, progress, due_date, scope_items,
       deals!inner ( companies!inner ( id, name ) )`,
    )
    .eq('id', projectId)
    .single()

  if (error || !data || !data.deal_id) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deal = (data as any).deals
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const companyRaw = Array.isArray(deal?.companies) ? deal.companies[0] : deal?.companies

  return {
    dealId: data.deal_id,
    projectId,
    projectName: data.name ?? '',
    company: companyRaw?.name ?? '—',
    companyId: companyRaw?.id ?? '',
    status: (data.status ?? 'a_iniciar') as ProjectStatus,
    progress: (data.progress as number) ?? 0,
    dueDate: data.due_date ?? null,
    scopeItems: (data.scope_items as unknown[] ?? []).map(normalizeScopeItem),
  }
}
