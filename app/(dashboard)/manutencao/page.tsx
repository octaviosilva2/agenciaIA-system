import { Suspense } from 'react'
import { getMaintenanceBoard } from '@/lib/queries/projects-board'
import { ProjectsView } from '@/components/projects/projects-view'

// Recorte do Operacional: a tela Projetos travada na fase Manutenção.
export default async function ManutencaoPage() {
  const maintenance = await getMaintenanceBoard()
  return (
    <Suspense>
      <ProjectsView phase="manutencao" maintenance={maintenance} />
    </Suspense>
  )
}
