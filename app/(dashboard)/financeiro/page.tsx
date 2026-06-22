import { FinanceiroView } from '@/components/finance/financeiro-view'
import { getAccounts } from '@/lib/queries/finance'

/**
 * Visão geral financeira — Server Component.
 * Carrega cobranças e contas a pagar do Supabase e passa para a view client,
 * que gerencia filtros e gráficos internamente.
 */
export default async function FinanceiroPage() {
  const { charges, payables } = await getAccounts()
  return <FinanceiroView allCharges={charges} allPayables={payables} />
}
