import { notFound } from 'next/navigation'
import { CommitmentDetailView } from '@/components/nct/commitment-detail-view'
import { getProfiles } from '@/lib/queries/config'
import { getCommitmentDetail } from '@/lib/queries/nct'
import { getManagedTasks } from '@/lib/queries/tasks'

/**
 * Página de detalhe do compromisso (Fase 5 — Gestão).
 * `params` é Promise no Next 16. Carrega o compromisso + narrativa + check-ins
 * (getCommitmentDetail), as tarefas vinculadas (getManagedTasks por compromisso)
 * e a equipe. Compromisso inexistente → notFound().
 */
export default async function CommitmentDetailPage({
  params,
}: {
  params: Promise<{ commitmentId: string }>
}) {
  const { commitmentId } = await params

  const detail = await getCommitmentDetail(commitmentId)
  if (!detail) notFound()

  const [tasks, profiles] = await Promise.all([
    getManagedTasks({ commitmentId }),
    getProfiles(),
  ])

  return (
    <CommitmentDetailView
      commitment={detail.commitment}
      narrative={detail.narrative ?? undefined}
      initialCheckins={detail.checkins}
      initialTasks={tasks}
      profiles={profiles}
    />
  )
}
