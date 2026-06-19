import { TasksBoard } from '@/components/tasks/tasks-board'
import { MOCK_TASKS } from '@/lib/mock/tasks'
import { MOCK_COMMITMENTS, MOCK_NARRATIVES } from '@/lib/mock/nct'

/**
 * Board global de Tarefas (Fase 5 — Gestão).
 * MODO MOCK (UI-first): injeta dados estáticos no board client. Quando o backend
 * entrar, troque os mocks por uma query (tasks + commitments + narratives) e
 * passe as server actions ao board — o layout não muda.
 */
export default function TarefasPage() {
  return (
    <TasksBoard
      initialTasks={MOCK_TASKS}
      commitments={MOCK_COMMITMENTS}
      narratives={MOCK_NARRATIVES}
    />
  )
}
