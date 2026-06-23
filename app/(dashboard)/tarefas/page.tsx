import { TasksBoard } from '@/components/tasks/tasks-board'
import { getProfiles } from '@/lib/queries/config'
import { getManagedTasks, getProjectLabels } from '@/lib/queries/tasks'
import { getNarrativesWithCommitments } from '@/lib/queries/nct'

/**
 * Board global de Tarefas (Fase 5 — Gestão).
 * Server Component: carrega tarefas reais, rótulos de projeto, narrativas/
 * compromissos (filtro "por compromisso") e a equipe (select de responsável).
 */
export default async function TarefasPage() {
  const [tasks, projectLabels, narrativesWith, profiles] = await Promise.all([
    getManagedTasks(),
    getProjectLabels(),
    getNarrativesWithCommitments(),
    getProfiles(),
  ])

  const narratives = narrativesWith.map(({ commitments: _omit, ...n }) => n)
  const commitments = narrativesWith.flatMap((n) => n.commitments)

  return (
    <TasksBoard
      initialTasks={tasks}
      commitments={commitments}
      narratives={narratives}
      projectLabels={projectLabels}
      profiles={profiles}
    />
  )
}
