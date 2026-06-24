import { notFound } from 'next/navigation'
import { ImplementationDetail } from '@/components/projects/implementation-detail'
import { getImplementationDetail } from '@/lib/queries/implementation-detail'

/**
 * Tela operacional do projeto (execução). Tudo real: escopo, status, prazo e
 * tarefas de implementação (tasks com project_id) via getImplementationDetail.
 */
export default async function ImplementacaoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const detail = await getImplementationDetail(id)
  if (!detail) notFound()

  return (
    <ImplementationDetail
      projectId={detail.projectId}
      dealId={detail.dealId}
      initialScopeItems={detail.scopeItems}
      initialStatus={detail.status}
      initialProgress={detail.progress}
      project={detail.projectName}
      company={detail.company}
      companyId={detail.companyId}
      dueDate={detail.dueDate}
      tasks={detail.tasks}
    />
  )
}
