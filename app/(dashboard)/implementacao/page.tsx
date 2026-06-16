import { Suspense } from 'react'
import { getImplementationBoard } from '@/lib/queries/projects-board'
import { ProjectsView } from '@/components/projects/projects-view'

// Recorte do Operacional: a tela Projetos travada na fase Implementação.
export default async function ImplementacaoPage() {
  const implementation = await getImplementationBoard()
  return (
    <Suspense>
      <ProjectsView phase="implementacao" implementation={implementation} />
    </Suspense>
  )
}
