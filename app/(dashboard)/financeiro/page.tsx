import { FinanceiroView } from '@/components/finance/financeiro-view'
import { getAccounts } from '@/lib/queries/finance'
import { getOrgSettings } from '@/lib/queries/config'

/**
 * Visão geral financeira — Server Component.
 * Carrega cobranças, contas a pagar e as taxas (imposto/maquininha) do Supabase
 * e passa para a view client, que gerencia filtros e gráficos internamente.
 * As taxas alimentam a previsão de lucro líquida (imposto + maquininha estimados).
 */
export default async function FinanceiroPage() {
  const [{ charges, payables }, settings] = await Promise.all([getAccounts(), getOrgSettings()])
  return (
    <FinanceiroView
      allCharges={charges}
      allPayables={payables}
      taxRate={settings.tax_rate}
      cardFeeRate={settings.card_fee_rate}
    />
  )
}
