'use client'

import { useMemo, useState } from 'react'
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
import { toast } from 'sonner'
import { Plus, Link2, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { EntityBadge } from '@/components/ui/entity-badge'
import { InitialsAvatar } from '@/components/ui-shared/initials-avatar'
import { TaskBoardDialog } from '@/components/tasks/task-board-dialog'
import {
  TASK_STATUS,
  TASK_PRIORITY,
  TASK_AREA_LABELS,
  LEVEL_SCALE_LABELS,
  deliveryCountdown,
  isOverdue,
  findProfile,
} from '@/lib/format'
import type { TeamProfile } from '@/lib/queries/config'
import { PROJECT_LABELS, type ManagedTask } from '@/lib/mock/tasks'
import type { Commitment, Narrative } from '@/lib/mock/nct'
import type { Database } from '@/lib/supabase/types'

type TaskStatus = Database['public']['Enums']['task_status']
type TaskPriority = Database['public']['Enums']['task_priority']
type TaskArea = Database['public']['Enums']['task_area']

/** Colunas fixas do board (mesma ordem do kanban da Implementação). */
const COLUMNS: TaskStatus[] = ['analisar', 'todo', 'doing', 'impedimento', 'done']

// Sentinel "all" = sem filtro naquele eixo.
const ALL = 'all'

const selectCls =
  'h-8 rounded-md border border-border bg-card px-2 text-sm outline-none focus:ring-2 focus:ring-ring'

/** Conteúdo visual do card (sem o wrapper arrastável). */
function TaskCardContent({
  task,
  commitmentTitle,
  profiles,
}: {
  task: ManagedTask
  commitmentTitle: string | undefined
  profiles: TeamProfile[]
}) {
  const overdue = task.status !== 'done' && isOverdue(task.due_date)
  const assignee = findProfile(profiles, task.assignee_id)
  const projectLabel = task.project_id ? PROJECT_LABELS[task.project_id] : undefined

  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-sm transition-transform active:scale-[.98]">
      <p className="text-sm font-medium leading-snug">{task.title}</p>

      {/* Prioridade + responsável + vencimento */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <EntityBadge meta={TASK_PRIORITY[task.priority]} />
        <span className="text-[11px] text-muted-foreground">{TASK_AREA_LABELS[task.area]}</span>
        <span className="ml-auto">
          <InitialsAvatar name={assignee?.name} size="xs" />
        </span>
      </div>

      {/* Impacto × Esforço */}
      {(task.impact || task.effort) && (
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {task.impact && `Impacto ${LEVEL_SCALE_LABELS[task.impact]}`}
          {task.impact && task.effort && ' · '}
          {task.effort && `Esforço ${LEVEL_SCALE_LABELS[task.effort]}`}
        </p>
      )}

      {/* Vínculos (projeto / compromisso) como chips */}
      {(projectLabel || commitmentTitle) && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {projectLabel && (
            <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
              <Briefcase className="h-3 w-3 shrink-0" />
              <span className="truncate">{projectLabel}</span>
            </span>
          )}
          {commitmentTitle && (
            <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
              <Link2 className="h-3 w-3 shrink-0" />
              <span className="truncate">{commitmentTitle}</span>
            </span>
          )}
        </div>
      )}

      {/* Vencimento */}
      {task.due_date && (
        <p
          className={cn(
            'mt-1.5 text-xs',
            overdue ? 'font-medium text-red-600 dark:text-red-400' : 'text-muted-foreground',
          )}
        >
          {task.status !== 'done' ? deliveryCountdown(task.due_date) : 'Concluída'}
        </p>
      )}
    </div>
  )
}

/** Card arrastável + clicável (abre edição). */
function DraggableTaskCard({
  task,
  commitmentTitle,
  profiles,
  onOpen,
}: {
  task: ManagedTask
  commitmentTitle: string | undefined
  profiles: TeamProfile[]
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
      <TaskCardContent task={task} commitmentTitle={commitmentTitle} profiles={profiles} />
    </div>
  )
}

/** Coluna (droppable) de um status. */
function Column({
  status,
  tasks,
  commitmentTitleOf,
  profiles,
  onOpen,
  onAdd,
}: {
  status: TaskStatus
  tasks: ManagedTask[]
  commitmentTitleOf: (id: string | null) => string | undefined
  profiles: TeamProfile[]
  onOpen: (task: ManagedTask) => void
  onAdd: (status: TaskStatus) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <div className="w-64 shrink-0">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <EntityBadge meta={TASK_STATUS[status]} />
          <span className="text-xs tabular-nums text-muted-foreground">{tasks.length}</span>
        </div>
        <button
          type="button"
          onClick={() => onAdd(status)}
          className="grid h-6 w-6 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Nova tarefa nesta coluna"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-32 flex-col gap-2 rounded-lg border border-dashed p-2 transition-colors',
          isOver ? 'border-solid border-ring bg-accent/50' : 'border-border',
        )}
      >
        {tasks.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-muted-foreground">Vazio</p>
        ) : (
          tasks.map((t) => (
            <DraggableTaskCard
              key={t.id}
              task={t}
              commitmentTitle={commitmentTitleOf(t.commitment_id)}
              profiles={profiles}
              onOpen={onOpen}
            />
          ))
        )}
      </div>
    </div>
  )
}

/**
 * Board global de tarefas por status, com drag entre colunas e filtros globais.
 * MOCK: estado inicial vindo do mock, muta só em memória + toast.
 * Quando o backend chegar, troque o estado inicial por query e os handlers por
 * server actions — o layout não muda.
 */
export function TasksBoard({
  initialTasks,
  commitments,
  narratives,
  profiles,
}: {
  initialTasks: ManagedTask[]
  commitments: Commitment[]
  narratives: Narrative[]
  profiles: TeamProfile[]
}) {
  const [tasks, setTasks] = useState<ManagedTask[]>(initialTasks)
  const [activeId, setActiveId] = useState<string | null>(null)

  // Filtros globais (sentinel ALL = sem filtro).
  const [filterProject, setFilterProject] = useState<string>(ALL)
  const [filterCommitment, setFilterCommitment] = useState<string>(ALL)
  const [filterArea, setFilterArea] = useState<string>(ALL)
  const [filterAssignee, setFilterAssignee] = useState<string>(ALL)
  const [filterPriority, setFilterPriority] = useState<string>(ALL)

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ManagedTask | null>(null)
  const [creatingStatus, setCreatingStatus] = useState<TaskStatus>('todo')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  // Mapa de título de compromisso por id (para chips e filtro "por compromisso").
  const commitmentTitleOf = useMemo(() => {
    const map = new Map(commitments.map((c) => [c.id, c.title]))
    return (id: string | null) => (id ? map.get(id) : undefined)
  }, [commitments])

  // Pessoas presentes nas tarefas (para o select de responsável).
  const assigneeOptions = useMemo(() => {
    const ids = new Set(tasks.map((t) => t.assignee_id).filter((x): x is string => !!x))
    return [...ids].map((id) => ({ id, name: findProfile(profiles, id)?.name ?? 'Desconhecido' }))
  }, [tasks, profiles])

  // Lista filtrada (aplica todos os eixos).
  const filtered = useMemo(
    () =>
      tasks.filter((t) => {
        if (filterProject !== ALL && t.project_id !== filterProject) return false
        if (filterCommitment !== ALL && t.commitment_id !== filterCommitment) return false
        if (filterArea !== ALL && t.area !== filterArea) return false
        if (filterAssignee !== ALL && t.assignee_id !== filterAssignee) return false
        if (filterPriority !== ALL && t.priority !== filterPriority) return false
        return true
      }),
    [tasks, filterProject, filterCommitment, filterArea, filterAssignee, filterPriority],
  )

  const activeTask = tasks.find((t) => t.id === activeId) ?? null
  const hasActiveFilter =
    filterProject !== ALL ||
    filterCommitment !== ALL ||
    filterArea !== ALL ||
    filterAssignee !== ALL ||
    filterPriority !== ALL

  function clearFilters() {
    setFilterProject(ALL)
    setFilterCommitment(ALL)
    setFilterArea(ALL)
    setFilterAssignee(ALL)
    setFilterPriority(ALL)
  }

  // --- Drag ---
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
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: target } : t)))
    toast.success(`${task.title} → ${TASK_STATUS[target].label}`)
  }

  // --- CRUD MOCK ---
  function openCreate(status: TaskStatus) {
    setEditing(null)
    setCreatingStatus(status)
    setDialogOpen(true)
  }
  function openEdit(task: ManagedTask) {
    setEditing(task)
    setDialogOpen(true)
  }
  function handleSubmit(task: ManagedTask) {
    setTasks((prev) => {
      const exists = prev.some((t) => t.id === task.id)
      return exists ? prev.map((t) => (t.id === task.id ? task : t)) : [task, ...prev]
    })
    setDialogOpen(false)
    toast.success(editing ? 'Tarefa atualizada.' : 'Tarefa criada.')
  }
  function handleDelete() {
    if (!editing) return
    setTasks((prev) => prev.filter((t) => t.id !== editing.id))
    setDialogOpen(false)
    toast.success('Tarefa excluída.')
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Tarefas</h2>
          <p className="text-sm text-muted-foreground">
            Board global por status. Arraste para mudar de coluna.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => openCreate('todo')}>
          <Plus className="h-4 w-4" />
          Nova tarefa
        </Button>
      </header>

      {/* Filtros globais */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2">
        <select
          aria-label="Filtrar por projeto"
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className={selectCls}
        >
          <option value={ALL}>Todos os projetos</option>
          {Object.entries(PROJECT_LABELS).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>

        <select
          aria-label="Filtrar por compromisso"
          value={filterCommitment}
          onChange={(e) => setFilterCommitment(e.target.value)}
          className={selectCls}
        >
          <option value={ALL}>Todos os compromissos</option>
          {narratives.map((n) => (
            <optgroup key={n.id} label={n.title}>
              {commitments
                .filter((c) => c.narrative_id === n.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>

        <select
          aria-label="Filtrar por área"
          value={filterArea}
          onChange={(e) => setFilterArea(e.target.value)}
          className={selectCls}
        >
          <option value={ALL}>Todas as áreas</option>
          {(Object.keys(TASK_AREA_LABELS) as TaskArea[]).map((a) => (
            <option key={a} value={a}>
              {TASK_AREA_LABELS[a]}
            </option>
          ))}
        </select>

        <select
          aria-label="Filtrar por pessoa"
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          className={selectCls}
        >
          <option value={ALL}>Todas as pessoas</option>
          {assigneeOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Filtrar por prioridade"
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className={selectCls}
        >
          <option value={ALL}>Todas as prioridades</option>
          {(Object.keys(TASK_PRIORITY) as TaskPriority[]).map((p) => (
            <option key={p} value={p}>
              {TASK_PRIORITY[p].label}
            </option>
          ))}
        </select>

        {hasActiveFilter && (
          <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Board */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card px-6 py-12 text-center">
          <p className="text-sm font-medium">Nenhuma tarefa com estes filtros</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ajuste os filtros ou crie uma nova tarefa.
          </p>
          <Button type="button" size="sm" className="mt-4" onClick={() => openCreate('todo')}>
            <Plus className="h-4 w-4" />
            Nova tarefa
          </Button>
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {COLUMNS.map((status) => (
              <Column
                key={status}
                status={status}
                tasks={filtered.filter((t) => t.status === status)}
                commitmentTitleOf={commitmentTitleOf}
                profiles={profiles}
                onOpen={openEdit}
                onAdd={openCreate}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask ? (
              <TaskCardContent
                task={activeTask}
                commitmentTitle={commitmentTitleOf(activeTask.commitment_id)}
                profiles={profiles}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <TaskBoardDialog
        task={editing}
        defaultStatus={creatingStatus}
        commitments={commitments}
        profiles={profiles}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        onDelete={editing ? handleDelete : undefined}
      />
    </div>
  )
}
