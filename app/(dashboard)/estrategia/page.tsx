import { StrategyView } from '@/components/strategy/strategy-view'
import { getStrategyBlocks } from '@/lib/queries/strategy'

/**
 * Página de Estratégia (Fase 5 — Gestão).
 * Server Component: carrega os 5 blocos fixos do banco e entrega à view client,
 * que edita via server action (updateStrategyBlock).
 */
export default async function EstrategiaPage() {
  const blocks = await getStrategyBlocks()
  return <StrategyView initialBlocks={blocks} />
}
