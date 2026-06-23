import { DashboardView } from '@/components/dashboard/dashboard-view'
import { getDashboardData } from '@/lib/queries/dashboard'

/**
 * Dashboard (agregador). Server Component: carrega os resumos reais (cada bloco
 * degrada sozinho via try/catch na query) e injeta na view. Layout intocado.
 */
export default async function DashboardPage() {
  const { finance, commercial, implementation, nct, growth } = await getDashboardData()

  return (
    <DashboardView
      finance={finance}
      commercial={commercial}
      implementation={implementation}
      nct={nct}
      growth={growth}
    />
  )
}
