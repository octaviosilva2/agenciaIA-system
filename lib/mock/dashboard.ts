/**
 * Dados MOCK do Dashboard (Fase 6) — modo UI-first, sem backend.
 *
 * Os blocos Financeiro e NCT são derivados em app/(dashboard)/page.tsx dos mocks
 * de finance.ts e nct.ts. Os demais agregados vivem aqui. Quando o backend
 * chegar, estes números viram queries de resumo.
 */

import type { Database } from '@/lib/supabase/types'

type Enums = Database['public']['Enums']

/** Resumo do bloco Comercial. */
export type CommercialSummary = {
  activeByStage: { stage: Enums['deal_stage']; count: number }[]
  newCount: number       // deals abertos/criados no mês corrente
  closedCount: number    // deals ganhos/fechados no mês corrente
  pipelineValue: number  // soma dos estimated_value dos deals ativos
}

export const MOCK_COMMERCIAL: CommercialSummary = {
  activeByStage: [
    { stage: 'oportunidade', count: 3 },
    { stage: 'proposta', count: 2 },
    { stage: 'negociacao', count: 1 },
  ],
  newCount: 2,
  closedCount: 1,
  pipelineValue: 48000,
}

/** Resumo do bloco Implementações (projetos de implementação). */
export type ImplementationSummary = {
  active: number           // projetos abertos (qualquer mês) ainda não concluídos
  completedThisMonth: number // projetos concluídos no mês corrente
}

export const MOCK_IMPLEMENTATION: ImplementationSummary = {
  active: 4,
  completedThisMonth: 2,
}

/** Um ponto mensal para o gráfico de crescimento. */
export type GrowthPoint = {
  month: string    // abreviação PT-BR: "Jan", "Fev", ...
  revenue: number  // receita total do mês
  clients: number  // clientes ativos no mês
}

/** Dados de crescimento do ano corrente (Jan–Jun 2026). */
export const MOCK_GROWTH_DATA: GrowthPoint[] = [
  { month: 'Jan', revenue: 11000, clients: 6 },
  { month: 'Fev', revenue: 12500, clients: 7 },
  { month: 'Mar', revenue: 13800, clients: 8 },
  { month: 'Abr', revenue: 15200, clients: 9 },
  { month: 'Mai', revenue: 17500, clients: 11 },
  { month: 'Jun', revenue: 19000, clients: 12 },
]
