import type { DealStage } from '@/lib/rules/deal-stage'

/** Estágios do funil comercial em ordem (entrada → fechamento). */
export const FUNNEL_STAGES: DealStage[] = [
  'prospect',
  'lead',
  'diagnostico',
  'oportunidade',
  'escopo',
  'proposta',
  'negociacao',
  'fechado',
]

/** Estágios ativos (não-terminais) — alimentam o pipeline atual. */
const ACTIVE_STAGES: DealStage[] = [
  'prospect',
  'lead',
  'diagnostico',
  'oportunidade',
  'escopo',
  'proposta',
  'negociacao',
]

/** Evento de mudança de estágio (deal_stage_events). `at` = entered_at em ISO. */
export type StageEvent = { dealId: string; stage: DealStage; at: string }

/** Snapshot atual do negócio (deals) — base do valor e do pipeline corrente. */
export type DealSnapshot = { id: string; stage: DealStage; estimatedValue: number | null }

export type StageCount = { stage: DealStage; count: number }

export type FunnelMetrics = {
  stageCounts: StageCount[] // nº de deals distintos que alcançaram cada estágio (no período)
  totalEntered: number // deals distintos com algum evento no período
  won: number // alcançaram 'fechado'
  lost: number // alcançaram 'perdido'
  conversionRate: number // won / totalEntered (0..1)
  winRate: number // won / (won + lost) (0..1)
  avgCycleDays: number | null // média de dias do 1º evento ao 'fechado', para os ganhos
  pipelineValue: number // soma de estimatedValue dos deals em estágio ativo (snapshot atual)
  wonValue: number // soma de estimatedValue dos deals que alcançaram 'fechado' (no período)
}

const DAY_MS = 86_400_000

/**
 * Agrega as métricas do funil a partir dos eventos do período + o snapshot atual dos deals.
 * Eventos definem alcance de estágio, conversão e ciclo; o snapshot define o pipeline corrente.
 */
export function computeFunnelMetrics(events: StageEvent[], deals: DealSnapshot[]): FunnelMetrics {
  const valueById = new Map(deals.map((d) => [d.id, d.estimatedValue ?? 0]))

  // Agrupa eventos por deal: estágios alcançados + 1º evento + 1º 'fechado'.
  type Agg = { stages: Set<DealStage>; firstAt: number; closedAt: number | null }
  const byDeal = new Map<string, Agg>()
  for (const ev of events) {
    const t = new Date(ev.at).getTime()
    const agg = byDeal.get(ev.dealId) ?? { stages: new Set<DealStage>(), firstAt: t, closedAt: null }
    agg.stages.add(ev.stage)
    if (t < agg.firstAt) agg.firstAt = t
    if (ev.stage === 'fechado') agg.closedAt = agg.closedAt == null ? t : Math.min(agg.closedAt, t)
    byDeal.set(ev.dealId, agg)
  }

  const aggs = [...byDeal.values()]

  const stageCounts: StageCount[] = FUNNEL_STAGES.map((stage) => ({
    stage,
    count: aggs.filter((a) => a.stages.has(stage)).length,
  }))

  const totalEntered = byDeal.size
  const won = aggs.filter((a) => a.stages.has('fechado')).length
  const lost = aggs.filter((a) => a.stages.has('perdido')).length

  // Tempo médio de ciclo (1º evento → fechado), em dias, só para os ganhos.
  const cycles = aggs
    .filter((a) => a.closedAt != null)
    .map((a) => ((a.closedAt as number) - a.firstAt) / DAY_MS)
  const avgCycleDays = cycles.length > 0 ? cycles.reduce((s, d) => s + d, 0) / cycles.length : null

  // Receita ganha no período: deals com evento 'fechado' no período.
  let wonValue = 0
  for (const [dealId, agg] of byDeal) {
    if (agg.stages.has('fechado')) wonValue += valueById.get(dealId) ?? 0
  }

  // Pipeline atual (snapshot): deals em estágio ativo agora.
  const pipelineValue = deals
    .filter((d) => ACTIVE_STAGES.includes(d.stage))
    .reduce((s, d) => s + (d.estimatedValue ?? 0), 0)

  return {
    stageCounts,
    totalEntered,
    won,
    lost,
    conversionRate: totalEntered > 0 ? won / totalEntered : 0,
    winRate: won + lost > 0 ? won / (won + lost) : 0,
    avgCycleDays,
    pipelineValue,
    wonValue,
  }
}
