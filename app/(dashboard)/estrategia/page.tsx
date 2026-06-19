import { StrategyView } from '@/components/strategy/strategy-view'
import { MOCK_STRATEGY_BLOCKS } from '@/lib/mock/strategy'

/**
 * Página de Estratégia (Fase 5 — Gestão), modo MOCK.
 * RSC só carrega os 5 blocos fixos do mock e entrega à view client, que faz a
 * edição em memória. Quando o backend chegar, troque o mock por uma query.
 */
export default function EstrategiaPage() {
  return <StrategyView initialBlocks={MOCK_STRATEGY_BLOCKS} />
}
