import { createClient } from '@/lib/supabase/server'
import { STRATEGY_BLOCK_META } from '@/lib/format'
import type { Database } from '@/lib/supabase/types'

type StrategyKind = Database['public']['Enums']['strategy_block_kind']

// =====================================================================
// Tipos (contrato da UI — espelham a tabela strategy_blocks).
// Movidos de lib/mock/strategy.ts; mesmo nome, mesmo shape do `content` jsonb.
//   missao / proposito → { text }
//   swot               → { strengths, weaknesses, opportunities, threats }
//   asis_tobe          → { as_is, to_be }
//   blueprint          → { channels, revenue, value_proposition, segments }
// =====================================================================

export type MissionContent = { text: string }
export type PurposeContent = { text: string }
export type SwotContent = {
  strengths: string
  weaknesses: string
  opportunities: string
  threats: string
}
export type AsIsToBeContent = { as_is: string; to_be: string }
export type BlueprintContent = {
  channels: string
  revenue: string
  value_proposition: string
  segments: string
}

/** Mapa kind → formato do content. Garante que cada bloco carregue o shape certo. */
export type StrategyContentByKind = {
  missao: MissionContent
  proposito: PurposeContent
  swot: SwotContent
  asis_tobe: AsIsToBeContent
  blueprint: BlueprintContent
}

/**
 * Bloco estratégico tipado por kind (união discriminada).
 * Espelha `strategy_blocks` (id, kind, content jsonb, updated_at).
 */
export type StrategyBlock = {
  [K in StrategyKind]: {
    id: string
    kind: K
    content: StrategyContentByKind[K]
    updated_at: string
  }
}[StrategyKind]

// Ordem canônica de exibição (deriva da ordem das chaves do meta em lib/format).
const STRATEGY_KIND_ORDER = Object.keys(STRATEGY_BLOCK_META) as StrategyKind[]

/**
 * Carrega os 5 blocos fixos de estratégia (seed migration 0006). Não cria nem
 * exclui — só lê. Ordena na ordem canônica de exibição (missão primeiro).
 */
export async function getStrategyBlocks(): Promise<StrategyBlock[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('strategy_blocks')
    .select('id, kind, content, updated_at')

  if (error) throw new Error(`Falha ao carregar blocos de estratégia: ${error.message}`)

  const rank = (k: StrategyKind) => {
    const i = STRATEGY_KIND_ORDER.indexOf(k)
    return i === -1 ? STRATEGY_KIND_ORDER.length : i
  }

  // content é jsonb (Json no schema) — cast para a união discriminada da UI.
  const blocks = (data ?? []).map((b) => ({
    id: b.id,
    kind: b.kind,
    content: b.content,
    updated_at: b.updated_at,
  })) as unknown as StrategyBlock[]

  return blocks.sort((a, b) => rank(a.kind) - rank(b.kind))
}
