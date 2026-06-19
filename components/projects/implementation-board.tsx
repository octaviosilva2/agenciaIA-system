'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { toast } from 'sonner'
import { EntityBadge } from '@/components/ui/entity-badge'
import { PROJECT_STATUS, deliveryCountdown, formatCurrency, formatDate, isOverdue } from '@/lib/format'
import { updateProjectStatus } from '@/lib/actions/project'
import type { ImplementationItem } from '@/lib/queries/projects-board'
import type { Database } from '@/lib/supabase/types'

type ProjectStatus = Database['public']['Enums']['project_status']

/** Colunas fixas da implementação (macro-status do projeto). */
const COLUMNS: ProjectStatus[] = ['a_iniciar', 'briefing', 'desenvolvimento', 'revisao', 'entregue']

/** Card individual do kanban — arrastável. */
function ProjectCard({ item }: { item: ImplementationItem }) {
  const router = useRouter()
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.projectId })
  const overdue = item.status !== 'entregue' && isOverdue(item.dueDate)

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => router.push(`/implementacao/${item.projectId}`)}
      className={`cursor-pointer rounded-lg border border-border bg-card p-3 text-left shadow-sm transition-colors hover:bg-accent ${isDragging ? 'opacity-40' : ''}`}
    >
      <p className="truncate text-sm font-medium">{item.project}</p>
      <p className="truncate text-xs text-muted-foreground">{item.company}</p>
      <div className="mt-2">
        <span className="font-mono text-xs font-medium tabular-nums">
          {item.value != null ? formatCurrency(item.value) : '—'}
        </span>
      </div>
      {item.dueDate && (
        <p
          className={`mt-1.5 text-xs ${
            overdue ? 'font-medium text-red-600 dark:text-red-400' : 'text-muted-foreground'
          }`}
        >
          Entrega: {formatDate(item.dueDate)}
          {item.status !== 'entregue' && ` · ${deliveryCountdown(item.dueDate)}`}
        </p>
      )}
    </div>
  )
}

/** Coluna droppable do kanban. */
function Column({ status, items }: { status: ProjectStatus; items: ImplementationItem[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div className="w-60 shrink-0">
      <div className="mb-2 flex items-center justify-between px-1">
        <EntityBadge meta={PROJECT_STATUS[status]} />
        <span className="text-xs tabular-nums text-muted-foreground">{items.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-32 flex-col gap-2 rounded-lg border border-dashed p-2 transition-colors ${
          isOver ? 'border-primary/60 bg-primary/5' : 'border-border'
        }`}
      >
        {items.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-muted-foreground">Vazio</p>
        ) : (
          items.map((i) => <ProjectCard key={i.projectId} item={i} />)
        )}
      </div>
    </div>
  )
}

/**
 * Kanban da fase Implementação com drag-and-drop bidirecional.
 * Arrastar aqui atualiza projects.status e sincroniza com o stepper do detalhe.
 */
export function ImplementationBoard({ items: initialItems }: { items: ImplementationItem[] }) {
  const router = useRouter()
  const [items, setItems] = useState<ImplementationItem[]>(initialItems)
  const [activeItem, setActiveItem] = useState<ImplementationItem | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  function handleDragStart(event: DragStartEvent) {
    const found = items.find((i) => i.projectId === event.active.id)
    setActiveItem(found ?? null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveItem(null)

    if (!over) return
    const projectId = String(active.id)
    const newStatus = String(over.id) as ProjectStatus
    const item = items.find((i) => i.projectId === projectId)
    if (!item || item.status === newStatus) return

    // Atualização otimista — move o card imediatamente na UI.
    setItems((prev) =>
      prev.map((i) => (i.projectId === projectId ? { ...i, status: newStatus } : i)),
    )

    const res = await updateProjectStatus(projectId, item.id, newStatus)
    if (!res.success) {
      toast.error(res.message)
      // Reverte se falhou
      setItems((prev) =>
        prev.map((i) => (i.projectId === projectId ? { ...i, status: item.status } : i)),
      )
    } else {
      router.refresh()
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {COLUMNS.map((status) => (
          <Column
            key={status}
            status={status}
            items={items.filter((i) => i.status === status)}
          />
        ))}
      </div>

      {/* Overlay — card "fantasma" enquanto arrasta */}
      <DragOverlay>
        {activeItem && (
          <div className="w-60 rotate-1 rounded-lg border border-border bg-card p-3 shadow-xl">
            <p className="truncate text-sm font-medium">{activeItem.project}</p>
            <p className="truncate text-xs text-muted-foreground">{activeItem.company}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
