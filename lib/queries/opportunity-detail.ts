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
}

export type ScopeItem = { id: string; title: string; contracted: boolean; delivered: boolean }

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
        contracts ( id, kind, status, monthly_value, min_months, start_date, next_contact_date, billing_day, sla ),
        charges ( id, description, kind, amount, due_date, status, method )
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
    }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const paymentCharges = allCharges.filter((c) => c.kind === 'setup' || c.kind === 'avulso')
  const maintenanceCharges = allCharges.filter((c) => c.kind === 'recorrencia')

  // Contrato de manutenção: prioriza o ativo; senão, o primeiro existente.
  const rawContract =
    project?.contracts?.find((c) => c.status === 'ativo') ?? project?.contracts?.[0] ?? null
  const contract: MaintenanceContract | null = rawContract
    ? {
        id: rawContract.id,
        kind: rawContract.kind,
        status: rawContract.status,
        monthlyValue: rawContract.monthly_value,
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
    scopeItems: project?.scope_items ?? [],
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
