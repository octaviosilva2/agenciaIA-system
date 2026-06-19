import { DashboardView } from '@/components/dashboard/dashboard-view'
import { MOCK_CHARGES, MOCK_PAYABLES } from '@/lib/mock/finance'
import { MOCK_COMMITMENTS, MOCK_NARRATIVES, MOCK_CHECKINS } from '@/lib/mock/nct'
import { MOCK_COMMERCIAL, MOCK_IMPLEMENTATION } from '@/lib/mock/dashboard'

/**
 * Dashboard (Fase 6 — agregador). MODO MOCK: deriva os blocos Financeiro e NCT
 * dos mocks existentes; usa agregados mock para Comercial, Implementações e
 * Manutenção. Quando o backend chegar, cada bloco vira uma query de resumo com
 * degradação independente (error boundary próprio).
 */
export default function DashboardPage() {
  // --- Financeiro: receita, despesa e lucro do mês corrente ---
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // Verifica se uma data ISO (yyyy-MM-dd) cai no mês corrente.
  function isCurrentMonth(dateStr: string | null): boolean {
    if (!dateStr) return false
    const [y, m] = dateStr.split('-').map(Number)
    return y === currentYear && m === currentMonth
  }

  const revenue = MOCK_CHARGES.filter(
    (c) => c.status !== 'cancelado' && isCurrentMonth(c.due_date),
  ).reduce((sum, c) => sum + c.amount, 0)

  const expenses = MOCK_PAYABLES.filter((p) => isCurrentMonth(p.due_date)).reduce(
    (sum, p) => sum + p.amount,
    0,
  )

  const profit = revenue - expenses

  // --- NCT: compromissos das narrativas ativas ---
  const activeNarrativeIds = new Set(
    MOCK_NARRATIVES.filter((n) => n.status === 'ativa').map((n) => n.id),
  )
  const activeCommitments = MOCK_COMMITMENTS.filter((c) => activeNarrativeIds.has(c.narrative_id))
  const atRisk = activeCommitments.filter((c) => c.confidence === 'baixa').length
  const avgProgress = activeCommitments.length
    ? Math.round(
        activeCommitments.reduce((sum, c) => sum + c.progress, 0) / activeCommitments.length,
      )
    : 0

  // Compromissos sem check-in há mais de 14 dias (risco silencioso).
  const STALE_DAYS = 14
  const latestCheckinDaysAgo = new Map<string, number>()
  MOCK_CHECKINS.forEach((ck) => {
    const daysAgo = Math.floor((Date.now() - new Date(ck.created_at).getTime()) / 86_400_000)
    const current = latestCheckinDaysAgo.get(ck.commitment_id)
    if (current === undefined || daysAgo < current) latestCheckinDaysAgo.set(ck.commitment_id, daysAgo)
  })
  const staleCommitmentsCount = activeCommitments.filter((c) => {
    const last = latestCheckinDaysAgo.get(c.id)
    return last === undefined || last > STALE_DAYS
  }).length

  return (
    <DashboardView
      finance={{ revenue, expenses, profit }}
      commercial={MOCK_COMMERCIAL}
      implementation={MOCK_IMPLEMENTATION}
      nct={{ atRisk, avgProgress, activeNarratives: activeNarrativeIds.size, staleCommitmentsCount }}
    />
  )
}
