import { createClient } from '@/lib/supabase/server'
import { calculateNetRevenue } from '@/lib/rules/net-revenue'
import { getOrgSettings } from '@/lib/queries/config'
import type { Database } from '@/lib/supabase/types'

type Enums = Database['public']['Enums']

// =====================================================================
// Tipos (contrato da UI — espelham as tabelas charges e accounts_payable).
// Movidos de lib/mock/finance.ts; mesmo nome, mesmos campos (snake_case = schema).
// =====================================================================

/** Conta a receber (tabela `charges`). */
export type Charge = {
  id: string
  company_id: string | null
  project_id: string | null
  contract_id: string | null
  description: string
  kind: Enums['charge_kind']
  amount: number
  due_date: string // ISO yyyy-MM-dd
  status: Enums['charge_status']
  method: Enums['charge_method'] | null
  paid_at: string | null // ISO datetime quando pago
  notes: string | null
  // Exibição (opcional — derivado no servidor na leitura; a UI de criação não preenche).
  // Origem (projeto/contrato) e link para a tela de origem (/projetos/{dealId}).
  origin_label?: string | null
  origin_href?: string | null
}

/** Conta a pagar (tabela `accounts_payable`). Reusa charge_status (pendente/pago/cancelado). */
export type AccountPayable = {
  id: string
  description: string
  category: Enums['payable_category']
  amount: number
  due_date: string // ISO yyyy-MM-dd
  status: Enums['charge_status']
  paid_at: string | null
  project_id: string | null
  supplier: string | null
  notes: string | null
}

/**
 * Linha unificada do extrato (A Receber + A Pagar na mesma tabela).
 * Tipo só de UI — o backend continua expondo as duas tabelas separadas.
 */
export type AccountRow =
  | { type: 'receber'; data: Charge }
  | { type: 'pagar'; data: AccountPayable }

// =====================================================================
// Helpers.
// =====================================================================

/** Normaliza uma relação que o PostgREST pode devolver como objeto ou array. */
function one<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

// Forma crua das cobranças com os joins de origem.
type RawCharge = {
  id: string
  company_id: string | null
  project_id: string | null
  contract_id: string | null
  description: string
  kind: Enums['charge_kind']
  amount: number
  due_date: string
  status: Enums['charge_status']
  method: Enums['charge_method'] | null
  paid_at: string | null
  notes: string | null
  project: { name: string; deal_id: string | null } | { name: string; deal_id: string | null }[] | null
  contract:
    | { name: string; project: { deal_id: string | null } | { deal_id: string | null }[] | null }
    | { name: string; project: { deal_id: string | null } | { deal_id: string | null }[] | null }[]
    | null
}

/** Deriva rótulo e link da origem (contrato de manutenção ou projeto). */
function deriveOrigin(r: RawCharge): { origin_label: string | null; origin_href: string | null } {
  const project = one(r.project)
  const contract = one(r.contract)
  const contractDealId = one(contract?.project)?.deal_id ?? null
  // Recorrência vem do contrato; setup/avulso vinculado vem do projeto.
  const origin_label = contract?.name ?? project?.name ?? null
  const dealId = project?.deal_id ?? contractDealId
  const origin_href = dealId ? `/projetos/${dealId}` : null
  return { origin_label, origin_href }
}

// =====================================================================
// Queries.
// =====================================================================

/**
 * Carrega todas as contas (a receber + a pagar) com a origem das cobranças
 * derivada no servidor. NÃO filtra por status/período — a view client faz isso
 * (a aba "Todos" precisa ver até avulsos cancelados). Ordenadas por vencimento.
 */
export async function getAccounts(): Promise<{ charges: Charge[]; payables: AccountPayable[] }> {
  const supabase = await createClient()

  const [chargesRes, payablesRes] = await Promise.all([
    supabase
      .from('charges')
      .select(
        `id, company_id, project_id, contract_id, description, kind, amount, due_date, status, method, paid_at, notes,
         project:projects ( name, deal_id ),
         contract:contracts ( name, project:projects ( deal_id ) )`,
      )
      .order('due_date', { ascending: true }),
    supabase
      .from('accounts_payable')
      .select('id, description, category, amount, due_date, status, paid_at, project_id, supplier, notes')
      .order('due_date', { ascending: true }),
  ])

  if (chargesRes.error) throw new Error(`Falha ao carregar cobranças: ${chargesRes.error.message}`)
  if (payablesRes.error) throw new Error(`Falha ao carregar contas a pagar: ${payablesRes.error.message}`)

  const charges: Charge[] = (chargesRes.data as unknown as RawCharge[]).map((r) => {
    const { origin_label, origin_href } = deriveOrigin(r)
    return {
      id: r.id,
      company_id: r.company_id,
      project_id: r.project_id,
      contract_id: r.contract_id,
      description: r.description,
      kind: r.kind,
      amount: Number(r.amount),
      due_date: r.due_date,
      status: r.status,
      method: r.method,
      paid_at: r.paid_at,
      notes: r.notes,
      origin_label,
      origin_href,
    }
  })

  const payables: AccountPayable[] = (payablesRes.data ?? []).map((p) => ({
    id: p.id,
    description: p.description,
    category: p.category,
    amount: Number(p.amount),
    due_date: p.due_date,
    status: p.status,
    paid_at: p.paid_at,
    project_id: p.project_id,
    supplier: p.supplier,
    notes: p.notes,
  }))

  return { charges, payables }
}

/** Resumo financeiro consolidado (reusado pelo Dashboard na Sessão 4). */
export type FinanceOverview = {
  grossRevenue: number // receita bruta (cobranças não-canceladas no período)
  taxes: number // impostos = bruta × alíquota
  netRevenue: number // líquida = bruta − impostos (calculateNetRevenue)
  toReceive: number // a receber (cobranças pendentes)
  toPay: number // a pagar (contas pendentes)
  balance: number // saldo de caixa (recebido − pago) no período
}

type PeriodRange = { from?: Date | null; to?: Date | null }

/** Verdadeiro quando a data (yyyy-MM-dd) cai dentro de [from, to] (inclusive). */
function inRange(dateStr: string, from?: Date | null, to?: Date | null): boolean {
  if (!from && !to) return true
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  if (from && d < from) return false
  if (to && d > to) return false
  return true
}

/**
 * Calcula os 6 indicadores financeiros do período usando a alíquota real do
 * /config (org_settings). Receita líquida via regra pura `calculateNetRevenue`.
 */
export async function getFinanceOverview({ from, to }: PeriodRange = {}): Promise<FinanceOverview> {
  const supabase = await createClient()
  const settings = await getOrgSettings()

  const [chargesRes, payablesRes] = await Promise.all([
    supabase.from('charges').select('amount, status, due_date'),
    supabase.from('accounts_payable').select('amount, status, due_date'),
  ])

  if (chargesRes.error) throw new Error(`Falha ao carregar cobranças: ${chargesRes.error.message}`)
  if (payablesRes.error) throw new Error(`Falha ao carregar contas a pagar: ${payablesRes.error.message}`)

  const charges = (chargesRes.data ?? []).filter(
    (c) => c.status !== 'cancelado' && inRange(c.due_date, from, to),
  )
  const payables = (payablesRes.data ?? []).filter(
    (p) => p.status !== 'cancelado' && inRange(p.due_date, from, to),
  )

  // Receita bruta = só o confirmado (pago); pendente/vencido fica em "a receber".
  const grossRevenue = charges
    .filter((c) => c.status === 'pago')
    .reduce((s, c) => s + Number(c.amount), 0)
  const netRevenue = calculateNetRevenue(grossRevenue, settings.tax_rate)
  const taxes = grossRevenue - netRevenue

  const toReceive = charges
    .filter((c) => c.status === 'pendente')
    .reduce((s, c) => s + Number(c.amount), 0)
  const toPay = payables
    .filter((p) => p.status === 'pendente')
    .reduce((s, p) => s + Number(p.amount), 0)

  const received = charges
    .filter((c) => c.status === 'pago')
    .reduce((s, c) => s + Number(c.amount), 0)
  const paid = payables.filter((p) => p.status === 'pago').reduce((s, p) => s + Number(p.amount), 0)
  const balance = received - paid

  return { grossRevenue, taxes, netRevenue, toReceive, toPay, balance }
}
