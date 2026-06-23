'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Check, X } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { Button } from '@/components/ui/button'
import { EntityBadge } from '@/components/ui/entity-badge'
import { InitialsAvatar } from '@/components/ui-shared/initials-avatar'
import { ProgressBar, ConfidenceDot } from '@/components/nct/nct-bits'
import { CheckinForm } from '@/components/nct/checkin-form'
import { LinkedTaskDialog } from '@/components/nct/linked-task-dialog'
import { TaskBoardDialog } from '@/components/tasks/task-board-dialog'
import {
  COMMITMENT_TYPE,
  TASK_STATUS,
  TASK_PRIORITY,
  CONFIDENCE_LABELS,
  formatDateTime,
  deliveryCountdown,
  isOverdue,
  findProfile,
} from '@/lib/format'
import { createCheckin, updateCommitment } from '@/lib/actions/nct'
import {
  createManagedTask,
  updateManagedTask,
  moveManagedTask,
  deleteManagedTask,
} from '@/lib/actions/tasks-board'
import type { TeamProfile } from '@/lib/queries/config'
import type { Commitment, Narrative, Checkin } from '@/lib/queries/nct'
import type { ManagedTask } from '@/lib/queries/tasks'
import type { Database } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

type TaskStatus = Database['public']['Enums']['task_status']

/**
 * Tela de detalhe de um compromisso (/nct/[id]).
 * MOCK: estado inicial vindo do mock, muta só em memória + toast.
 * Registrar check-in adiciona ao histórico (topo) e espelha % e confiança no header.
 */
export function CommitmentDetailView({
  commitment: initialCommitment,
  narrative,
  initialCheckins,
  initialTasks,
  projectLabels,
  profiles,
}: {
  commitment: Commitment
  narrative: Narrative | undefined
  initialCheckins: Checkin[]
  initialTasks: ManagedTask[]
  projectLabels: Record<string, string>
  profiles: TeamProfile[]
}) {
  const [commitment, setCommitment] = useState<Commitment>(initialCommitment)
  const [checkins, setCheckins] = useState<Checkin[]>(initialCheckins)
  const [tasks, setTasks] = useState<ManagedTask[]>(initialTasks)
  const [, startTransition] = useTransition()

  // Resync com o servidor após revalidação.
  useEffect(() => setCommitment(initialCommitment), [initialCommitment])
  useEffect(() => setCheckins(initialCheckins), [initialCheckins])
  useEffect(() => setTasks(initialTasks), [initialTasks])

  // Edição inline do progresso no header.
  const [editingProgress, setEditingProgress] = useState(false)
  const [progressDraft, setProgressDraft] = useState(initialCommitment.progress)

  // Dialog de criar tarefa vinculada.
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)

  // Dialog de editar/excluir tarefa existente.
  const [editTaskOpen, setEditTaskOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<ManagedTask | null>(null)

  const dri = findProfile(profiles, commitment.dri_id)

  // Histórico em ordem cronológica reversa (mais recente no topo).
  const orderedCheckins = useMemo(
    () =>
      [...checkins].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [checkins],
  )

  // --- Mutações MOCK ---
  function registerCheckin(checkin: Checkin) {
    const input = {
      commitment_id: checkin.commitment_id,
      progress: checkin.progress,
      confidence: checkin.confidence,
      comment: checkin.comment,
    }
    startTransition(async () => {
      const res = await createCheckin(input)
      if (!res.success || !res.checkin) return void toast.error(res.message)
      const created = res.checkin
      // O check-in recém-criado (id/autor reais) vai para o topo do histórico.
      setCheckins((prev) => [created, ...prev])
      // Espelha % e confiança no header (o check-in é a fonte de verdade do estado atual).
      setCommitment((prev) => ({
        ...prev,
        progress: created.progress,
        confidence: created.confidence,
      }))
      setProgressDraft(created.progress)
      toast.success('Check-in registrado.')
    })
  }

  function saveInlineProgress() {
    const v = Math.max(0, Math.min(100, progressDraft))
    const input = {
      narrative_id: commitment.narrative_id,
      title: commitment.title,
      description: commitment.description,
      type: commitment.type,
      status: commitment.status,
      progress: v,
      confidence: commitment.confidence,
      dri_id: commitment.dri_id,
      metric_target: commitment.metric_target,
    }
    startTransition(async () => {
      const res = await updateCommitment(commitment.id, input)
      if (!res.success) return void toast.error(res.message)
      setCommitment((prev) => ({ ...prev, progress: v }))
      setEditingProgress(false)
      toast.success('Progresso atualizado.')
    })
  }

  function addLinkedTask(task: ManagedTask) {
    const { id: _omit, ...input } = task
    startTransition(async () => {
      const res = await createManagedTask(input)
      if (!res.success || !res.task) return void toast.error(res.message)
      setTasks((prev) => [res.task!, ...prev])
      setTaskDialogOpen(false)
      toast.success('Tarefa criada e vinculada.')
    })
  }

  function handleTaskMove(taskId: string, newStatus: TaskStatus) {
    const prev = tasks
    setTasks((p) => p.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))) // otimista
    startTransition(async () => {
      const res = await moveManagedTask(taskId, newStatus, commitment.id)
      if (!res.success) {
        setTasks(prev)
        return void toast.error(res.message)
      }
      toast.success(`Tarefa movida para ${TASK_STATUS[newStatus].label}.`)
    })
  }

  function openEditTask(task: ManagedTask) {
    setEditingTask(task)
    setEditTaskOpen(true)
  }

  function handleEditTask(task: ManagedTask) {
    const { id: _omit, ...input } = task
    startTransition(async () => {
      const res = await updateManagedTask(task.id, input)
      if (!res.success) return void toast.error(res.message)
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)))
      setEditTaskOpen(false)
      toast.success('Tarefa atualizada.')
    })
  }

  function handleDeleteTask() {
    if (!editingTask) return
    const target = editingTask
    startTransition(async () => {
      const res = await deleteManagedTask(target.id, commitment.id)
      if (!res.success) return void toast.error(res.message)
      setTasks((prev) => prev.filter((t) => t.id !== target.id))
      setEditTaskOpen(false)
      toast.success('Tarefa excluída.')
    })
  }

  return (
    <div className="space-y-4">
      {/* Voltar */}
      <Link
        href="/nct"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao NCT
      </Link>

      {/* Header do compromisso */}
      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <EntityBadge meta={COMMITMENT_TYPE[commitment.type]} />
              {narrative && (
                <Link
                  href="/nct"
                  className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  {narrative.title}
                </Link>
              )}
            </div>
            <h2 className="mt-1.5 text-lg font-semibold tracking-tight">{commitment.title}</h2>
            {commitment.description && (
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{commitment.description}</p>
            )}
            {commitment.metric_target && (
              <p className="mt-1 text-xs text-muted-foreground">
                Meta: <span className="font-medium text-foreground">{commitment.metric_target}</span>
              </p>
            )}
          </div>

          {/* DRI + confiança */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <ConfidenceDot confidence={commitment.confidence} />
              <span className="text-xs text-muted-foreground">
                {CONFIDENCE_LABELS[commitment.confidence]}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <InitialsAvatar name={dri?.name} size="sm" />
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {dri?.name ?? 'Sem DRI'}
              </span>
            </div>
          </div>
        </div>

        {/* Progresso editável inline */}
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Progresso
            </span>
            {!editingProgress ? (
              <button
                type="button"
                onClick={() => {
                  setProgressDraft(commitment.progress)
                  setEditingProgress(true)
                }}
                className="cursor-pointer font-mono text-sm font-semibold tabular-nums underline-offset-2 hover:underline"
                aria-label="Editar progresso"
              >
                {commitment.progress}%
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={progressDraft}
                  onChange={(e) =>
                    setProgressDraft(Math.max(0, Math.min(100, Number(e.target.value) || 0)))
                  }
                  className="h-7 w-16 rounded-md border border-border bg-card px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                  aria-label="Novo progresso"
                />
                <Button type="button" size="icon-sm" onClick={saveInlineProgress} aria-label="Salvar progresso">
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  onClick={() => setEditingProgress(false)}
                  aria-label="Cancelar"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
          <ProgressBar value={commitment.progress} className="h-2" />
        </div>
      </section>

      {/* Linha 2: check-ins (esquerda) + kanban de tarefas (direita) */}
      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        {/* Check-ins: form + histórico */}
        <section className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-base font-semibold">Check-ins</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Registre o progresso e a confiança. O mais recente vira o estado atual.
          </p>

          <div className="mt-3 rounded-md border border-border bg-muted/30 p-3">
            <CheckinForm
              commitmentId={commitment.id}
              defaultProgress={commitment.progress}
              defaultConfidence={commitment.confidence}
              onRegister={registerCheckin}
            />
          </div>

          {/* Histórico cronológico reverso */}
          <div className="mt-4">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Histórico
            </p>
            {orderedCheckins.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum check-in ainda. Registre o primeiro acima.
              </p>
            ) : (
              <ul className="space-y-2">
                {orderedCheckins.map((ck) => {
                  const author = findProfile(profiles, ck.author_id)
                  return (
                    <li key={ck.id} className="rounded-md border border-border p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold tabular-nums">
                          {ck.progress}%
                        </span>
                        <ConfidenceDot confidence={ck.confidence} />
                        <span className="text-xs text-muted-foreground">
                          {CONFIDENCE_LABELS[ck.confidence]}
                        </span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {formatDateTime(ck.created_at)}
                        </span>
                      </div>
                      {ck.comment && <p className="mt-1.5 text-sm">{ck.comment}</p>}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {author?.name ?? 'Autor desconhecido'}
                      </p>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Tarefas vinculadas — kanban por status */}
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold">Tarefas vinculadas</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                As mesmas tarefas do board, filtradas por este compromisso.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setTaskDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Criar tarefa
            </Button>
          </div>

          <TaskKanban
            tasks={tasks}
            onMove={handleTaskMove}
            onOpen={openEditTask}
            onCreateTask={() => setTaskDialogOpen(true)}
          />
        </section>
      </div>

      <LinkedTaskDialog
        commitmentId={commitment.id}
        profiles={profiles}
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        onCreate={addLinkedTask}
      />

      <TaskBoardDialog
        task={editingTask}
        defaultStatus={editingTask?.status ?? 'todo'}
        commitments={[commitment]}
        projectLabels={projectLabels}
        profiles={profiles}
        open={editTaskOpen}
        onOpenChange={setEditTaskOpen}
        onSubmit={handleEditTask}
        onDelete={handleDeleteTask}
      />
    </div>
  )
}

/** Colunas fixas do kanban (mesma ordem do board global de tarefas). */
const KANBAN_COLUMNS: TaskStatus[] = ['analisar', 'todo', 'doing', 'impedimento', 'done']

/**
 * Kanban de tarefas vinculadas ao compromisso, com drag entre colunas.
 * Segue o mesmo padrão de DnD do TasksBoard (PointerSensor + DragOverlay).
 */
function TaskKanban({
  tasks,
  onMove,
  onOpen,
  onCreateTask,
}: {
  tasks: ManagedTask[]
  onMove: (taskId: string, newStatus: TaskStatus) => void
  onOpen: (task: ManagedTask) => void
  onCreateTask: () => void
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const activeTask = tasks.find((t) => t.id === activeId) ?? null

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const task = tasks.find((t) => t.id === String(active.id))
    if (!task) return
    const target = String(over.id) as TaskStatus
    if (target === task.status) return
    onMove(task.id, target)
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border px-4 py-10 text-center">
        <p className="text-sm text-muted-foreground">Nenhuma tarefa vinculada.</p>
        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={onCreateTask}>
          <Plus className="h-3.5 w-3.5" />
          Criar a primeira
        </Button>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {/* overflow-x-auto: 5 colunas não quebram em telas estreitas */}
      <div className="overflow-x-auto">
        <div className="flex min-w-[600px] gap-3 pb-1">
          {KANBAN_COLUMNS.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={tasks.filter((t) => t.status === status)}
              onOpen={onOpen}
            />
          ))}
        </div>
      </div>
      <DragOverlay>
        {activeTask ? <TaskCardContent task={activeTask} onClick={undefined} /> : null}
      </DragOverlay>
    </DndContext>
  )
}

/** Coluna droppable de um status. */
function KanbanColumn({
  status,
  tasks,
  onOpen,
}: {
  status: TaskStatus
  tasks: ManagedTask[]
  onOpen: (task: ManagedTask) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <div className="flex min-w-[160px] flex-1 flex-col gap-2">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <EntityBadge meta={TASK_STATUS[status]} />
        <span className="font-mono text-xs tabular-nums text-muted-foreground">{tasks.length}</span>
      </div>

      {/* Área droppable */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-[80px] flex-col gap-2 rounded-lg border border-dashed p-2 transition-colors',
          isOver ? 'border-solid border-ring bg-accent/50' : 'border-border',
        )}
      >
        {tasks.length === 0 ? (
          <p className="py-4 text-center text-[11px] text-muted-foreground">Vazio</p>
        ) : (
          tasks.map((t) => <DraggableTaskCard key={t.id} task={t} onOpen={onOpen} />)
        )}
      </div>
    </div>
  )
}

/** Card arrastável e clicável (clique abre edição, drag move de coluna). */
function DraggableTaskCard({
  task,
  onOpen,
}: {
  task: ManagedTask
  onOpen: (task: ManagedTask) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id })
  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
      className={cn('cursor-pointer', isDragging && 'opacity-40')}
      onClick={() => onOpen(task)}
      {...attributes}
      {...listeners}
    >
      <TaskCardContent task={task} />
    </div>
  )
}

/** Conteúdo visual do card (usado no arrastável e no DragOverlay). */
function TaskCardContent({ task, onClick }: { task: ManagedTask; onClick?: undefined }) {
  const overdue = task.status !== 'done' && isOverdue(task.due_date)
  return (
    <div className="rounded-md border border-border bg-card p-2.5 shadow-sm transition-colors hover:bg-accent/40">
      <p className="text-[13px] font-medium leading-snug">{task.title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <EntityBadge meta={TASK_PRIORITY[task.priority]} />
        {task.due_date && (
          <span
            className={cn(
              'text-[11px]',
              overdue ? 'font-medium text-red-600 dark:text-red-400' : 'text-muted-foreground',
            )}
          >
            {task.status !== 'done' ? deliveryCountdown(task.due_date) : 'Concluída'}
          </span>
        )}
      </div>
    </div>
  )
}
