import { Suspense } from 'react'
import { getContacts } from '@/lib/queries/contacts'
import { getDealsBoard, contactsBoardDeals } from '@/lib/queries/deals'
import { ContactsView } from '@/components/contacts/contacts-view'
import type { KanbanDeal } from '@/components/contacts/deal-card'

// Server Component → queries → componente client (padrão 04-arquitetura).
export default async function ContatosPage() {
  const [contacts, allDeals] = await Promise.all([getContacts(), getDealsBoard()])

  const deals: KanbanDeal[] = contactsBoardDeals(allDeals).map((d) => ({
    id: d.id,
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
      <ContactsView contacts={contacts} deals={deals} />
    </Suspense>
  )
}
