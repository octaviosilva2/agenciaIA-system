import { TasksBoard } from '@/components/tasks/tasks-board'
import { getProfiles } from '@/lib/queries/config'
import { MOCK_TASKS } from '@/lib/mock/tasks'
import { MOCK_COMMITMENTS, MOCK_NARRATIVES } from '@/lib/mock/nct'

/**
 * Board global de Tarefas (Fase 5 — Gestão).
 * Server Component: carrega a equipe real (getProfiles) para o select de
 * responsável. Tarefas/compromissos ainda são mock (religados na Sessão 3).
 */
export default async function TarefasPage() {
  const profiles = await getProfiles()
  return (
    <TasksBoard
      initialTasks={MOCK_TASKS}
      commitments={MOCK_COMMITMENTS}
      narratives={MOCK_NARRATIVES}
      profiles={profiles}
    />
  )
}
