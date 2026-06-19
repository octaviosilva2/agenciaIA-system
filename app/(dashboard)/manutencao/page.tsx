import { Suspense } from 'react'
import {
  getMaintenanceBoard,
  getProjectsForContract,
  type MaintenanceView,
} from '@/lib/queries/projects-board'
import { ProjectsView } from '@/components/projects/projects-view'

const MAINTENANCE_VIEWS: MaintenanceView[] = ['ativos', 'inativos', 'arquivados']

// Recorte do Operacional: a tela Projetos travada na fase Manutenção.
export default async function ManutencaoPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string }>
}) {
  const sp = await searchParams
  const view: MaintenanceView = MAINTENANCE_VIEWS.includes(sp.vista as MaintenanceView)
    ? (sp.vista as MaintenanceView)
    : 'ativos'
  const [maintenance, contractProjects] = await Promise.all([
    getMaintenanceBoard(view),
    getProjectsForContract(),
  ])
  return (
    <Suspense>
      <ProjectsView
        phase="manutencao"
        maintenance={maintenance}
        maintenanceView={view}
        contractProjects={contractProjects}
      />
    </Suspense>
  )
}
