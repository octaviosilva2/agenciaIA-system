import { FinanceiroView } from '@/components/finance/financeiro-view'
import { MOCK_CHARGES, MOCK_PAYABLES } from '@/lib/mock/finance'

/**
 * Visão geral financeira — MOCK.
 * Passa todos os dados para a view client, que gerencia filtros e gráficos internamente.
 * Quando o backend chegar, substitua MOCK_CHARGES/MOCK_PAYABLES por queries reais.
 */
export default function FinanceiroPage() {
  return <FinanceiroView allCharges={MOCK_CHARGES} allPayables={MOCK_PAYABLES} />
}
