import { Suspense } from 'react'
import { getMaintenanceBoard } from '@/lib/queries/projects-board'
import { ProjectsView } from '@/components/projects/projects-view'

// Recorte do Operacional: a tela Projetos travada na fase Manutenção.
export default async function ManutencaoPage({
  searchParams,
}: {
  searchParams: Promise<{ arquivados?: string }>
}) {
  const sp = await searchParams
  const archived = sp.arquivados === '1'
  const maintenance = await getMaintenanceBoard(archived)
  return (
    <Suspense>
      <ProjectsView phase="manutencao" maintenance={maintenance} archived={archived} />
    </Suspense>
  )
}
