import { describe, it, expect } from 'vitest'
import {
  computeFunnelMetrics,
  FUNNEL_STAGES,
  type StageEvent,
  type DealSnapshot,
} from '../../lib/rules/funnel-metrics'

describe('funnel metrics rule', () => {
  it('conta deals distintos por estágio alcançado', () => {
    const events: StageEvent[] = [
      { dealId: 'a', stage: 'prospect', at: '2026-01-01T10:00:00Z' },
      { dealId: 'a', stage: 'lead', at: '2026-01-02T10:00:00Z' },
      { dealId: 'b', stage: 'prospect', at: '2026-01-03T10:00:00Z' },
    ]
    const m = computeFunnelMetrics(events, [])
    const prospect = m.stageCounts.find((s) => s.stage === 'prospect')
    const lead = m.stageCounts.find((s) => s.stage === 'lead')
    expect(prospect?.count).toBe(2)
    expect(lead?.count).toBe(1)
    expect(m.totalEntered).toBe(2)
    // O funil expõe todos os estágios na ordem canônica.
    expect(m.stageCounts).toHaveLength(FUNNEL_STAGES.length)
  })

  it('calcula conversão, win rate e tempo médio de ciclo dos ganhos', () => {
    const events: StageEvent[] = [
      { dealId: 'a', stage: 'prospect', at: '2026-01-01T00:00:00Z' },
      { dealId: 'a', stage: 'fechado', at: '2026-01-11T00:00:00Z' }, // 10 dias
      { dealId: 'b', stage: 'prospect', at: '2026-01-01T00:00:00Z' },
      { dealId: 'b', stage: 'perdido', at: '2026-01-05T00:00:00Z' },
      { dealId: 'c', stage: 'prospect', at: '2026-01-01T00:00:00Z' },
    ]
    const m = computeFunnelMetrics(events, [])
    expect(m.won).toBe(1)
    expect(m.lost).toBe(1)
    expect(m.totalEntered).toBe(3)
    expect(m.conversionRate).toBeCloseTo(1 / 3)
    expect(m.winRate).toBeCloseTo(1 / 2)
    expect(m.avgCycleDays).toBeCloseTo(10)
  })

  it('soma pipeline (estágios ativos) e receita ganha pelo snapshot', () => {
    const events: StageEvent[] = [
      { dealId: 'a', stage: 'fechado', at: '2026-02-01T00:00:00Z' },
    ]
    const deals: DealSnapshot[] = [
      { id: 'a', stage: 'fechado', estimatedValue: 5000 }, // ganho → wonValue
      { id: 'b', stage: 'negociacao', estimatedValue: 3000 }, // ativo → pipeline
      { id: 'c', stage: 'perdido', estimatedValue: 9000 }, // terminal → fora do pipeline
    ]
    const m = computeFunnelMetrics(events, deals)
    expect(m.pipelineValue).toBe(3000)
    expect(m.wonValue).toBe(5000)
  })

  it('é seguro com entrada vazia', () => {
    const m = computeFunnelMetrics([], [])
    expect(m.totalEntered).toBe(0)
    expect(m.conversionRate).toBe(0)
    expect(m.winRate).toBe(0)
    expect(m.avgCycleDays).toBeNull()
    expect(m.pipelineValue).toBe(0)
  })
})
