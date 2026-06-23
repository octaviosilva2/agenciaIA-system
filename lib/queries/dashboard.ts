import { createClient } from '@/lib/supabase/server'
import { getFinanceOverview } from '@/lib/queries/finance'
import { getNarrativesWithCommitments } from '@/lib/queries/nct'
import { ACTIVE_FUNNEL_STAGES } from '@/lib/rules/deal-stage'
import type { Database } from '@/lib/supabase/types'

type Enums = Database['public']['Enums']

// =====================================================================
// Tipos (contrato da UI) — movidos de lib/mock/dashboard.ts e de
// components/dashboard/dashboard-view.tsx, mesmo nome e shape.
// O Dashboard AGREGA os resumos das outras telas; não reimplementa somas
// quando já existe query consolidada (ex.: getFinanceOverview).
// =====================================================================

/** Resumo financeiro do mês corrente (regime de caixa). */
export type FinanceSummary = {
  revenue: number // receita recebida no mês (cobranças pagas)
  expenses: number // despesas pagas no mês
  profit: number // saldo de caixa do mês (recebido − pago)
}

/** Resumo do bloco Comercial. */
export type CommercialSummary = {
  activeByStage: { stage: Enums['deal_stage']; count: number }[]
  newCount: number // deals criados no mês corrente
  closedCount: number // deals ganhos (fechados) no mês corrente
  pipelineValue: number // soma dos estimated_value dos deals ativos
}

/** Resumo do bloco Implementações (projetos de negócios fechados). */
export type ImplementationSummary = {
  active: number // projetos ainda não concluídos (status ≠ entregue)
  completedThisMonth: number // projetos concluídos (entregue) no mês corrente
}

/** Resumo NCT derivado das narrativas ativas e seus compromissos. */
export type NctSummary = {
  atRisk: number // compromissos com confiança baixa
  avgProgress: number // progresso médio (0–100)
  activeNarratives: number // narrativas com status ativa
  staleCommitmentsCount: number // compromissos sem check-in há +14 dias
}

/** Um ponto mensal do gráfico de crescimento. */
export type GrowthPoint = {
  month: string // abreviação PT-BR: "Jan", "Fev", ...
  revenue: number // receita recebida no mês
  clients: number // clientes ativos no mês
}

// =====================================================================
// Fallbacks neutros — cada resumo degrada sozinho (try/catch) sem derrubar
// os demais blocos. Erro vira estado vazio + log no servidor.
// =====================================================================

const EMPTY_FINANCE: FinanceSummary = { revenue: 0, expenses: 0, profit: 0 }
const EMPTY_COMMERCIAL: CommercialSummary = {
  activeByStage: [],
  newCount: 0,
  closedCount: 0,
  pipelineValue: 0,
}
const EMPTY_IMPLEMENTATION: ImplementationSummary = { active: 0, completedThisMonth: 0 }
const EMPTY_NCT: NctSummary = {
  atRisk: 0,
  avgProgress: 0,
  activeNarratives: 0,
  staleCommitmentsCount: 0,
}

const MONTH_ABBR_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const STALE_DAYS = 14

// =====================================================================
// Helpers de data.
// =====================================================================

/** Intervalo [primeiro, último dia] do mês corrente. */
function currentMonthRange(): { from: Date; to: Date; year: number; month0: number } {
  const now = new Date()
  const year = now.getFullYear()
  const month0 = now.getMonth()
  const from = new Date(year, month0, 1)
  from.setHours(0, 0, 0, 0)
  const to = new Date(year, month0 + 1, 0)
  to.setHours(23, 59, 59, 999)
  return { from, to, year, month0 }
}

/** Verdadeiro quando um timestamp ISO (com fuso) cai no ano/mês dados. */
function isInMonth(iso: string | null, year: number, month0: number): boolean {
  if (!iso) return false
  const d = new Date(iso)
  return d.getFullYear() === year && d.getMonth() === month0
}

/** Último dia de um mês (ano corrente) como yyyy-MM-dd, para comparar com colunas `date`. */
function monthEndISODate(year: number, month0: number): string {
  const d = new Date(year, month0 + 1, 0)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

// =====================================================================
// Resumos por bloco (cada um resiliente: erro → fallback neutro).
// =====================================================================

/**
 * Bloco Financeiro — reusa getFinanceOverview no recorte do mês corrente.
 * Regime de caixa: receita = recebido, despesa = pago, lucro = saldo do mês.
 */
async function getFinanceSummary(): Promise<FinanceSummary> {
  try {
    const { from, to } = currentMonthRange()
    const ov = await getFinanceOverview({ from, to })
    // grossRevenue = recebido no mês; balance = recebido − pago ⇒ pago = grossRevenue − balance.
    const revenue = ov.grossRevenue
    const profit = ov.balance
    const expenses = revenue - profit
    return { revenue, expenses, profit }
  } catch (err) {
    console.error('[dashboard] bloco Financeiro falhou:', err)
    return EMPTY_FINANCE
  }
}

/** Bloco Comercial — agrega os deals (funil ativo, novos e fechados no mês). */
async function getCommercialSummary(): Promise<CommercialSummary> {
  try {
    const supabase = await createClient()
    const { year, month0 } = currentMonthRange()
    const { data, error } = await supabase
      .from('deals')
      .select('id, stage, estimated_value, created_at, closed_at')
      .is('archived_at', null)

    if (error) throw new Error(error.message)

    type Row = {
      id: string
      stage: Enums['deal_stage']
      estimated_value: number | null
      created_at: string
      closed_at: string | null
    }
    const deals = (data ?? []) as Row[]
    const activeStages = ACTIVE_FUNNEL_STAGES as readonly Enums['deal_stage'][]

    // Contagem por estágio ativo (só estágios com ao menos 1 deal, preservando a ordem do funil).
    const activeByStage = activeStages
      .map((stage) => ({ stage, count: deals.filter((d) => d.stage === stage).length }))
      .filter((s) => s.count > 0)

    const pipelineValue = deals
      .filter((d) => activeStages.includes(d.stage))
      .reduce((sum, d) => sum + (d.estimated_value ?? 0), 0)

    const newCount = deals.filter((d) => isInMonth(d.created_at, year, month0)).length
    const closedCount = deals.filter(
      (d) => d.stage === 'fechado' && isInMonth(d.closed_at, year, month0),
    ).length

    return { activeByStage, newCount, closedCount, pipelineValue }
  } catch (err) {
    console.error('[dashboard] bloco Comercial falhou:', err)
    return EMPTY_COMMERCIAL
  }
}

/** Bloco Implementações — projetos de deals fechados, por status do projeto. */
async function getImplementationSummary(): Promise<ImplementationSummary> {
  try {
    const supabase = await createClient()
    const { year, month0 } = currentMonthRange()
    const { data, error } = await supabase
      .from('projects')
      .select('id, status, updated_at, deal:deals ( stage, archived_at )')

    if (error) throw new Error(error.message)

    type Row = {
      id: string
      status: Enums['project_status']
      updated_at: string
      deal: { stage: string; archived_at: string | null } | { stage: string; archived_at: string | null }[] | null
    }
    const rows = (data ?? []) as unknown as Row[]

    // Só projetos de negócios fechados e não arquivados (espelha a tela /implementacao).
    const projects = rows.filter((r) => {
      const deal = Array.isArray(r.deal) ? r.deal[0] : r.deal
      return deal?.stage === 'fechado' && deal.archived_at == null
    })

    const active = projects.filter((p) => p.status !== 'entregue').length
    // Sem coluna de conclusão; usa updated_at como proxy do "entregue neste mês".
    const completedThisMonth = projects.filter(
      (p) => p.status === 'entregue' && isInMonth(p.updated_at, year, month0),
    ).length

    return { active, completedThisMonth }
  } catch (err) {
    console.error('[dashboard] bloco Implementações falhou:', err)
    return EMPTY_IMPLEMENTATION
  }
}

/** Bloco NCT — resumo dos compromissos das narrativas ativas. */
async function getNctSummary(): Promise<NctSummary> {
  try {
    const supabase = await createClient()
    const narratives = await getNarrativesWithCommitments()

    const activeNarrativeIds = new Set(
      narratives.filter((n) => n.status === 'ativa').map((n) => n.id),
    )
    const activeCommitments = narratives
      .filter((n) => activeNarrativeIds.has(n.id))
      .flatMap((n) => n.commitments)

    const atRisk = activeCommitments.filter((c) => c.confidence === 'baixa').length
    const avgProgress = activeCommitments.length
      ? Math.round(
          activeCommitments.reduce((sum, c) => sum + c.progress, 0) / activeCommitments.length,
        )
      : 0

    // Último check-in por compromisso (agregado no servidor — volume pequeno).
    const { data: checkins, error } = await supabase
      .from('commitment_checkins')
      .select('commitment_id, created_at')
    if (error) throw new Error(error.message)

    const latestDaysAgo = new Map<string, number>()
    for (const ck of (checkins ?? []) as { commitment_id: string; created_at: string }[]) {
      const daysAgo = Math.floor((Date.now() - new Date(ck.created_at).getTime()) / 86_400_000)
      const current = latestDaysAgo.get(ck.commitment_id)
      if (current === undefined || daysAgo < current) latestDaysAgo.set(ck.commitment_id, daysAgo)
    }

    // Idade de cada compromisso (created_at) — um compromisso recém-criado não
    // pode contar como "sem check-in há +14 dias".
    const { data: commitmentRows, error: cmErr } = await supabase
      .from('commitments')
      .select('id, created_at')
    if (cmErr) throw new Error(cmErr.message)

    const createdDaysAgo = new Map<string, number>()
    for (const cm of (commitmentRows ?? []) as { id: string; created_at: string }[]) {
      const daysAgo = Math.floor((Date.now() - new Date(cm.created_at).getTime()) / 86_400_000)
      createdDaysAgo.set(cm.id, daysAgo)
    }

    // Stale só se o compromisso já tem +14 dias de vida E (sem check-in OU último check-in há +14 dias).
    const staleCommitmentsCount = activeCommitments.filter((c) => {
      const age = createdDaysAgo.get(c.id)
      if (age === undefined || age <= STALE_DAYS) return false
      const last = latestDaysAgo.get(c.id)
      return last === undefined || last > STALE_DAYS
    }).length

    return {
      atRisk,
      avgProgress,
      activeNarratives: activeNarrativeIds.size,
      staleCommitmentsCount,
    }
  } catch (err) {
    console.error('[dashboard] bloco NCT falhou:', err)
    return EMPTY_NCT
  }
}

/**
 * Série mensal Jan→mês atual do ano corrente (§4.4):
 * receita = cobranças pagas no mês; clientes = empresas com contrato ativo no mês.
 */
export async function getGrowthData(): Promise<GrowthPoint[]> {
  try {
    const supabase = await createClient()
    const { year, month0 } = currentMonthRange()

    const [chargesRes, contractsRes] = await Promise.all([
      supabase.from('charges').select('amount, status, paid_at'),
      supabase.from('contracts').select('company_id, start_date, status, archived_at'),
    ])
    if (chargesRes.error) throw new Error(chargesRes.error.message)
    if (contractsRes.error) throw new Error(contractsRes.error.message)

    const charges = (chargesRes.data ?? []) as { amount: number; status: string; paid_at: string | null }[]
    const contracts = (contractsRes.data ?? []) as {
      company_id: string
      start_date: string
      status: string
      archived_at: string | null
    }[]
    // Contratos vivos hoje (sem coluna de término no schema): start_date define quando passou a contar.
    const liveContracts = contracts.filter((c) => c.status === 'ativo' && c.archived_at == null)

    const points: GrowthPoint[] = []
    for (let m = 0; m <= month0; m++) {
      const revenue = charges
        .filter((c) => c.status === 'pago' && isInMonth(c.paid_at, year, m))
        .reduce((sum, c) => sum + Number(c.amount), 0)

      // Empresas distintas cujo contrato já havia começado até o fim do mês.
      const monthEnd = monthEndISODate(year, m)
      const clientIds = new Set(
        liveContracts.filter((c) => c.start_date <= monthEnd).map((c) => c.company_id),
      )

      points.push({ month: MONTH_ABBR_PT[m], revenue, clients: clientIds.size })
    }
    return points
  } catch (err) {
    console.error('[dashboard] gráfico de Crescimento falhou:', err)
    return []
  }
}

// =====================================================================
// Agregador da página.
// =====================================================================

export type DashboardData = {
  finance: FinanceSummary
  commercial: CommercialSummary
  implementation: ImplementationSummary
  nct: NctSummary
  growth: GrowthPoint[]
}

/**
 * Carrega todos os resumos do Dashboard em paralelo. Cada bloco já degrada
 * sozinho (try/catch → fallback neutro), então a falha de um não derruba os
 * outros e a página nunca lança.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const [finance, commercial, implementation, nct, growth] = await Promise.all([
    getFinanceSummary(),
    getCommercialSummary(),
    getImplementationSummary(),
    getNctSummary(),
    getGrowthData(),
  ])
  return { finance, commercial, implementation, nct, growth }
}
