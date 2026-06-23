import { notFound } from 'next/navigation'
import { CommitmentDetailView } from '@/components/nct/commitment-detail-view'
import { getProfiles } from '@/lib/queries/config'
import {
  MOCK_COMMITMENTS,
  MOCK_NARRATIVES,
  MOCK_CHECKINS,
} from '@/lib/mock/nct'
import { tasksByCommitment } from '@/lib/mock/tasks'

/**
 * Página de detalhe do compromisso (Fase 5 — Gestão), modo MOCK.
 * `params` é Promise no Next 16. Resolve o compromisso pelo id; se não existir,
 * notFound(). Os check-ins e tarefas vêm do mock filtrados por commitment_id.
 */
export default async function CommitmentDetailPage({
  params,
}: {
  params: Promise<{ commitmentId: string }>
}) {
  const { commitmentId } = await params

  const commitment = MOCK_COMMITMENTS.find((c) => c.id === commitmentId)
  if (!commitment) notFound()

  const narrative = MOCK_NARRATIVES.find((n) => n.id === commitment.narrative_id)
  const checkins = MOCK_CHECKINS.filter((ck) => ck.commitment_id === commitmentId)
  const tasks = tasksByCommitment(commitmentId)
  const profiles = await getProfiles()

  return (
    <CommitmentDetailView
      commitment={commitment}
      narrative={narrative}
      initialCheckins={checkins}
      initialTasks={tasks}
      profiles={profiles}
    />
  )
}
