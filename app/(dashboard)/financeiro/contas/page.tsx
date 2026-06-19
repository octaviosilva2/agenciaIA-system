import { redirect } from 'next/navigation'
import { AccountsView } from '@/components/finance/accounts-view'
import { MOCK_CHARGES, MOCK_PAYABLES } from '@/lib/mock/finance'

/**
 * Contas (A Receber + A Pagar) — tela unificada.
 * Aceita `?tab=receber|pagar` para abrir diretamente em uma aba.
 * Abre em "Hoje" por padrão se nenhum período estiver definido.
 */
export default async function ContasPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; periodo?: string }>
}) {
  const sp = await searchParams

  // Redireciona para o filtro "Hoje" quando nenhum período estiver na URL
  if (!sp.periodo) {
    const params = new URLSearchParams()
    params.set('periodo', 'hoje')
    if (sp.tab) params.set('tab', sp.tab)
    redirect(`/financeiro/contas?${params.toString()}`)
  }

  const initialTab =
    sp.tab === 'pagar'
      ? 'pagar'
      : sp.tab === 'receber'
        ? 'receber'
        : sp.tab === 'vencidos'
          ? 'vencidos'
          : 'todos'

  return (
    <AccountsView
      initialCharges={MOCK_CHARGES}
      initialPayables={MOCK_PAYABLES}
      initialTab={initialTab}
    />
  )
}
