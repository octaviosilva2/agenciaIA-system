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
  /** Arquivamento (soft delete). archived = o próprio deal; companyArchived = o contato dono. */
  archived: boolean
  companyArchived: boolean
}

// Forma bruta do Supabase (client não tipado → cast local, sem `any`).
type RawCompany = { id: string; name: string; archived_at: string | null }
type RawCharge = { amount: number; kind: string; status: string }
type RawProject = { id: string; name: string; total_value: number | null; charges: RawCharge[] | null }
type RawDeal = {
  id: string
  title: string
  stage: DealStage
  estimated_value: number | null
  next_action: string | null
  has_maintenance: boolean | null
  archived_at: string | null
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
      id, title, stage, estimated_value, next_action, has_maintenance, archived_at,
      company:companies!inner ( id, name, archived_at ),
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
    // Fechado: cobranças são a fonte de verdade (wizard popula após fechar).
    // Aberto: proposta → estimado → cobranças como fallback.
    const value =
      d.stage === 'fechado' && charged > 0
        ? charged
        : (project?.total_value ?? d.estimated_value ?? (charged > 0 ? charged : null))
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
      archived: d.archived_at != null,
      companyArchived: company?.archived_at != null,
    }
  })
}

/** Estágios da venda — não aparecem no kanban de Contatos (vivem em Oportunidades). */
const SALE_ONLY_STAGES: DealStage[] = ['escopo', 'proposta', 'negociacao']

/** Deals do kanban de Contatos: pré-venda, sem arquivados nem de contato arquivado. */
export function contactsBoardDeals(deals: BoardDeal[]): BoardDeal[] {
  return deals.filter(
    (d) => !SALE_ONLY_STAGES.includes(d.stage) && !d.archived && !d.companyArchived,
  )
}

/**
 * Deals da aba Projetos (continuidade comercial do contato): todos os que já têm
 * projeto vinculado, em qualquer estágio — ativos E terminais (fechado/perdido/reativar).
 * `archived=false` esconde projetos arquivados e de contatos arquivados (cascata);
 * `archived=true` mostra os projetos explicitamente arquivados.
 */
export function opportunitiesBoardDeals(deals: BoardDeal[], archived = false): BoardDeal[] {
  return deals.filter((d) => {
    if (!d.hasProject) return false
    return archived ? d.archived : !d.archived && !d.companyArchived
  })
}
