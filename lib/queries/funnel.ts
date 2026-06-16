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
type RawDeal = { id: string; stage: DealStage; estimated_value: number | null }

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

  const { data: rawEvents, error: evErr } = await eventsQuery
  if (evErr) throw new Error(`Falha ao carregar eventos do funil: ${evErr.message}`)

  const events: StageEvent[] = ((rawEvents ?? []) as RawEvent[]).map((e) => ({
    dealId: e.deal_id,
    stage: e.stage,
    at: e.entered_at,
  }))

  const { data: rawDeals, error: dErr } = await supabase
    .from('deals')
    .select('id, stage, estimated_value')
  if (dErr) throw new Error(`Falha ao carregar negócios: ${dErr.message}`)

  const deals: DealSnapshot[] = ((rawDeals ?? []) as RawDeal[]).map((d) => ({
    id: d.id,
    stage: d.stage,
    estimatedValue: d.estimated_value,
  }))

  return computeFunnelMetrics(events, deals)
}
