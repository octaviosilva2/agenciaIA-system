import { AccountsView } from '@/components/finance/accounts-view'
import { getAccounts } from '@/lib/queries/finance'

/**
 * Contas (A Receber + A Pagar) — Server Component.
 * Aceita `?tab=receber|pagar` para abrir diretamente em uma aba.
 * Abre em "Todos" (todas as abas e todo o período) por padrão.
 */
export default async function ContasPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; periodo?: string }>
}) {
  const sp = await searchParams

  const initialTab = sp.tab === 'pagar' ? 'pagar' : sp.tab === 'receber' ? 'receber' : 'todos'

  const { charges, payables } = await getAccounts()

  return (
    <AccountsView
      initialCharges={charges}
      initialPayables={payables}
      initialTab={initialTab}
    />
  )
}
