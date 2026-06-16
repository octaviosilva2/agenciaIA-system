import { createClient } from '@/lib/supabase/server'
import type { DealStage } from '@/lib/rules/deal-stage'

/** Deal montado para os boards de Contatos e Oportunidades (fonte única). */
export type BoardDeal = {
  id: string
  companyId: string
  company: string
  title: string
  stage: DealStage
  estimatedValue: number | null
  /** Valor a exibir: proposta (total_value) → estimado → soma das cobranças de pagamento. */
  value: number | null
  nextAction: string | null
  hasProject: boolean
  projectId: string | null
  projectName: string | null
  /** Só quando stage='fechado': 'com'/'sem' manutenção (para a descrição do card). */
  maintenance: 'com' | 'sem' | null
}

// Forma bruta do Supabase (client não tipado → cast local, sem `any`).
type RawCompany = { id: string; name: string }
type RawCharge = { amount: number; kind: string; status: string }
type RawProject = { id: string; name: string; total_value: number | null; charges: RawCharge[] | null }
type RawDeal = {
  id: string
  title: string
  stage: DealStage
  estimated_value: number | null
  next_action: string | null
  has_maintenance: boolean | null
  company: RawCompany | RawCompany[] | null
  projects: RawProject[]
}

/** Soma das cobranças de pagamento (setup/avulso, fora as canceladas). */
function paymentSum(charges: RawCharge[] | null | undefined): number {
  return (charges ?? [])
    .filter((c) => (c.kind === 'setup' || c.kind === 'avulso') && c.status !== 'cancelado')
    .reduce((s, c) => s + (c.amount ?? 0), 0)
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

/** Carrega todos os deals com company e projeto — base dos dois boards. */
export async function getDealsBoard(): Promise<BoardDeal[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('deals')
    .select(
      `
      id, title, stage, estimated_value, next_action, has_maintenance,
      company:companies!inner ( id, name ),
      projects ( id, name, total_value, charges ( amount, kind, status ) )
    `,
    )
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Falha ao carregar negócios: ${error.message}`)
  }

  const deals = (data ?? []) as RawDeal[]

  return deals.map((d) => {
    const company = one(d.company)
    const project = d.projects[0] ?? null
    const charged = paymentSum(project?.charges)
    // Valor exibido: proposta → estimado → soma das cobranças (cobre projeto pago sem proposta).
    const value = project?.total_value ?? d.estimated_value ?? (charged > 0 ? charged : null)
    return {
      id: d.id,
      companyId: company?.id ?? '',
      company: company?.name ?? '—',
      title: d.title,
      stage: d.stage,
      estimatedValue: d.estimated_value,
      value,
      nextAction: d.next_action,
      hasProject: d.projects.length > 0,
      projectId: project?.id ?? null,
      projectName: project?.name ?? null,
      maintenance: d.stage === 'fechado' ? (d.has_maintenance ? 'com' : 'sem') : null,
    }
  })
}

/** Estágios da venda — não aparecem no kanban de Contatos (vivem em Oportunidades). */
const SALE_ONLY_STAGES: DealStage[] = ['escopo', 'proposta', 'negociacao']

/** Deals do kanban de Contatos: todos menos os estágios exclusivos da venda. */
export function contactsBoardDeals(deals: BoardDeal[]): BoardDeal[] {
  return deals.filter((d) => !SALE_ONLY_STAGES.includes(d.stage))
}

/**
 * Deals da aba Projetos (continuidade comercial do contato): todos os que já têm
 * projeto vinculado, em qualquer estágio — ativos E terminais (fechado/perdido/reativar).
 * O fechado também aparece na Implementação (Operacional), com outro propósito.
 */
export function opportunitiesBoardDeals(deals: BoardDeal[]): BoardDeal[] {
  return deals.filter((d) => d.hasProject)
}
