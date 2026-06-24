import { createClient } from '@/lib/supabase/server'
import type { DealStage } from '@/lib/rules/deal-stage'
import {
  computeFunnelMetrics,
  type DealSnapshot,
  type FunnelMetrics,
  type StageEvent,
} from '@/lib/rules/funnel-metrics'

// Forma bruta do Supabase (client não tipado → cast local, sem `any`).
type RawEvent = { deal_id: string; stage: DealStage; entered_at: string }
type RawCharge = { amount: number; kind: string; status: string }
type RawDeal = {
  id: string
  stage: DealStage
  estimated_value: number | null
  projects: { total_value: number | null; charges: RawCharge[] | null }[] | null
}

/** Soma das cobranças de pagamento (setup/avulso, fora canceladas). */
function paymentSum(charges: RawCharge[] | null | undefined): number {
  return (charges ?? [])
    .filter((c) => (c.kind === 'setup' || c.kind === 'avulso') && c.status !== 'cancelado')
    .reduce((s, c) => s + (c.amount ?? 0), 0)
}

/**
 * Valor efetivo do deal para métricas do funil.
 * Fechado: cobranças de pagamento são a fonte de verdade.
 * Aberto: proposta (total_value) → estimado → cobranças como fallback.
 */
function dealValue(d: RawDeal): number {
  const project = d.projects?.[0] ?? null
  const charged = paymentSum(project?.charges)
  if (d.stage === 'fechado' && charged > 0) return charged
  return project?.total_value ?? d.estimated_value ?? (charged > 0 ? charged : 0)
}

/**
 * Métricas do funil para um intervalo: os eventos (deal_stage_events) são filtrados
 * pelo período; o pipeline corrente vem do snapshot atual dos deals (sempre "agora").
 * Datas nulas = sem recorte (todos os tempos).
 */
export async function getFunnelMetrics(from: Date | null, to: Date | null): Promise<FunnelMetrics> {
  const supabase = await createClient()

  let eventsQuery = supabase.from('deal_stage_events').select('deal_id, stage, entered_at')
  if (from) eventsQuery = eventsQuery.gte('entered_at', from.toISOString())
  if (to) {
    // 'to' inclusivo: até o fim do dia.
    const end = new Date(to)
    end.setHours(23, 59, 59, 999)
    eventsQuery = eventsQuery.lte('entered_at', end.toISOString())
  }

  // Paralelo: eventos do período + snapshot atual dos deals com seus projetos/cobranças.
  const [eventsResult, dealsResult] = await Promise.all([
    eventsQuery,
    supabase
      .from('deals')
      .select('id, stage, estimated_value, projects ( total_value, charges ( amount, kind, status ) )'),
  ])

  if (eventsResult.error) throw new Error(`Falha ao carregar eventos do funil: ${eventsResult.error.message}`)
  if (dealsResult.error) throw new Error(`Falha ao carregar negócios: ${dealsResult.error.message}`)

  const events: StageEvent[] = ((eventsResult.data ?? []) as RawEvent[]).map((e) => ({
    dealId: e.deal_id,
    stage: e.stage,
    at: e.entered_at,
  }))

  const rawDeals = (dealsResult.data ?? []) as unknown as RawDeal[]

  const deals: DealSnapshot[] = rawDeals.map((d) => ({
    id: d.id,
    stage: d.stage,
    estimatedValue: dealValue(d),
  }))

  return computeFunnelMetrics(events, deals)
}
