import { Suspense } from 'react'
import { getDealsBoard, opportunitiesBoardDeals } from '@/lib/queries/deals'
import { getCompanyOptions } from '@/lib/queries/companies'
import { ProjectsView } from '@/components/projects/projects-view'
import type { OpportunityItem } from '@/components/opportunities/opportunity-card'

// Server Component → todos os deals com projeto (funil comercial completo) → view client.
export default async function ProjetosPage({
  searchParams,
}: {
  searchParams: Promise<{ arquivados?: string }>
}) {
  const sp = await searchParams
  const archived = sp.arquivados === '1'

  const [allDeals, contacts] = await Promise.all([getDealsBoard(), getCompanyOptions()])

  const sale: OpportunityItem[] = opportunitiesBoardDeals(allDeals, archived).map((d) => ({
    id: d.id,
    project: d.projectName ?? d.title,
    company: d.company,
    contactId: d.companyId,
    stage: d.stage,
    value: d.value,
    maintenance: d.maintenance,
  }))

  return (
    <Suspense>
      <ProjectsView phase="venda" sale={sale} contacts={contacts} archived={archived} />
    </Suspense>
  )
}
