import { AccountsView } from '@/components/finance/accounts-view'
import { getAccounts } from '@/lib/queries/finance'

/**
 * Contas — Server Component. Abas: A Receber · A Pagar (pendentes) · Receita ·
 * Despesa (pagos). Aceita `?tab=receber|pagar|receita|despesa` para abrir direto
 * numa aba; default = A Receber.
 */
export default async function ContasPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; periodo?: string }>
}) {
  const sp = await searchParams

  const TABS = ['receber', 'pagar', 'receita', 'despesa'] as const
  const initialTab = (TABS as readonly string[]).includes(sp.tab ?? '')
    ? (sp.tab as (typeof TABS)[number])
    : 'receber'

  const { charges, payables } = await getAccounts()

  return (
    <AccountsView
      initialCharges={charges}
      initialPayables={payables}
      initialTab={initialTab}
    />
  )
}
