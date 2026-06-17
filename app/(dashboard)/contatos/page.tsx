import { Suspense } from 'react'
import { getContacts } from '@/lib/queries/contacts'
import { getDealsBoard, contactsBoardDeals } from '@/lib/queries/deals'
import { ContactsView } from '@/components/contacts/contacts-view'
import type { KanbanDeal } from '@/components/contacts/deal-card'

// Server Component → queries → componente client (padrão 04-arquitetura).
export default async function ContatosPage({
  searchParams,
}: {
  searchParams: Promise<{ arquivados?: string }>
}) {
  const sp = await searchParams
  const archived = sp.arquivados === '1'

  const contacts = await getContacts(archived)

  // O kanban (negócios ativos) só aparece na visão ativa.
  const deals: KanbanDeal[] = archived
    ? []
    : contactsBoardDeals(await getDealsBoard()).map((d) => ({
        id: d.id,
        companyId: d.companyId,
        company: d.company,
        title: d.title,
        stage: d.stage,
        estimatedValue: d.estimatedValue,
        nextAction: d.nextAction,
        hasProject: d.hasProject,
        maintenance: d.maintenance,
      }))

  return (
    <Suspense>
      <ContactsView contacts={contacts} deals={deals} archived={archived} />
    </Suspense>
  )
}
