import { Suspense } from 'react'
import { getContacts } from '@/lib/queries/contacts'
import { getDealsBoard, contactsBoardDeals, type BoardDeal } from '@/lib/queries/deals'
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

  // Paralelo: lista de contatos + board de negócios (usado no kanban quando ativo).
  const [contacts, allDeals] = await Promise.all([
    getContacts(archived),
    archived ? Promise.resolve([] as BoardDeal[]) : getDealsBoard(),
  ])

  // O kanban (negócios ativos) só aparece na visão ativa.
  const deals: KanbanDeal[] = archived
    ? []
    : contactsBoardDeals(allDeals).map((d) => ({
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
