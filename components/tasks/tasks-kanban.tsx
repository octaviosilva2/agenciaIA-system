'use client'

import { useEffect, useState } from 'react'
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
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EntityBadge } from '@/components/ui/entity-badge'
import { TaskDialog, type TaskDraft } from '@/components/tasks/task-dialog'
import {
  TASK_STATUS,
  TASK_PRIORITY,
  deliveryCountdown,
  isOverdue,
} from '@/lib/format'
import type { Database } from '@/lib/supabase/types'

type TaskStatus = Database['public']['Enums']['task_status']

/** Tarefa exibida no kanban (espelho da tabela `tasks`). */
export type TaskItem = {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: Database['public']['Enums']['task_priority']
  dueDate: string | null
}

/**
 * Callbacks de persistência (server actions). Opcionais: sem eles o kanban
 * opera só em memória (modo mock do mini-gate visual). Ao ligar o backend,
 * passamos as actions reais e o layout não muda.
 */
export type TaskHandlers = {
  onCreate?: (draft: TaskDraft) => Promise<{ success: boolean; message: string; id?: string }>
  onUpdate?: (id: string, draft: TaskDraft) => Promise<{ success: boolean; message: string }>
  onMove?: (id: string, status: TaskStatus) => Promise<{ success: boolean; message: string }>
  onDelete?: (id: string) => Promise<{ success: boolean; message: string }>
}

/** Colunas fixas do kanban de tarefas (task_status). */
const COLUMNS: TaskStatus[] = ['analisar', 'todo', 'doing', 'impedimento', 'done']

/** Card de tarefa — conteúdo visual (sem o wrapper arrastável). */
function TaskCardContent({ task }: { task: TaskItem }) {
  const overdue = task.status !== 'done' && isOverdue(task.dueDate)
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-sm transition-transform active:scale-[.98]">
      <p className="text-sm font-medium leading-snug">{task.title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <EntityBadge meta={TASK_PRIORITY[task.priority]} />
        {task.dueDate && (
          <span
            className={cn(
              'text-xs',
              overdue ? 'font-medium text-red-600 dark:text-red-400' : 'text-muted-foreground',
            )}
          >
            {task.status !== 'done' ? deliveryCountdown(task.dueDate) : 'Concluída'}
          </span>
        )}
      </div>
    </div>
  )
}

/** Card arrastável + clicável (abre edição). */
function DraggableTaskCard({
  task,
  onOpen,
}: {
  task: TaskItem
  onOpen: (task: TaskItem) => void
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

/** Coluna (droppable) de um status. */
function Column({
  status,
  tasks,
  onOpen,
  onAdd,
}: {
  status: TaskStatus
  tasks: TaskItem[]
  onOpen: (task: TaskItem) => void
  onAdd: (status: TaskStatus) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <div className="w-60 shrink-0">
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
          tasks.map((t) => <DraggableTaskCard key={t.id} task={t} onOpen={onOpen} />)
        )}
      </div>
    </div>
  )
}

/**
 * Kanban de tarefas por status, com CRUD e drag entre colunas.
 * Reaproveitado na Implementação (por projeto) e na Manutenção (por contrato).
 * O estado é otimista; os callbacks de `handlers` persistem quando presentes.
 */
export function TasksKanban({
  tasks,
  handlers = {},
}: {
  tasks: TaskItem[]
  handlers?: TaskHandlers
}) {
  const [items, setItems] = useState<TaskItem[]>(tasks)
  const [activeId, setActiveId] = useState<string | null>(null)

  // Dialog de criar/editar
  const [editing, setEditing] = useState<TaskItem | null>(null)
  const [creatingStatus, setCreatingStatus] = useState<TaskStatus | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Sincroniza com o servidor após revalidação.
  useEffect(() => setItems(tasks), [tasks])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const activeTask = items.find((t) => t.id === activeId) ?? null

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const task = items.find((t) => t.id === String(active.id))
    if (!task) return
    const target = String(over.id) as TaskStatus
    if (target === task.status) return

    const prev = items
    setItems((p) => p.map((t) => (t.id === task.id ? { ...t, status: target } : t))) // otimista
    if (handlers.onMove) {
      const res = await handlers.onMove(task.id, target)
      if (!res.success) {
        setItems(prev)
        toast.error(res.message)
        return
      }
    }
    toast.success(`${task.title} → ${TASK_STATUS[target].label}`)
  }

  function openCreate(status: TaskStatus) {
    setEditing(null)
    setCreatingStatus(status)
    setDialogOpen(true)
  }

  function openEdit(task: TaskItem) {
    setCreatingStatus(null)
    setEditing(task)
    setDialogOpen(true)
  }

  async function handleSubmit(draft: TaskDraft) {
    if (editing) {
      const prev = items
      setItems((p) => p.map((t) => (t.id === editing.id ? { ...t, ...draft } : t))) // otimista
      setDialogOpen(false)
      if (handlers.onUpdate) {
        const res = await handlers.onUpdate(editing.id, draft)
        if (!res.success) {
          setItems(prev)
          toast.error(res.message)
          return
        }
      }
      toast.success('Tarefa atualizada.')
    } else {
      const tempId = crypto.randomUUID()
      const optimistic: TaskItem = { id: tempId, ...draft }
      setItems((p) => [...p, optimistic]) // otimista
      setDialogOpen(false)
      if (handlers.onCreate) {
        const res = await handlers.onCreate(draft)
        if (!res.success) {
          setItems((p) => p.filter((t) => t.id !== tempId))
          toast.error(res.message)
          return
        }
        if (res.id) setItems((p) => p.map((t) => (t.id === tempId ? { ...t, id: res.id! } : t)))
      }
      toast.success('Tarefa criada.')
    }
  }

  async function handleDelete() {
    if (!editing) return
    const prev = items
    setItems((p) => p.filter((t) => t.id !== editing.id)) // otimista
    setDialogOpen(false)
    if (handlers.onDelete) {
      const res = await handlers.onDelete(editing.id)
      if (!res.success) {
        setItems(prev)
        toast.error(res.message)
        return
      }
    }
    toast.success('Tarefa excluída.')
  }

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {COLUMNS.map((status) => (
            <Column
              key={status}
              status={status}
              tasks={items.filter((t) => t.status === status)}
              onOpen={openEdit}
              onAdd={openCreate}
            />
          ))}
        </div>
        <DragOverlay>{activeTask ? <TaskCardContent task={activeTask} /> : null}</DragOverlay>
      </DndContext>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editing}
        defaultStatus={creatingStatus ?? 'todo'}
        onSubmit={handleSubmit}
        onDelete={editing ? handleDelete : undefined}
      />
    </>
  )
}
